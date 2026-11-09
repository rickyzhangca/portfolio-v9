"""
Runs `tools/render-steam.py` on Modal, so the bake does not hold a laptop's
every core for half an hour: Mantaflow simulates on one many-core CPU, the
frames render on several GPUs at once, and the pack comes back here.

  pip install modal && modal setup
  modal run tools/modal-steam.py --model <unzipped model dir> [--preview] [--render-only] [--out <dir>]

The model directory (`scene.gltf`, `scene.bin`, `textures/`) is uploaded
to the `steam` volume once. The bake and the frames stay there between
runs, so `--render-only` re-renders lighting, material or camera changes
without simulating again. The sheet is written to
`src/assets/timecar/steam.webp` (a preview's to `<out>/steam.webp`), and the
frames to `<out>` for contact sheets.
"""

import os
import pathlib
import subprocess

import modal

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLENDER = "blender-5.2.3-linux-x64"
# Frames each GPU renders; 60 frames make six containers.
FRAMES_PER_GPU = 10
# Whichever of these is free first: L4s alone sometimes queued for minutes.
GPUS = ["L4", "A10G", "L40S", "T4"]

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install(
        "wget",
        "xz-utils",
        "libxi6",
        "libxxf86vm1",
        "libxfixes3",
        "libxrender1",
        "libgl1",
        "libegl1",
        "libxkbcommon0",
        "libsm6",
        "libice6",
        "webp",
    )
    .run_commands(
        f"wget -q https://download.blender.org/release/Blender5.2/{BLENDER}.tar.xz -O /tmp/blender.tar.xz",
        "tar -xf /tmp/blender.tar.xz -C /opt && rm /tmp/blender.tar.xz",
    )
    .add_local_file(ROOT / "tools" / "render-steam.py", "/work/render-steam.py")
    .add_local_file(ROOT / "tools" / "render-carlight.py", "/work/render-carlight.py")
)
volume = modal.Volume.from_name("steam", create_if_missing=True)
app = modal.App("portfolio-steam", image=image)


# Mantaflow's cache does not survive the volume's network file system, so
# each container bakes or renders on its own disk, in this folder, and
# copies to and from `/vol/<run>`.
LOCAL = "/tmp/run"


def blender(folder: str, *flags: str):
    command = [
        f"/opt/{BLENDER}/blender",
        "--background",
        "--factory-startup",
        "--python",
        "/work/render-steam.py",
        "--",
        folder,
        "--model",
        "/vol/model/scene.gltf",
        *flags,
    ]
    print(" ".join(command), flush=True)
    subprocess.run(command, check=True)


@app.function(cpu=32, memory=65536, timeout=3 * 3600, volumes={"/vol": volume})
def bake(run: str, preview: bool):
    import shutil

    blender(LOCAL, "--bake", *(["--preview"] if preview else []))
    files = sum(len(names) for _, _, names in os.walk(f"{LOCAL}/cache"))
    if files == 0:
        raise RuntimeError("the bake wrote no cache")
    # A fresh run: an earlier bake's cache or frames would mix into this one.
    shutil.rmtree(f"/vol/{run}", ignore_errors=True)
    shutil.copytree(LOCAL, f"/vol/{run}")
    print("cached", files, "files", flush=True)
    volume.commit()


@app.function(gpu=GPUS, memory=16384, timeout=2 * 3600, volumes={"/vol": volume})
def render(run: str, preview: bool, frames: tuple[int, int], light: str = "", into: str = ""):
    import shutil

    volume.reload()
    pathlib.Path(LOCAL).mkdir(parents=True, exist_ok=True)
    shutil.copy(f"/vol/{run}/scene.blend", LOCAL)
    shutil.copytree(f"/vol/{run}/cache", f"{LOCAL}/cache", dirs_exist_ok=True)
    first, last = frames
    blender(
        LOCAL,
        "--render",
        "--frames",
        str(first),
        str(last),
        *(["--preview"] if preview else []),
        *light.split(),
    )
    target = pathlib.Path(f"/vol/{run}") / into
    target.mkdir(parents=True, exist_ok=True)
    for frame in pathlib.Path(LOCAL).glob("frame-*.png"):
        shutil.copy(frame, target / frame.name)
    volume.commit()


@app.function(timeout=600, volumes={"/vol": volume})
def collect(run: str, into: str) -> dict[str, bytes]:
    volume.reload()
    return {path.name: path.read_bytes() for path in (pathlib.Path(f"/vol/{run}") / into).glob("frame-*.png")}


@app.function(cpu=4, memory=8192, timeout=1800, volumes={"/vol": volume})
def pack(run: str, preview: bool) -> dict[str, bytes]:
    volume.reload()
    folder = pathlib.Path(f"/vol/{run}")
    sheet = folder / "steam.webp"
    blender(str(folder), "--pack", "--sheet", str(sheet), *(["--preview"] if preview else []))
    files = {path.name: path.read_bytes() for path in folder.glob("frame-*.png")}
    files["steam.webp"] = sheet.read_bytes()
    return files


@app.local_entrypoint()
def main(
    model: str,
    preview: bool = False,
    render_only: bool = False,
    out: str = "steam-frames",
    light: str = "",
    probe: str = "",
):
    """`--light "--sun 3 --sky 0.5"` overrides the light on a render; `--probe
    30` (or `--probe "30;--sun 4|30;--sun 2"`, one container a variant)
    renders single frames of the saved bake into the out dir and nothing else."""
    run = "preview" if preview else "final"
    model_dir = pathlib.Path(model).expanduser().resolve()
    if model_dir.is_file():
        model_dir = model_dir.parent
    try:
        volume.listdir("/model/scene.gltf")
    except (FileNotFoundError, modal.exception.NotFoundError):
        with volume.batch_upload() as upload:
            upload.put_directory(str(model_dir), "/model")
        print("uploaded", model_dir)
    if probe:
        variants = []
        for index, variant in enumerate(probe.split("|")):
            frame, _, flags = variant.partition(";")
            variants.append((int(frame), (flags or light).strip(), f"probe-{index}"))
        list(render.starmap([(run, preview, (f, f), flags, into) for f, flags, into in variants]))
        for frame, flags, into in variants:
            folder = pathlib.Path(out).resolve() / into
            folder.mkdir(parents=True, exist_ok=True)
            for name, data in collect.remote(run, into).items():
                (folder / name).write_bytes(data)
            print("probe", into, frame, flags, flush=True)
        return
    if not render_only:
        bake.remote(run, preview)
    total = 24 if preview else 60
    ranges = [
        (first, min(total, first + FRAMES_PER_GPU - 1))
        for first in range(1, total + 1, FRAMES_PER_GPU)
    ]
    list(render.starmap([(run, preview, frames, light) for frames in ranges]))
    files = pack.remote(run, preview)
    folder = pathlib.Path(out).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (folder / name).write_bytes(data)
    if not preview:
        (ROOT / "src" / "assets" / "timecar" / "steam.webp").write_bytes(files["steam.webp"])
    print("wrote", folder, len(files), "files")


@app.function(gpu=GPUS, memory=16384, timeout=3600, volumes={"/vol": volume})
def bake_car_light(preview: bool) -> dict[str, bytes]:
    """`tools/render-carlight.py`: the charge's light on the car's body."""
    folder = pathlib.Path("/tmp/carlight")
    command = [
        f"/opt/{BLENDER}/blender",
        "--background",
        "--factory-startup",
        "--python",
        "/work/render-carlight.py",
        "--",
        str(folder),
        "--model",
        "/vol/model/scene.gltf",
        *(["--preview"] if preview else []),
    ]
    subprocess.run(command, check=True)
    return {path.name: path.read_bytes() for path in folder.iterdir() if path.suffix in (".png", ".webp")}


@app.local_entrypoint()
def carlight(preview: bool = False, out: str = "car-light"):
    """modal run tools/modal-steam.py::carlight [--preview] [--out <dir>]:
    bakes the car's light maps on one GPU (the model must already be on the
    volume) and writes `src/assets/timecar/car-light.webp`."""
    files = bake_car_light.remote(preview)
    folder = pathlib.Path(out).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    for name, data in files.items():
        (folder / name).write_bytes(data)
    if not preview:
        (ROOT / "src" / "assets" / "timecar" / "car-light.webp").write_bytes(files["car-light.webp"])
    print("wrote", folder, len(files), "files")

"""
Simulates and renders the steam the toy time machine pours as it lands,
after the film: a heavy burst from its rear vents and cold vapour falling
off the iced body and rolling over the desk. Mantaflow smoke, rendered by
Cycles from the photo's camera (orthographic, tilted 26 degrees towards
the screen's bottom) into transparent frames that it packs into an atlas.

  blender --background --factory-startup --python tools/render-steam.py -- <out dir> --model <scene.gltf> [--preview] [--bake | --render [--frames <first> <last>] | --pack] [--sheet <path>] [--sun <energy>] [--sky <strength>] [--exposure <stops>]

A full bake takes about half an hour of a laptop's every core, so
`tools/modal-steam.py` runs it on Modal instead: the bake on a many-core
CPU, the frames on GPUs in parallel. Without a step flag it bakes, renders
and packs; `--bake` only simulates into `<out dir>/cache`; `--render`
renders from that cache (`--frames` a range of them); `--pack` packs the
rendered frames, `COLS` by `ROWS`, into `--sheet` (by default
`src/assets/timecar/steam.webp`, with cwebp); `--preview` is a quick,
coarse run. The layout must match `STEAM_SHEET` in `src/lib/flux-charge.ts`.

The steam is relightable: each frame is rendered three times, under the
room's sky and one of three suns (`LIGHTS`, 120 degrees apart round the
desk), and the pack stores the three as the sheet's red, green and blue,
with the steam's coverage as its alpha. The trip shader blends them for
the light it is under (the room's daylight from the top left, or the desk
lamp wherever the pointer holds it) and draws the steam's shadow on the
desk itself, from its coverage, so there is no shadow catcher.

`--model` is the unzipped Sketchfab glTF that `tools/render-timecar.ts`
renders the photo from (Ddiaz Design's DeLorean time machine). The car is
that model at its real 4.216 m, placed as the photo shows it, so steam
behind it is hidden by it (a holdout that casts no shadow: the page draws
the car's own), steam over its edges still shows, and the vapour pours
off its own body. Its voxel remesh is the obstacle the steam flows round.

World units are metres; `PX_PER_M` maps them to the desk's CSS px: the
model's projected length against the car's width inside its photo (241.7
of 248 css px), which its projected height (111.7 css px) agrees with.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "steam-frames")
PREVIEW = "--preview" in argv
PACK_ONLY = "--pack" in argv
BAKE_ONLY = "--bake" in argv
# Renders from a bake already in `<out dir>/cache`.
RENDER_ONLY = "--render" in argv
MODEL = argv[argv.index("--model") + 1] if "--model" in argv else None
COLS = 10
ROWS = 6
SHEET = (
    argv[argv.index("--sheet") + 1]
    if "--sheet" in argv
    else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "src", "assets", "timecar", "steam.webp"
    )
)

TILT = math.radians(26)
PX_PER_M = 57.3
# The frame, in CSS px from the middle of the car's photo (x right, y down).
REGION = {"left": -170, "right": 640, "top": -330, "bottom": 170}
# Image px per CSS px: steam is soft, and the shader draws at 0.75.
DENSITY = 0.3
# CSS px over which the steam fades out at the frame's edges.
FEATHER_PX = 60
# The shader crossfades neighbouring frames, so 10 a second plays smoothly.
FPS = 10
FRAMES = 24 if PREVIEW else 60
def number(flag, default):
    return float(argv[argv.index(flag) + 1]) if flag in argv else default


# The light, applied again on `--render` (the saved scene keeps the bake, not
# these): a sun strong against a dim sky, so each pass has a lit side and a
# shaded one to blend between; a bright sky lit the cloud from everywhere and
# the three passes came out the same flat white.
SUN_ENERGY = number("--sun", 3.0)
SKY_STRENGTH = number("--sky", 0.55)
EXPOSURE = number("--exposure", 0.0)

FIRST, LAST = (
    (int(argv[argv.index("--frames") + 1]), int(argv[argv.index("--frames") + 2]))
    if "--frames" in argv
    else (1, FRAMES)
)
# The three suns' azimuths, degrees anticlockwise from the screen's right
# (90 is up the screen), and their height: `STEAM_SHEET.lights` matches.
# The first is the room's daylight, from the top left.
LIGHTS = (135, 255, 15)
LIGHT_ELEVATION = 35
PASSES = "abc"
# The DeLorean, metres, nose towards -x, the screen's left.
CAR_LENGTH = 4.216
# The height whose point over the car's middle projects to its photo's
# middle (the projected body spans -0.736 to 1.204 m up the screen).
CAR_MIDDLE_HEIGHT = 0.534
# The two reactor vents on the rear deck, whose grilles face backwards.
VENTS = [(2.08, 0.34, 1.0), (2.08, -0.34, 1.0)]
VENT_STOP = 3.0 if not PREVIEW else 1.6  # seconds the vents pour
FOG_STOP = 4.0 if not PREVIEW else 2.0



def pack():
    """Lays the frames out in one sheet, top row first, and encodes it: the
    three lighting passes' brightness in red, green and blue, and the
    steam's coverage in alpha."""
    import subprocess

    import numpy

    def load(name):
        image = bpy.data.images.load(os.path.join(OUT, name))
        width, height = image.size
        pixels = numpy.array(image.pixels[:], dtype=numpy.float32)
        bpy.data.images.remove(image)
        # Blender's rows run bottom-up.
        return pixels.reshape(height, width, 4)[::-1]

    first = load(f"frame-a-{1:04d}.png")
    height, width = first.shape[:2]
    sheet = numpy.zeros((ROWS * height, COLS * width, 4), dtype=numpy.float32)
    reach = FEATHER_PX * DENSITY

    def ramp(distance):
        share = numpy.clip(distance / reach, 0, 1)
        return share * share * (3 - 2 * share)

    rows = numpy.arange(height, dtype=numpy.float32) + 0.5
    cols = numpy.arange(width, dtype=numpy.float32) + 0.5
    feather = numpy.outer(
        ramp(rows) * ramp(height - rows), ramp(cols) * ramp(width - cols)
    )
    luma = numpy.array([0.2126, 0.7152, 0.0722], dtype=numpy.float32)
    for index in range(min(FRAMES, COLS * ROWS)):
        frame = numpy.zeros((height, width, 4), dtype=numpy.float32)
        for channel, name in enumerate(PASSES):
            pixels = load(f"frame-{name}-{index + 1:04d}.png")
            frame[..., channel] = pixels[..., :3] @ luma
            frame[..., 3] = numpy.maximum(frame[..., 3], pixels[..., 3])
        # Late steam outgrows the frame; feathered, its edge is not a cut.
        frame[..., 3] *= feather
        row, col = divmod(index, COLS)
        sheet[row * height : (row + 1) * height, col * width : (col + 1) * width] = frame
    packed = bpy.data.images.new("Sheet", COLS * width, ROWS * height, alpha=True)
    packed.pixels[:] = sheet[::-1].ravel()
    png = os.path.join(OUT, "sheet.png")
    packed.filepath_raw = png
    packed.file_format = "PNG"
    packed.save()
    # -sharp_yuv keeps the passes apart where chroma subsampling would
    # blur the differences between them.
    subprocess.run(
        ["cwebp", "-quiet", "-q", "85", "-alpha_q", "90", "-m", "6", "-sharp_yuv", png, "-o", SHEET],
        check=True,
    )
    print("PACKED", SHEET, COLS * width, ROWS * height)


def use_gpu(scene):
    """Renders with Cycles on whichever GPU this machine has."""
    scene.render.engine = "CYCLES"
    preferences = bpy.context.preferences.addons["cycles"].preferences
    scene.cycles.device = "CPU"
    for kind in ("OPTIX", "CUDA", "METAL", "HIP", "ONEAPI"):
        try:
            preferences.compute_device_type = kind
        except TypeError:
            continue
        preferences.get_devices()
        if any(device.type == kind for device in preferences.devices):
            for device in preferences.devices:
                device.use = device.type == kind
            scene.cycles.device = "GPU"
            break
    print("DEVICE", scene.cycles.device, preferences.compute_device_type)
    scene.cycles.samples = 24 if PREVIEW else 128
    scene.cycles.use_denoising = True
    # Light scattered many times inside the cloud is what makes steam white
    # and soft rather than grey; two bounces left its core dull.
    scene.cycles.volume_bounces = 2 if PREVIEW else 8
    scene.cycles.volume_step_rate = 1.0 if PREVIEW else 0.5


def light(scene):
    """Sets the suns, the sky and the film from the constants above."""
    for name in PASSES:
        bpy.data.objects[f"Sun-{name}"].data.energy = SUN_ENERGY
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = SKY_STRENGTH
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.exposure = EXPOSURE


def render_passes(scene, suns):
    """Renders FIRST to LAST once under each sun."""
    scene.frame_start = FIRST
    scene.frame_end = LAST
    for name, lit in zip(PASSES, suns):
        for sun in suns:
            sun.hide_render = sun is not lit
        scene.render.filepath = os.path.join(OUT, f"frame-{name}-")
        bpy.ops.render.render(animation=True)
    print("RENDERED", OUT, FIRST, LAST, scene.render.resolution_x, scene.render.resolution_y)


if PACK_ONLY:
    pack()
    sys.exit(0)
if RENDER_ONLY:
    # Only the file the bake saved knows its cache is baked: a domain built
    # afresh, or given its cache directory again, draws nothing.
    bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, "scene.blend"))
    use_gpu(bpy.context.scene)
    light(bpy.context.scene)
    render_passes(bpy.context.scene, [bpy.data.objects[f"Sun-{name}"] for name in PASSES])
    sys.exit(0)
if not MODEL:
    sys.exit("--model <scene.gltf> is required to bake or render")


def load_car(path):
    """The model as one mesh: nose to -x, centred, wheels on z = 0, metres."""
    import numpy
    from mathutils import Matrix

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    added = [thing for thing in bpy.data.objects if thing not in before]
    bpy.context.view_layer.update()
    # The export carries a unit icosphere that is no part of the car.
    meshes = [
        thing
        for thing in added
        if thing.type == "MESH" and not thing.name.startswith("Icosphere")
    ]
    for thing in meshes:
        thing.modifiers.clear()
        world = thing.matrix_world.copy()
        thing.parent = None
        thing.matrix_world = world
    for thing in added:
        if thing not in meshes:
            bpy.data.objects.remove(thing, do_unlink=True)
    bpy.ops.object.select_all(action="DESELECT")
    for thing in meshes:
        thing.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = "Car"
    # glTF's nose (+z) arrives as -y; turn it to -x.
    body.data.transform(Matrix.Rotation(math.radians(-90), 4, "Z"))
    points = numpy.array([tuple(vertex.co) for vertex in body.data.vertices])
    low, high = points.min(axis=0), points.max(axis=0)
    size = CAR_LENGTH / (high[0] - low[0])
    shift = Vector((-(low[0] + high[0]) / 2, -(low[1] + high[1]) / 2, -low[2]))
    body.data.transform(Matrix.Diagonal((size, size, size, 1)) @ Matrix.Translation(shift))
    body.data.update()
    return body

scene = bpy.context.scene
for thing in list(bpy.data.objects):
    bpy.data.objects.remove(thing, do_unlink=True)

scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = FRAMES


def add_box(name, size, location):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    box = bpy.context.active_object
    box.name = name
    box.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return box


# The domain: from a little ahead of the nose to well behind the car, and
# up into the air the steam climbs into.
domain = add_box("Domain", (14.0, 9.0, 6.5), (2.6, 0.6, 3.25))
domain_mod = domain.modifiers.new("Fluid", "FLUID")
domain_mod.fluid_type = "DOMAIN"
settings = domain_mod.domain_settings
settings.domain_type = "GAS"
settings.resolution_max = 96 if PREVIEW else 224
settings.use_adaptive_domain = True
settings.vorticity = 0.55
settings.alpha = 1.2  # buoyancy from density: steam is lighter than air
settings.beta = 0.6  # and from heat
settings.use_dissolve_smoke = True
settings.dissolve_speed = 40
settings.use_dissolve_smoke_log = True
settings.use_noise = not PREVIEW
settings.noise_scale = 2
settings.noise_strength = 1.2
settings.cache_type = "ALL"
settings.cache_frame_start = 1
settings.cache_frame_end = FRAMES
settings.cache_directory = os.path.join(OUT, "cache")
settings.time_scale = 1.0

# The car, and a closed voxel copy of it as the obstacle the steam flows
# round (the model is hundreds of open parts).
car = load_car(MODEL)
shell = car.copy()
shell.data = car.data.copy()
shell.name = "Shell"
scene.collection.objects.link(shell)
remesh = shell.modifiers.new("Close", "REMESH")
remesh.mode = "VOXEL"
remesh.voxel_size = 0.05
with bpy.context.temp_override(object=shell, active_object=shell):
    bpy.ops.object.modifier_apply(modifier=remesh.name)
shell.hide_render = True
shell_mod = shell.modifiers.new("Fluid", "FLUID")
shell_mod.fluid_type = "EFFECTOR"
shell_mod.effector_settings.effector_type = "COLLISION"

# The desk: a floor the steam spreads over, not rendered (the shader draws
# the steam's shadow on it).
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
desk = bpy.context.active_object
desk.name = "Desk"
desk.hide_render = True
desk_mod = desk.modifiers.new("Fluid", "FLUID")
desk_mod.fluid_type = "EFFECTOR"


def keep_until(flow, seconds, fade=0.6):
    """Emits from the start, easing off and stopping after `seconds`.

    Density and the push fade out rather than the emitter shrinking: the
    fog's skin, shrunk about the car's origin, would pass through it.
    """
    stop = 1 + seconds * FPS
    ease = 1 + (seconds - fade) * FPS
    full = flow.density
    for frame, share in ((1, 1), (ease, 1), (stop, 0)):
        flow.density = full * share
        flow.keyframe_insert("density", frame=frame)
    if flow.use_initial_velocity and flow.velocity_factor:
        push = tuple(flow.velocity_coord)
        for frame, share in ((1, 1), (ease, 1), (stop, 0)):
            flow.velocity_coord = tuple(axis * share for axis in push)
            flow.keyframe_insert("velocity_coord", frame=frame)


# The rear vents: a heavy, hot burst back and up, from just behind their
# grilles (inside them the obstacle would swallow it).
for index, vent in enumerate(VENTS):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.26, location=(vent[0] + 0.32, vent[1], vent[2]))
    nozzle = bpy.context.active_object
    nozzle.name = f"Vent{index}"
    flow_mod = nozzle.modifiers.new("Fluid", "FLUID")
    flow_mod.fluid_type = "FLOW"
    flow = flow_mod.flow_settings
    flow.flow_type = "SMOKE"
    flow.flow_behavior = "INFLOW"
    flow.flow_source = "MESH"
    flow.surface_distance = 0.4
    flow.density = 1.0
    flow.temperature = 2.6
    flow.smoke_color = (1, 1, 1)
    flow.use_initial_velocity = True
    flow.velocity_coord = (8.0, 1.6 if vent[1] > 0 else -1.6, 4.0)
    flow.velocity_factor = 1.0
    keep_until(flow, VENT_STOP)

# Cold vapour off the frozen body: a skin just outside the car's own
# surface, emitting out along its normals, colder than the air, so it
# spills off the sills and rolls out over the desk.
fog = shell.copy()
fog.data = shell.data.copy()
fog.name = "Fog"
fog.modifiers.clear()
scene.collection.objects.link(fog)
fog_mod = fog.modifiers.new("Fluid", "FLUID")
fog_mod.fluid_type = "FLOW"
flow = fog_mod.flow_settings
flow.flow_type = "SMOKE"
flow.flow_behavior = "INFLOW"
flow.flow_source = "MESH"
flow.surface_distance = 0.12
flow.volume_density = 0.0
flow.density = 0.45
flow.temperature = -1.0
flow.smoke_color = (1, 1, 1)
flow.use_initial_velocity = True
flow.velocity_normal = 0.6
flow.velocity_factor = 0.0
keep_until(flow, FOG_STOP, fade=1.2)
fog.hide_render = True

# The steam's material: bright, scattering forwards a little.
material = bpy.data.materials.new("Steam")
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
volume = nodes.new("ShaderNodeVolumePrincipled")
volume.inputs["Color"].default_value = (0.97, 0.98, 1.0, 1)
volume.inputs["Density"].default_value = 8.0
volume.inputs["Anisotropy"].default_value = 0.25
output = nodes.new("ShaderNodeOutputMaterial")
material.node_tree.links.new(volume.outputs["Volume"], output.inputs["Volume"])
domain.data.materials.append(material)

# The car's stand-in hides what is behind it, a little inside its photo,
# and casts no shadow: the page draws the car's own.
holdout = bpy.data.materials.new("Holdout")
holdout.use_nodes = True
holdout_nodes = holdout.node_tree.nodes
holdout_nodes.clear()
holdout_output = holdout_nodes.new("ShaderNodeOutputMaterial")
holdout_shader = holdout_nodes.new("ShaderNodeHoldout")
holdout.node_tree.links.new(
    holdout_shader.outputs["Holdout"], holdout_output.inputs["Surface"]
)
car.data.materials.clear()
car.data.materials.append(holdout)
for polygon in car.data.polygons:
    polygon.material_index = 0
car.visible_shadow = False

for thing in bpy.data.objects:
    if thing.name.startswith("Vent"):
        thing.hide_render = True

# Light: three suns round the desk, one a pass, each over the room's bright
# sky, so a blend of the passes whose shares add up to one is one sun from
# between them and the sky.
suns = []
for name, azimuth in zip(PASSES, LIGHTS):
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 10))
    sun = bpy.context.active_object
    sun.name = f"Sun-{name}"
    sun.data.angle = math.radians(25)
    toward = Vector(
        (
            math.cos(math.radians(LIGHT_ELEVATION)) * math.cos(math.radians(azimuth)),
            math.cos(math.radians(LIGHT_ELEVATION)) * math.sin(math.radians(azimuth)),
            math.sin(math.radians(LIGHT_ELEVATION)),
        )
    )
    # A sun shines down its local -z: turn +z towards where it stands.
    sun.rotation_mode = "QUATERNION"
    sun.rotation_quaternion = toward.to_track_quat("Z", "Y")
    suns.append(sun)
world = bpy.data.worlds.new("Room")
world.use_nodes = True
background = world.node_tree.nodes["Background"]
background.inputs["Color"].default_value = (0.97, 0.97, 0.98, 1)
scene.world = world

# The camera: the photo's, orthographic and tilted towards the screen's
# bottom (the -y side of the car), framing REGION.
up = Vector((0, math.cos(TILT), math.sin(TILT)))
middle = Vector((0, 0, CAR_MIDDLE_HEIGHT))
centre_x = (REGION["left"] + REGION["right"]) / 2 / PX_PER_M
centre_up = -(REGION["top"] + REGION["bottom"]) / 2 / PX_PER_M
target = middle + Vector((centre_x, 0, 0)) + up * centre_up
view = Vector((0, -math.sin(TILT), math.cos(TILT)))
bpy.ops.object.camera_add(location=target + view * 30)
camera = bpy.context.active_object
camera.data.type = "ORTHO"
width_m = (REGION["right"] - REGION["left"]) / PX_PER_M
camera.data.ortho_scale = width_m
camera.data.clip_end = 100
camera.rotation_euler = (TILT, 0, 0)
scene.camera = camera

use_gpu(scene)
scene.render.film_transparent = True
scene.render.resolution_x = round((REGION["right"] - REGION["left"]) * DENSITY)
scene.render.resolution_y = round((REGION["bottom"] - REGION["top"]) * DENSITY)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
light(scene)

os.makedirs(OUT, exist_ok=True)
bpy.context.view_layer.objects.active = domain
with bpy.context.temp_override(object=domain, active_object=domain):
    bpy.ops.fluid.bake_all()
# `--render` renders from this file: it alone knows the cache is baked.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "scene.blend"), copy=True)
print("BAKED", OUT)
if BAKE_ONLY:
    sys.exit(0)
render_passes(scene, suns)
if not PREVIEW:
    pack()

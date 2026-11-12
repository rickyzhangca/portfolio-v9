"""
Simulates and renders the fire the toy time machine leaves along its tyre
tracks, after the film: a line of burning fuel on the desk, seen by the
photo's camera (orthographic, tilted 26 degrees towards the screen's
bottom). Mantaflow fire, rendered by Cycles as its heat alone, and packed
into a looping atlas the trip shader tiles along each track and colours
itself (`fireColor`), so the sheet holds one grey channel.

  blender --background --factory-startup --python tools/render-fire.py -- <out dir> [--preview] [--pack] [--sheet <path>] [--gain <number>]

It bakes into `<out dir>/cache`, renders `<out dir>/frame-####.png` and
packs them, `COLS` by `ROWS`, into `--sheet` (by default
`src/assets/timecar/fire.webp`, with cwebp). `--pack` only repacks frames
already rendered; `--preview` is a quick, coarse run that packs nothing.
The layout must match `FIRE_SHEET` in `src/lib/flux-charge.ts`.

The sheet loops: its last `BLEND` frames are cross-faded into its first, so
the shader can run it round. It does not tile along the track by itself; the
shader lays two copies half a tile apart and fades between them. The fuel
line is longer than the frame, so no flame ends inside it.

It takes about six minutes on a laptop: there is no car in it, and the heat
needs no light.
"""

import math
import os
import subprocess
import sys

import bpy
import numpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "fire-frames")
PREVIEW = "--preview" in argv
PACK_ONLY = "--pack" in argv
SHEET = (
    argv[argv.index("--sheet") + 1]
    if "--sheet" in argv
    else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "src", "assets", "timecar", "fire.webp"
    )
)
# How bright the heat is packed: 1 - exp(-gain * rendered).
GAIN = float(argv[argv.index("--gain") + 1]) if "--gain" in argv else 7.0

COLS = 6
ROWS = 6
LOOP = COLS * ROWS
# Frames past the loop's end, cross-faded into its start.
BLEND = 8
FPS = 24
# The fire has caught along the whole line by now.
WARM_UP = 40
FIRST = WARM_UP + 1
LAST = WARM_UP + LOOP + BLEND
TILT = math.radians(26)
# The frame: metres along the track, and up the screen; a cell's px.
FRAME_WIDTH = 2.4
FRAME_HEIGHT = 0.8
CELL = (384, 128)
# The fuel line sits this far up the frame from its bottom edge, metres.
BASE = 0.14


def frame_path(index):
    return os.path.join(OUT, f"frame-{index:04d}.png")


def load(index):
    image = bpy.data.images.load(frame_path(index))
    width, height = image.size
    pixels = numpy.array(image.pixels[:], dtype=numpy.float32).reshape(height, width, 4)
    bpy.data.images.remove(image)
    # Top row first, heat alone.
    return pixels[::-1, :, 0]


def pack():
    frames = [load(index) for index in range(FIRST, LAST + 1)]
    height, width = frames[0].shape
    sheet = numpy.zeros((ROWS * height, COLS * width), dtype=numpy.float32)
    for index in range(LOOP):
        heat = frames[index]
        if index < BLEND:
            share = index / BLEND
            heat = frames[index + LOOP] * (1 - share) + heat * share
        heat = 1 - numpy.exp(-GAIN * heat)
        row, column = divmod(index, COLS)
        sheet[row * height : (row + 1) * height, column * width : (column + 1) * width] = heat
    print("HEAT", float(sheet.max()), float(sheet.mean()))
    image = bpy.data.images.new("Sheet", COLS * width, ROWS * height, alpha=False)
    rgba = numpy.ones((ROWS * height, COLS * width, 4), dtype=numpy.float32)
    rgba[:, :, :3] = sheet[::-1, :, None]
    image.pixels.foreach_set(rgba.ravel())
    png = os.path.join(OUT, "sheet.png")
    image.filepath_raw = png
    image.file_format = "PNG"
    scene = bpy.context.scene
    scene.view_settings.view_transform = "Raw"
    image.save()
    subprocess.run(["cwebp", "-quiet", "-q", "82", "-m", "6", png, "-o", SHEET], check=True)
    print("PACKED", SHEET, COLS * width, ROWS * height)


if PACK_ONLY:
    pack()
    sys.exit(0)

scene = bpy.context.scene
for thing in list(bpy.data.objects):
    bpy.data.objects.remove(thing, do_unlink=True)
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = LAST


def add_box(name, size, location):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    box = bpy.context.active_object
    box.name = name
    box.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return box


# The domain: the track, longer than the frame, and the air above it.
# It reaches below the desk: the solver's outermost cells are its walls, and
# fuel lying in them burns nothing.
domain = add_box("Domain", (4.4, 1.4, 1.9), (0, 0, 0.8))
domain_mod = domain.modifiers.new("Fluid", "FLUID")
domain_mod.fluid_type = "DOMAIN"
settings = domain_mod.domain_settings
settings.domain_type = "GAS"
settings.resolution_max = 72 if PREVIEW else 120
settings.use_adaptive_domain = False
settings.vorticity = 0.6
settings.beta = 1.6
settings.burning_rate = 0.62
settings.flame_smoke = 0.0
settings.flame_vorticity = 1.4
settings.flame_ignition = 1.5
settings.flame_max_temp = 3.0
settings.use_noise = not PREVIEW
settings.noise_scale = 2
settings.noise_strength = 1.4
settings.cache_type = "ALL"
settings.cache_frame_start = 1
settings.cache_frame_end = LAST
settings.cache_directory = os.path.join(OUT, "cache")

# The fuel: a tyre's tread of it along the track, burning unevenly. A
# moving cloud texture starves and feeds stretches of it, so the line
# gutters and flares rather than standing as an even wall.
fuel = add_box("Fuel", (4.0, 0.09, 0.1), (0, 0, 0.02))
fuel_mod = fuel.modifiers.new("Fluid", "FLUID")
fuel_mod.fluid_type = "FLOW"
flow = fuel_mod.flow_settings
flow.flow_type = "FIRE"
flow.flow_behavior = "INFLOW"
flow.flow_source = "MESH"
flow.surface_distance = 0.6
flow.fuel_amount = 1.15
flow.temperature = 1.5
clouds = bpy.data.textures.new("Fuel", "CLOUDS")
clouds.noise_scale = 0.14
clouds.noise_depth = 2
clouds.contrast = 4.0
clouds.intensity = 0.8
flow.use_texture = True
flow.noise_texture = clouds
flow.texture_map_type = "AUTO"
flow.texture_size = 1.0
for frame_number, offset in ((1, 0.0), (LAST, 3.0)):
    flow.texture_offset = offset
    flow.keyframe_insert("texture_offset", frame=frame_number)
fuel.hide_render = True

# Its heat as light, and nothing else: the shader colours it.
material = bpy.data.materials.new("Heat")
material.use_nodes = True
nodes = material.node_tree.nodes
links = material.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
attribute = nodes.new("ShaderNodeAttribute")
attribute.attribute_name = "flame"
strength = nodes.new("ShaderNodeMath")
strength.operation = "MULTIPLY"
strength.inputs[1].default_value = 2.0
emission = nodes.new("ShaderNodeEmission")
emission.inputs["Color"].default_value = (1, 1, 1, 1)
links.new(attribute.outputs["Fac"], strength.inputs[0])
links.new(strength.outputs["Value"], emission.inputs["Strength"])
links.new(emission.outputs["Emission"], output.inputs["Volume"])
domain.data.materials.append(material)

world = bpy.data.worlds.new("Dark")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0, 0, 0, 1)
scene.world = world

# The photo's camera, framing the track with the fuel line near the bottom.
up = Vector((0, math.cos(TILT), math.sin(TILT)))
view = Vector((0, -math.sin(TILT), math.cos(TILT)))
target = up * (FRAME_HEIGHT / 2 - BASE)
bpy.ops.object.camera_add(location=target + view * 20)
camera = bpy.context.active_object
camera.data.type = "ORTHO"
camera.data.ortho_scale = FRAME_WIDTH
camera.data.clip_end = 100
camera.rotation_euler = (TILT, 0, 0)
scene.camera = camera

scene.render.engine = "CYCLES"
preferences = bpy.context.preferences.addons["cycles"].preferences
scene.cycles.device = "CPU"
for kind in ("OPTIX", "CUDA", "METAL"):
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
print("DEVICE", scene.cycles.device)
scene.cycles.samples = 24 if PREVIEW else 64
scene.cycles.use_denoising = not PREVIEW
scene.cycles.volume_step_rate = 0.5
scene.cycles.max_bounces = 0
scene.render.film_transparent = False
scene.render.resolution_x = CELL[0]
scene.render.resolution_y = CELL[1]
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "16"
scene.view_settings.view_transform = "Raw"
scene.view_settings.look = "None"

os.makedirs(OUT, exist_ok=True)
bpy.context.view_layer.objects.active = domain
with bpy.context.temp_override(object=domain, active_object=domain):
    bpy.ops.fluid.bake_all()
print("BAKED", OUT)

frames = [FIRST + LOOP // 2] if PREVIEW else range(FIRST, LAST + 1)
for index in frames:
    scene.frame_set(index)
    scene.render.filepath = frame_path(index)
    bpy.ops.render.render(write_still=True)
print("RENDERED", OUT)
if not PREVIEW:
    pack()

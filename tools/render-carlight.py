"""
Bakes the light the time machine's charge throws on its own body, from the
real model, so the page can light the car's photo with it: the ball of light
ahead of its nose, the slice it drives through, the exit it bursts out of,
and its bolts.

  blender --background --factory-startup --python tools/render-carlight.py -- <out dir> --model <scene.gltf> [--preview]

Each map is the model, seen through the photo's camera (orthographic, tilted
26° towards the screen's bottom, `PX_PER_M` 57.3, framing the photo's box),
lit by one light alone in a black room, so it holds only the light that
light adds. The maps are luminance, grey tiles side by side in
`src/assets/timecar/car-light.webp` (`CAR_LIGHT` in
`src/lib/flux-charge.ts` names them; channels of one tile would bleed into
each other through WebP's subsampled colour). Within a family (`FAMILIES`) the maps
share one scale, so the page can blend neighbours as a light moves.

Run it on Modal (`modal run tools/modal-steam.py::carlight`); it takes a
few minutes of one GPU.
"""

import math
import os
import subprocess
import sys

import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0])
MODEL = argv[argv.index("--model") + 1]
PREVIEW = "--preview" in argv
SHEET = argv[argv.index("--sheet") + 1] if "--sheet" in argv else os.path.join(OUT, "car-light.webp")

PX_PER_M = 57.3
TILT = math.radians(26)
CAR_LENGTH = 4.216
CAR_MIDDLE_HEIGHT = 0.534
NOSE = -CAR_LENGTH / 2
# The photo: 248 by 117.33 CSS px, centred on the car's middle.
PHOTO = (248, 352 / 3)
DENSITY = 2
# Where the ball of light and the slice stand on screen: 56% down the photo.
ORB_RAISE = 0.8
ORB_HEIGHT = CAR_MIDDLE_HEIGHT - (0.06 * PHOTO[1] / PX_PER_M) / math.cos(TILT)

# Each map: (name, family, light). Positions in metres, nose towards -x.
ORB_AHEAD = (0.06, 0.35, 0.8, 1.4)
# Where the slice cuts the car, shares of its length from the nose. The page
# only shows a slice map whose cut is behind the screen's (the car is clipped
# there anyway), so its cut edge never shows; they are close enough that the
# next one takes over before the light has moved far from the cut.
SLICE_AT = (0.0, 0.2, 0.4, 0.6, 0.8)
EXIT_AT = (0.2, 0.4, 0.6, 0.8, 1.0)
MAPS = (
    [(f"orb{index}", "orb", ("point", NOSE - ahead)) for index, ahead in enumerate(ORB_AHEAD)]
    + [(f"slice{index}", "slice", ("plane", NOSE + share * CAR_LENGTH, 1)) for index, share in enumerate(SLICE_AT)]
    + [(f"exit{index}", "exit", ("plane", NOSE + share * CAR_LENGTH, -1)) for index, share in enumerate(EXIT_AT)]
    + [("rimFront", "rim", ("rim", -1)), ("rimRear", "rim", ("rim", 1))]
)
FAMILIES = ("orb", "slice", "exit", "rim")


def load_car(path):
    """The model as one mesh: nose to -x, centred, wheels on z = 0, metres."""
    import numpy

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    added = [thing for thing in bpy.data.objects if thing not in before]
    bpy.context.view_layer.update()
    meshes = [thing for thing in added if thing.type == "MESH" and not thing.name.startswith("Icosphere")]
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
    body.data.transform(Matrix.Rotation(math.radians(-90), 4, "Z"))
    points = numpy.array([tuple(vertex.co) for vertex in body.data.vertices])
    low, high = points.min(axis=0), points.max(axis=0)
    size = CAR_LENGTH / (high[0] - low[0])
    shift = Vector((-(low[0] + high[0]) / 2, -(low[1] + high[1]) / 2, -low[2]))
    body.data.transform(Matrix.Diagonal((size, size, size, 1)) @ Matrix.Translation(shift))
    body.data.update()
    return body, (high[1] - low[1]) * size


def add_cut(material):
    """Lets the material vanish past `CutX` on the side `CutSide` points
    away from, as the slice cuts the car on screen, so a light standing in
    the cut lights what is left and shines through what is gone."""
    tree = material.node_tree
    nodes, links = tree.nodes, tree.links
    output = next((node for node in nodes if node.type == "OUTPUT_MATERIAL"), None)
    if output is None or not output.inputs["Surface"].is_linked:
        return
    shader = output.inputs["Surface"].links[0].from_socket
    geometry = nodes.new("ShaderNodeNewGeometry")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    cut = nodes.new("ShaderNodeValue")
    cut.name = "CutX"
    side = nodes.new("ShaderNodeValue")
    side.name = "CutSide"
    minus = nodes.new("ShaderNodeMath")
    minus.operation = "SUBTRACT"
    times = nodes.new("ShaderNodeMath")
    times.operation = "MULTIPLY"
    keep = nodes.new("ShaderNodeMath")
    keep.operation = "GREATER_THAN"
    keep.inputs[1].default_value = 0.0
    clear = nodes.new("ShaderNodeBsdfTransparent")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(geometry.outputs["Position"], separate.inputs[0])
    links.new(separate.outputs["X"], minus.inputs[0])
    links.new(cut.outputs[0], minus.inputs[1])
    links.new(minus.outputs[0], times.inputs[0])
    links.new(side.outputs[0], times.inputs[1])
    links.new(times.outputs[0], keep.inputs[0])
    links.new(keep.outputs[0], mix.inputs["Fac"])
    links.new(clear.outputs[0], mix.inputs[1])
    links.new(shader, mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])


def set_cut(x, side):
    for material in bpy.data.materials:
        if material.node_tree and "CutX" in material.node_tree.nodes:
            material.node_tree.nodes["CutX"].outputs[0].default_value = x
            material.node_tree.nodes["CutSide"].outputs[0].default_value = side


scene = bpy.context.scene
for thing in list(bpy.data.objects):
    bpy.data.objects.remove(thing, do_unlink=True)
car, car_width = load_car(MODEL)
for material in car.data.materials:
    if material is None or not material.node_tree:
        continue
    # The photo's body is brushed steel, not the model's half-metal paint.
    # Only the bake's light: the glowing conduits are drawn by the page.
    for node in material.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            node.inputs["Emission Strength"].default_value = 0.0
        elif node.type == "EMISSION":
            node.inputs["Strength"].default_value = 0.0
    if "Paint_Material" in material.name:
        material.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 1.0
    add_cut(material)
set_cut(-100.0, 1.0)

world = bpy.data.worlds.new("Dark")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
scene.world = world

up = Vector((0, math.cos(TILT), math.sin(TILT)))
view = Vector((0, -math.sin(TILT), math.cos(TILT)))
target = Vector((0, 0, CAR_MIDDLE_HEIGHT))
bpy.ops.object.camera_add(location=target + view * 30)
camera = bpy.context.active_object
camera.data.type = "ORTHO"
camera.data.ortho_scale = PHOTO[0] / PX_PER_M
camera.data.clip_end = 100
camera.rotation_euler = (TILT, 0, 0)
scene.camera = camera

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
scene.cycles.samples = 32 if PREVIEW else 256
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 6
scene.render.film_transparent = True
scene.render.resolution_x = round(PHOTO[0] * DENSITY)
scene.render.resolution_y = round(PHOTO[1] * DENSITY)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.view_settings.view_transform = "Standard"


def add_point(location, radius, energy):
    bpy.ops.object.light_add(type="POINT", location=location)
    light = bpy.context.active_object
    light.data.shadow_soft_size = radius
    light.data.energy = energy
    return light


def rim_points(side):
    """Small lights just outside the car's outline, front or rear half: the
    bolts that jump over its body."""
    half_length = CAR_LENGTH / 2 + 0.22
    half_width = car_width / 2 + 0.22
    points = []
    for step in range(16):
        angle = 2 * math.pi * (step + 0.5) / 16
        x = half_length * math.cos(angle)
        y = half_width * math.sin(angle)
        if (x < 0) == (side < 0):
            z = 0.45 if step % 2 else 1.0
            points.append((x, y, z))
    return points


os.makedirs(OUT, exist_ok=True)
for name, _family, light in MAPS:
    made = []
    if light[0] == "point":
        # Slid along the camera's line of sight, where it still shows ahead
        # of the nose: low by the bumper it lit only the bumper's edge, and
        # the film's ball of light floods the hood.
        toward_camera = Vector((0.0, -math.sin(TILT), math.cos(TILT))) * ORB_RAISE
        made.append(add_point(Vector((light[1], 0.0, ORB_HEIGHT)) + toward_camera, 0.25, 4000.0))
        set_cut(-100.0, 1.0)
    elif light[0] == "plane":
        x, side = light[1], light[2]
        bpy.ops.object.light_add(type="AREA", location=(x, 0.0, 0.7))
        plane = bpy.context.active_object
        plane.data.shape = "RECTANGLE"
        plane.data.size = 1.6
        plane.data.size_y = car_width + 0.6
        plane.data.energy = 120.0
        # An area light shines down its local -z: towards the car behind the
        # slice (+x as it leaves), or ahead of the exit (-x as it arrives).
        plane.rotation_euler = (0.0, math.radians(-90 * side), 0.0)
        made.append(plane)
        set_cut(x, side)
    else:
        made.extend(add_point(point, 0.06, 40.0) for point in rim_points(light[1]))
        set_cut(-100.0, 1.0)
    scene.render.filepath = os.path.join(OUT, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    for thing in made:
        bpy.data.objects.remove(thing, do_unlink=True)
    print("RENDERED", name, flush=True)


def pack():
    """Luminance of each map, scaled per family so its brightest light
    reaches 0.95, as grey tiles side by side."""
    import numpy

    width, height = scene.render.resolution_x, scene.render.resolution_y
    lumas = {}
    for name, _family, _light in MAPS:
        image = bpy.data.images.load(os.path.join(OUT, f"{name}.png"))
        pixels = numpy.array(image.pixels[:], dtype=numpy.float32).reshape(height, width, 4)[::-1]
        # Stored in sRGB; the page adds light in sRGB too, over the photo.
        lumas[name] = pixels[..., :3] @ numpy.array([0.2126, 0.7152, 0.0722], dtype=numpy.float32)
        bpy.data.images.remove(image)
    for family in FAMILIES:
        names = [name for name, owner, _light in MAPS if owner == family]
        top = max(float(numpy.percentile(lumas[name], 99.7)) for name in names)
        for name in names:
            lumas[name] = numpy.clip(lumas[name] * (0.95 / max(top, 1e-4)), 0.0, 1.0)
        print("SCALE", family, round(0.95 / max(top, 1e-4), 3))
    tiles = len(MAPS)
    sheet = numpy.ones((height, width * tiles, 4), dtype=numpy.float32)
    for tile, (name, _family, _light) in enumerate(MAPS):
        for channel in range(3):
            sheet[:, tile * width : (tile + 1) * width, channel] = lumas[name]
    image = bpy.data.images.new("Sheet", width * tiles, height, alpha=True)
    image.pixels = sheet[::-1].ravel()
    png = os.path.join(OUT, "car-light.png")
    image.filepath_raw = png
    image.file_format = "PNG"
    image.save()
    subprocess.run(["cwebp", "-q", "90", "-m", "6", "-noalpha", png, "-o", SHEET], check=True)
    print("PACKED", SHEET, width * tiles, height, [name for name, _f, _l in MAPS])


pack()

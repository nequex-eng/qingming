import bpy
import os
import json
import math
import tempfile
import gzip

ROOT = os.getcwd()
OUT = os.path.join(ROOT, "output")
os.makedirs(OUT, exist_ok=True)

ASSETS = [
    ("Timber arch bridge", "public/assets/3d/bridges/timber-arch-bridge.glb"),
    ("Stone arch bridge", "public/assets/3d/bridges/stone-arch-bridge.glb"),
    ("Riverside commercial building", "public/assets/3d/architecture/riverside-commercial-building.glb"),
    ("Restaurant / wine house", "/tmp/restaurant-wine-house.glb"),
    ("Teahouse", "public/assets/3d/architecture/teahouse.glb"),
    ("Wharf / dock", "public/assets/3d/architecture/wharf-dock.glb"),
]

# Clean factory scene and create a neutral inspection stage.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials, bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
    pass

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT" if hasattr(bpy.types, "SceneEEVEE") else "BLENDER_EEVEE"
scene.render.resolution_x = 1800
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world.color = (0.055, 0.065, 0.08)
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "AgX - Medium High Contrast" if "AgX - Medium High Contrast" in [x.name for x in bpy.types.ColorManagedViewSettings.bl_rna.properties["look"].enum_items] else "Medium High Contrast"

# Soft ground.
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.08))
ground = bpy.context.object
ground.name = "Inspection Ground"
mat = bpy.data.materials.new("Warm neutral ground")
mat.diffuse_color = (0.19, 0.22, 0.22, 1)
ground.data.materials.append(mat)

# Soft studio lighting.
def area_light(name, loc, power, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    direction = (0, 0, 0) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj

area_light("Key softbox", (7, -10, 15), 1800, 9)
area_light("Fill softbox", (-10, -4, 9), 1100, 8)
area_light("Rim softbox", (0, 10, 12), 1500, 7)

# Six assets arranged independently in a 3 x 2 inspection grid.
records = []
for idx, (label, relpath) in enumerate(ASSETS):
    path = relpath if os.path.isabs(relpath) else os.path.join(ROOT, relpath)
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Missing model: {path}")

    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    imported = [o for o in bpy.context.scene.objects if o not in before]
    if not imported:
        raise RuntimeError(f"No objects imported from {label}")

    mesh_objects = [o for o in imported if o.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError(f"No mesh geometry found in {label}")

    # Calculate world-space bounds from imported mesh vertices.
    bpy.context.view_layer.update()
    coords = []
    for obj in mesh_objects:
        for corner in obj.bound_box:
            coords.append(obj.matrix_world @ bpy.mathutils.Vector(corner))
    mins = [min(v[i] for v in coords) for i in range(3)]
    maxs = [max(v[i] for v in coords) for i in range(3)]
    dims = [maxs[i] - mins[i] for i in range(3)]
    max_dim = max(dims)
    if max_dim <= 0:
        raise RuntimeError(f"Invalid dimensions for {label}")

    # Fit each model into a comparable cell without changing its proportions.
    scale = 4.4 / max_dim
    for obj in imported:
        obj.location *= scale
        obj.scale *= scale

    bpy.context.view_layer.update()
    coords2 = []
    for obj in mesh_objects:
        for corner in obj.bound_box:
            coords2.append(obj.matrix_world @ bpy.mathutils.Vector(corner))
    mins2 = [min(v[i] for v in coords2) for i in range(3)]
    maxs2 = [max(v[i] for v in coords2) for i in range(3)]
    center = [(mins2[i] + maxs2[i]) / 2 for i in range(3)]
    row, col = divmod(idx, 3)
    target = ((col - 1) * 7.0, (0.5 - row) * 7.0, 0)
    offset = [target[0] - center[0], target[1] - center[1], -mins2[2]]
    for obj in imported:
        obj.location.x += offset[0]
        obj.location.y += offset[1]
        obj.location.z += offset[2]

    records.append({
        "name": label,
        "source": relpath,
        "object_count": len(imported),
        "mesh_count": len(mesh_objects),
        "source_dimensions": [round(v, 4) for v in dims],
        "normalization_scale": round(scale, 6),
        "source_center": [round(v, 4) for v in center],
    })

# Camera: elevated three-quarter view over the complete asset board.
cam_data = bpy.data.cameras.new("Inspection Camera")
cam = bpy.data.objects.new("Inspection Camera", cam_data)
scene.collection.objects.link(cam)
cam.location = (16, -22, 23)
target = (0, 0, 0)
direction = bpy.mathutils.Vector(target) - cam.location
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
cam.data.type = "ORTHO"
cam.data.ortho_scale = 25.5
scene.camera = cam

# Add simple labels using text objects on the ground plane.
for idx, record in enumerate(records):
    row, col = divmod(idx, 3)
    text_data = bpy.data.curves.new("Label", type="FONT")
    text_data.body = record["name"]
    text_data.size = 0.42
    text_obj = bpy.data.objects.new("Label - " + record["name"], text_data)
    scene.collection.objects.link(text_obj)
    text_obj.location = ((col - 1) * 7.0 - 2.0, (0.5 - row) * 7.0 - 2.8, 0.01)
    text_obj.rotation_euler[0] = math.radians(0)

scene.render.filepath = os.path.join(OUT, "qingming-assets-overview.png")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "qingming-assets.blend"))
bpy.ops.render.render(write_still=True)

with open(os.path.join(OUT, "model-dimensions.json"), "w", encoding="utf-8") as f:
    json.dump({
        "blender_version": bpy.app.version_string,
        "asset_count": len(records),
        "assets": records,
    }, f, ensure_ascii=False, indent=2)

print("CLOUD_BLENDER_RESULT", json.dumps({"blender": bpy.app.version_string, "assets": records}, ensure_ascii=False))

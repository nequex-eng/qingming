import bpy
import os
import json
import math
import gzip
import shutil
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "cloud-blender-output")
os.makedirs(OUT, exist_ok=True)

ASSETS = [
    ("timber-arch-bridge", "public/assets/3d/bridges/timber-arch-bridge.glb"),
    ("stone-arch-bridge", "public/assets/3d/bridges/stone-arch-bridge.glb"),
    ("riverside-commercial-building", "public/assets/3d/architecture/riverside-commercial-building.glb"),
    ("restaurant-wine-house", "public/assets/3d/architecture/restaurant-wine-house.glb.gz"),
    ("teahouse", "public/assets/3d/architecture/teahouse.glb"),
    ("wharf-dock", "public/assets/3d/architecture/wharf-dock.glb"),
]

# Clean scene and configure a neutral studio floor.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 32
scene.render.resolution_x = 1800
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.world.color = (0.08, 0.08, 0.08)

# A neutral floor lets us inspect geometry and scale without pretending this is the final town layout.
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -0.08))
floor = bpy.context.object
floor.name = "Preview Ground"
mat = bpy.data.materials.new("Neutral Preview Ground")
mat.diffuse_color = (0.22, 0.24, 0.25, 1)
floor.data.materials.append(mat)

report = []
all_bounds = []
for idx, (name, relpath) in enumerate(ASSETS):
    source = os.path.join(ROOT, relpath)
    if not os.path.isfile(source):
        raise FileNotFoundError("Missing asset: " + source)

    import_path = source
    temp_path = None
    if source.endswith(".gz"):
        temp_path = os.path.join(OUT, name + ".glb")
        with gzip.open(source, "rb") as src, open(temp_path, "wb") as dst:
            shutil.copyfileobj(src, dst)
        import_path = temp_path

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=import_path)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    if not imported:
        raise RuntimeError("Blender imported no objects for " + name)

    # Place each independent asset on its own preview pad, preserving its internal transforms.
    col = idx % 3
    row = idx // 3
    target_x = (col - 1) * 18.0
    target_y = (0.5 - row) * 20.0
    mesh_objects = [o for o in imported if o.type in {"MESH", "CURVE", "FONT", "SURFACE"}]
    if not mesh_objects:
        mesh_objects = imported

    bpy.context.view_layer.update()
    coords = []
    for obj in mesh_objects:
        for corner in obj.bound_box:
            coords.append(obj.matrix_world @ Vector(corner))
    if not coords:
        raise RuntimeError("Could not calculate bounds for " + name)

    min_v = Vector((min(v.x for v in coords), min(v.y for v in coords), min(v.z for v in coords)))
    max_v = Vector((max(v.x for v in coords), max(v.y for v in coords), max(v.z for v in coords)))
    dims = max_v - min_v
    max_dim = max(dims.x, dims.y, dims.z, 0.001)
    scale = 8.0 / max_dim
    for obj in imported:
        obj.scale = obj.scale * scale
        obj.location.x += target_x
        obj.location.y += target_y
    bpy.context.view_layer.update()

    coords2 = []
    for obj in mesh_objects:
        for corner in obj.bound_box:
            coords2.append(obj.matrix_world @ Vector(corner))
    min_z = min(v.z for v in coords2)
    for obj in imported:
        obj.location.z -= min_z

    report.append({
        "asset": name,
        "source": relpath,
        "object_count": len(imported),
        "mesh_count": len([o for o in imported if o.type == "MESH"]),
        "original_dimensions": [round(dims.x, 4), round(dims.y, 4), round(dims.z, 4)],
        "preview_scale_factor": round(scale, 6),
        "materials": sorted({m.name for o in imported if hasattr(o.data, "materials") for m in o.data.materials if m}),
    })

# Camera and lights.
bpy.ops.object.light_add(type="AREA", location=(0, -24, 34))
key = bpy.context.object
key.data.energy = 5000
key.data.shape = "DISK"
key.data.size = 24
bpy.ops.object.light_add(type="AREA", location=(22, 18, 22))
fill = bpy.context.object
fill.data.energy = 2500
fill.data.size = 18

bpy.ops.object.camera_add(location=(34, -48, 42))
camera = bpy.context.object
direction = Vector((0, 0, 0)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 45
scene.camera = camera

scene.render.filepath = os.path.join(OUT, "six-assets-overview.png")
bpy.ops.render.render(write_still=True)

with open(os.path.join(OUT, "asset-inspection.json"), "w", encoding="utf-8") as f:
    json.dump({
        "blender_version": bpy.app.version_string,
        "asset_count": len(report),
        "assets": report,
    }, f, ensure_ascii=False, indent=2)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "qingming-six-assets-preview.blend"))
print("CLOUD_BLENDER_SUCCESS: imported", len(report), "assets and rendered preview")

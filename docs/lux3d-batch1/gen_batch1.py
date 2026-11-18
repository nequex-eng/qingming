#!/usr/bin/env python3
"""Batch 1 quote inputs: 5 new text-to-3d calls (G1-Turbo, GLB, photorealistic).
Timber arch bridge is reused from task 8306234, not re-quoted.
Plan version 2 supersedes the 48-item plan (version 1): user chose Batch 1 only first.
"""
import json

PLUGIN_TASK_ID = "plugin_1e1b222949a2415e8d082191cdea2220"
OUT = "/home/hatch/workspace/qingming-assets"

ASSETS = [
    ("stone-arch-bridge",
     "Traditional Chinese stone arch bridge, grey weathered masonry blocks, single round arch with clear opening beneath, stone balustrade with carved posts, worn stone steps at both ends, Song dynasty style, realistic PBR materials, standalone bridge, no water, no background, no people"),
    ("riverside-commercial-building",
     "Large traditional Chinese riverside commercial building, two to three storeys, timber frame, curved grey tiled roof with upturned eaves, wooden balconies with lattice railings, open shopfront on ground floor, large hanging wooden signboard, aged wood and plaster walls, Song dynasty Lin'an style, realistic, standalone building with real depth and openings, no background, no people"),
    ("restaurant-wine-house",
     "Traditional Chinese restaurant and wine house, two storeys, timber structure, curved tiled roof, detailed shopfront with wooden lattice windows and open entrance, upper floor balcony, large hanging wine sign and flag, warm wooden tones, Song dynasty style, realistic, standalone building with real interior depth visible through openings, no background, no people"),
    ("teahouse",
     "Traditional Chinese teahouse, timber frame, tiled roof, recognizable tea house frontage with wooden counter, lattice windows, open entrance, hanging tea sign, bamboo and linen details, Song dynasty style, realistic, standalone building, no background, no people"),
    ("wharf-dock",
     "Traditional Chinese riverside timber wharf dock, wooden platform on piles, stone and timber steps down to the water, mooring posts with coiled rope, loading area with cargo, weathered wood, Song dynasty style, realistic, modular standalone dock, no water surface, no background, no people"),
]

PLAN = """1. Goal: Batch 1 of the Qingming Southern Song 3D asset production (Aholo Lux3D, domestic region cn). Build the visual foundation: the landmark architecture and wharf for a multiplayer Southern Song urban-life game inspired by Along the River During the Qingming Festival. Art direction: realistic 3D, Southern Song timber architecture, curved tiled roofs, wooden brackets, shopfronts, balconies, lattice windows, stone foundations, fabric awnings and traditional signs; natural aged wood, grey tiles, weathered stone, bamboo, linen, ceramic, iron and rope; rich but restrained historical colors; no modern objects, no cartoon/low-poly/toy/anime look, no fantasy palace aesthetics.
2. Scope of this batch: 6 assets. One is already generated and reused: the signature timber arch bridge (task 8306234, G1-Turbo hand_painted GLB, 17.3MB, visually verified, copied to public/assets/3d/bridges/timber-arch-bridge.glb). This quote covers the remaining 5 generation calls, one per asset, all text-to-3d, version G1-Turbo, default photorealistic style, output format GLB, service-default face count, no four-view enhancement: (1) stone arch bridge, (2) large riverside commercial building, (3) restaurant/wine house, (4) teahouse, (5) wharf/dock.
3. The user chose Batch 1 only first to see the effect before deciding on Batches 2-4. No generation for later batches is submitted in this run.
4. Technical: GLB with embedded materials and textures; Y up, ground contact at Y=0; consistent real-world scale; PBR materials; sensible pivots and origins; each asset stored as an independent file under public/assets/3d/ with preview image and metadata JSON (dimensions, scale, origin, polygon count, materials, textures, intended use, limitations).
5. Quality: every model is visually inspected (silhouette, historical style, textures, geometry, ground contact, scale, GLB loading, usable openings/decks) before it is called verified; a failed model is preserved as failed and production moves on to the next asset, retrying only the failed one.
6. Delivery: Batch 1 assets plus docs/3d-asset-catalog.md, docs/3d-asset-integration-guide.md, docs/3d-asset-gaps.md and a unified offline preview page, committed to https://github.com/nequex-eng/qingming.git with the message 'Build Southern Song 3D asset library with Aholo Lux3D', then REPORT is submitted to Lux3D."""

items = {}
for n, (item_id, prompt) in enumerate(ASSETS, start=1):
    items[str(n)] = {
        "endpoint": {"method": "POST", "path": "/lux3d/v1/generate/text-to-3d/task/create"},
        "parameters": {"body": {
            "version": "G1-Turbo",
            "prompt": prompt,
            "outputFormat": ["glb"],
        }},
    }

with open(f"{OUT}/items-b1.json", "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

review = {
    "pluginTaskId": PLUGIN_TASK_ID,
    "planVersion": 2,
    "plan": PLAN,
    "userInputs": [{
        "addedInVersion": 2,
        "text": "先只做第一批6个资产看看效果",
    }],
}
with open(f"{OUT}/review-b1.json", "w", encoding="utf-8") as f:
    json.dump(review, f, ensure_ascii=False, indent=2)

print("batch1 items:", len(items))

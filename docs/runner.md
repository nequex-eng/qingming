# Self-hosted Blender runner (muse-blender)

The user's cloud VM (Linux) is registered as a GitHub self-hosted runner so
Blender jobs can be dispatched from GitHub instead of run interactively.

## Runner

- Repo: `nequex-eng/qingming`
- Runner name: `muse-blender`
- Labels: `self-hosted, linux, x64, blender`
- Runner dir on host: `/home/hatch/actions-runner` (v2.338.2)
- Blender: `/home/hatch/workspace/blender/blender` (4.5.16 LTS, headless)
- Scripts: `/home/hatch/workspace/blender-work/{clean,render2,inspect}.py`
- Source GLBs: `/home/hatch/workspace/qingming/public/assets/3d/`
- CDN: `https://qingming-assets.pages.dev/`
- Watchdog: `/home/hatch/workspace/runner/watchdog.sh` (cron, every 5 min,
  restarts the listener if it died)

## How to dispatch (GPT)

Trigger a workflow manually — GitHub UI (Actions tab → workflow → Run
workflow), or API:

```
POST /repos/nequex-eng/qingming/actions/workflows/blender-clean.yml/dispatches
{"ref": "main", "inputs": {"source_glb": "<absolute path on host>", "target_faces": "60000", "texture_size": "1024", "bake_scale": "15"}}
```

Workflows:

- `runner-smoke.yml` — no inputs; renders one test frame, uploads it as
  artifact `smoke-render`. Run this first after any runner change.
- `blender-clean.yml` — inputs `source_glb` (required), `target_faces`,
  `texture_size`, `bake_scale`. Runs `clean.py` (decimate + downscale
  textures + bake scale + Draco export) and uploads the result as artifact
  `cleaned-glb`. It does NOT replace CDN files or edit the manifest — that
  is a separate, deliberate step after visual verification.

## Cleaning standard (verified on 酒楼, 2026-11-18)

Decimate to 60,000 faces, textures to 1024px, bake the manifest scale into
the geometry, Draco export. 26.5 MB → 3.3 MB, shape verified by render.
Per-asset bake scales: 虹桥 1.6, 石拱桥 40, 商楼 12, 酒楼 15, 茶馆 1,
码头 2. After a batch is cleaned, manifest scales go back to 1.

## Render lighting (2026-11-18, matched to 清明上河图原画)

`render2.py`: pale silk world (0.93, 0.88, 0.74, strength 1.1), warm sun 2.2
from the front, cool fill 0.7, pale sandy ground, elevated oblique camera.
Original painting: light silk ground, light ochre, grey tile roofs,
whitewashed walls, light warm timber; colour accents from red lanterns,
signs and figures — no dead-black shadows.

## Security — read before adding a workflow

- This repo is PUBLIC. The runner executes workflow code on the host VM.
- Workflows on this runner must trigger ONLY on `workflow_dispatch`
  (manual). NEVER add `pull_request` / `pull_request_target` triggers:
  a fork PR could then run arbitrary code on the host.
- The runner runs as root (`RUNNER_ALLOW_RUNASROOT=1`) because the sandbox
  forbids `chown`, so a non-root runner user cannot own its files. Only run
  workflow files from `main` that a trusted party reviewed.
- Registration token is single-use, expires in 1 hour, and is never stored.
  Re-register with `~/workspace/runner/register.sh <token>` if the runner
  is ever removed from GitHub.

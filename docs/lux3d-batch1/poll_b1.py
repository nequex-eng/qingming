#!/usr/bin/env python3
"""Poll Batch 1 tasks until terminal; download each succeeded GLB into the repo."""
import json
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import dynamic_credential_entry

SKILL = os.path.expanduser("~/workspace/custom-skills/aholo-lux3d")
TASK_DIR = os.path.expanduser("~/workspace/qingming-assets")
REPO = os.path.expanduser("~/workspace/qingming")
sys.path.insert(0, os.path.join(SKILL, "core", "runtime"))
import lux3d_client

DEST = {
    "stone-arch-bridge": "public/assets/3d/bridges/stone-arch-bridge",
    "riverside-commercial-building": "public/assets/3d/architecture/riverside-commercial-building",
    "restaurant-wine-house": "public/assets/3d/architecture/restaurant-wine-house",
    "teahouse": "public/assets/3d/architecture/teahouse",
    "wharf-dock": "public/assets/3d/architecture/wharf-dock",
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def main():
    with open(os.path.join(TASK_DIR, "tasks-b1.json"), encoding="utf-8") as f:
        tasks = json.load(f)["tasks"]
    surrogate = dynamic_credential_entry("custom.lux3d")["surrogate"]
    pending = dict(tasks)
    results = {}
    for attempt in range(1, 51):
        for item_id, task_id in list(pending.items()):
            task = lux3d_client.get_task(int(task_id), region="cn", api_key=surrogate)
            status = task.get("status")
            print(f"poll {attempt} {item_id} ({task_id}): status={status}", flush=True)
            record_path = os.path.join(TASK_DIR, "logs", f"attempt-b1-{item_id}.json")
            with open(record_path, encoding="utf-8") as f:
                record = json.load(f)
            record["providerStatus"] = status
            record["lastPollAt"] = now_iso()
            if status in (3, 4, 5, 6):
                record["terminalAt"] = now_iso()
                del pending[item_id]
                if status == 3:
                    expected = lux3d_client.generation_result_formats("G1-Turbo", ["glb"])
                    outputs = lux3d_client.parse_task_outputs(task)
                    dest = os.path.join(REPO, DEST[item_id])
                    downloaded = lux3d_client.download_requested_models(outputs, dest, expected)
                    record["status"] = "succeeded"
                    record["downloaded"] = downloaded
                    results[item_id] = {"status": 3, "taskId": task_id, "downloaded": downloaded}
                    print(f"  -> downloaded {downloaded}", flush=True)
                else:
                    record["status"] = "failed"
                    record["failure"] = task
                    results[item_id] = {"status": status, "taskId": task_id}
                    print(f"  -> FAILED status={status}", flush=True)
            with open(record_path, "w", encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False, indent=2)
        if not pending:
            break
        time.sleep(12)
    with open(os.path.join(TASK_DIR, "results-b1.json"), "w", encoding="utf-8") as f:
        json.dump({"results": results, "unfinished": list(pending.keys()), "finishedAt": now_iso()}, f, ensure_ascii=False, indent=2)
    print(json.dumps({"outcome": "done" if not pending else "poll_timeout", "results": results, "unfinished": list(pending.keys())}, ensure_ascii=False))


if __name__ == "__main__":
    main()

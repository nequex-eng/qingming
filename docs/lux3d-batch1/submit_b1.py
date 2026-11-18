#!/usr/bin/env python3
"""Submit Batch 1 creation calls (5 assets) under quote_556192b82a7840dda82e561e01490b3e."""
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import dynamic_credential_entry

SKILL = os.path.expanduser("~/workspace/custom-skills/aholo-lux3d")
TASK_DIR = os.path.expanduser("~/workspace/qingming-assets")
sys.path.insert(0, os.path.join(SKILL, "core", "runtime"))
import lux3d_client

QUOTE_ID = "quote_556192b82a7840dda82e561e01490b3e"
QUOTE_EXPIRES = "2026-11-18T19:15:08.738360019+08:00"
PLAN_VERSION = 2

ITEMS = [
    ("stone-arch-bridge", "bridges"),
    ("riverside-commercial-building", "architecture"),
    ("restaurant-wine-house", "architecture"),
    ("teahouse", "architecture"),
    ("wharf-dock", "architecture"),
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def main():
    with open(os.path.join(TASK_DIR, "items-b1.json"), encoding="utf-8") as f:
        items = json.load(f)
    surrogate = dynamic_credential_entry("custom.lux3d")["surrogate"]
    tasks = {}
    for n, (item_id, _folder) in enumerate(ITEMS, start=1):
        body = items[str(n)]["parameters"]["body"]
        record_path = os.path.join(TASK_DIR, "logs", f"attempt-b1-{item_id}.json")
        record = {
            "itemId": item_id,
            "planStepId": "2",
            "planVersion": PLAN_VERSION,
            "operation": "text-to-3d",
            "modelVersion": body["version"],
            "outputFormats": body["outputFormat"],
            "quoteId": QUOTE_ID,
            "quoteExpiresAt": QUOTE_EXPIRES,
            "status": "pending",
            "submittedAt": now_iso(),
        }
        with open(record_path, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        task_id = lux3d_client.create_text_to_3d_task(
            body["prompt"],
            version=body["version"],
            outputFormat=body["outputFormat"],
            region="cn",
            api_key=surrogate,
            content_id=QUOTE_ID,
        )
        record["providerTaskId"] = task_id
        record["status"] = "submitted"
        record["providerStatus"] = 0
        with open(record_path, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        tasks[item_id] = task_id
        print(f"{item_id}: task {task_id}", flush=True)
    with open(os.path.join(TASK_DIR, "tasks-b1.json"), "w", encoding="utf-8") as f:
        json.dump({"quoteId": QUOTE_ID, "tasks": tasks, "submittedAt": now_iso()}, f, ensure_ascii=False, indent=2)
    print("ALL SUBMITTED")


if __name__ == "__main__":
    main()

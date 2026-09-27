#!/usr/bin/env python3
"""
Sync Agent for Local Docker Appliance Nodes.
Runs as a background daemon on local appliances, checking for cloud connectivity
and synchronizing local records with the cloud database.
"""

import os
import time
import logging
import requests
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sync_agent")

LOCAL_API_URL = os.getenv("LOCAL_API_URL", "http://local_app:8000")
CLOUD_API_URL = os.getenv("CLOUD_API_URL", "https://cloud.app.example.com")
SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL_SECONDS", "30"))
API_TOKEN = os.getenv("OFFLINE_NODE_API_TOKEN", "")


def is_cloud_reachable() -> bool:
    try:
        url = f"{CLOUD_API_URL.rstrip('/')}/health"
        resp = requests.get(url, timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


def run_sync_cycle():
    if not is_cloud_reachable():
        logger.info("Cloud API unreachable. Operating in offline mode...")
        return

    logger.info("Cloud API reachable. Initiating background sync cycle...")
    headers = {}
    if API_TOKEN:
        headers["Authorization"] = f"Bearer {API_TOKEN}"

    # Step 1: Pull local changes via local API
    try:
        local_pull = requests.get(f"{LOCAL_API_URL.rstrip('/')}/api/v1/sync/pull", headers=headers, timeout=10)
        if local_pull.status_code == 200:
            changes = local_pull.json().get("changes", {})
            mutations = []

            # Format local orders as mutations
            for order in changes.get("orders", []):
                if order.get("client_uuid"):
                    mutations.append({
                        "entity": "orders",
                        "action": "DELETE" if order.get("is_deleted") else "UPDATE",
                        "client_uuid": order["client_uuid"],
                        "client_updated_at": order.get("client_updated_at") or datetime.now(timezone.utc).isoformat(),
                        "payload": order
                    })

            # Format local invoices as mutations
            for inv in changes.get("invoices", []):
                if inv.get("client_uuid"):
                    mutations.append({
                        "entity": "invoices",
                        "action": "DELETE" if inv.get("is_deleted") else "UPDATE",
                        "client_uuid": inv["client_uuid"],
                        "client_updated_at": inv.get("client_updated_at") or datetime.now(timezone.utc).isoformat(),
                        "payload": inv
                    })

            if mutations:
                logger.info("Pushing %d local mutations to Cloud API...", len(mutations))
                push_resp = requests.post(
                    f"{CLOUD_API_URL.rstrip('/')}/api/v1/sync/push",
                    json={"mutations": mutations},
                    headers=headers,
                    timeout=15
                )
                if push_resp.status_code == 200:
                    logger.info("Push sync successful: %s", push_resp.json())

            # Step 2: Pull cloud updates to local
            cloud_pull = requests.get(f"{CLOUD_API_URL.rstrip('/')}/api/v1/sync/pull", headers=headers, timeout=10)
            if cloud_pull.status_code == 200:
                cloud_changes = cloud_pull.json().get("changes", {})
                logger.info("Cloud pull retrieved updates for sync.")
    except Exception as e:
        logger.error("Error during sync cycle execution: %s", e)


def main():
    logger.info("Starting Local Appliance Sync Agent daemon...")
    while True:
        try:
            run_sync_cycle()
        except Exception as e:
            logger.error("Sync agent loop error: %s", e)
        time.sleep(SYNC_INTERVAL)


if __name__ == "__main__":
    main()

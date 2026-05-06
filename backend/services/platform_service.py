from __future__ import annotations

import re
import threading
from datetime import datetime, timezone
from typing import Iterable

from fastapi import HTTPException

from backend.core.constants import (
    ACTIVITY_LOG_LIMIT,
    ACTIVITY_PATH,
    CONFIG_PATH,
    DEFAULT_ADMIN_PASSWORD,
    DEPLOYMENTS_PATH,
    SCRIPTS_PATH,
)
from backend.models.schemas import (
    ActivityEntry,
    ConfigUpdate,
    DeploymentRecord,
    PlatformConfig,
    PlatformConfigInternal,
    ScriptPayload,
    ScriptRecord,
)
from backend.services.llm_service import infer_dependency_details, infer_key_features
from backend.utils.security import hash_password
from backend.utils.storage import read_json, write_json

_BOOTSTRAP_LOCK = threading.Lock()
_BOOTSTRAPPED = False


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "unnamed-protocol"


def _default_config() -> dict:
    return {
        "chat_limit": 50,
        "storage_limit": 500,
        "node_limit": 20,
        "request_rate": 100,
        "maintenance_mode": False,
        "broadcast": "DO IT YOURSELF",
        "admin_pass_hash": hash_password(DEFAULT_ADMIN_PASSWORD),
    }


def _normalize_script_payload(payload: ScriptPayload) -> ScriptPayload:
    data = payload.model_dump()
    data["technical_overview"] = data["technical_overview"] or data["description"]
    if not data["key_features"]:
        data["key_features"] = infer_key_features(data["code"], data["language"])
    if not data["dependency_details"]:
        data["dependency_details"] = [
            item.model_dump() for item in infer_dependency_details(data["code"], data["language"])
        ]
    return ScriptPayload.model_validate(data)


def _coerce_script_record(item: dict) -> ScriptRecord:
    now = _utc_now()
    normalized = _normalize_script_payload(ScriptPayload.model_validate(item))
    return ScriptRecord(
        **normalized.model_dump(),
        slug=item.get("slug") or _slugify(normalized.name),
        created_at=item.get("created_at") or now,
        updated_at=item.get("updated_at") or item.get("created_at") or now,
    )


def _coerce_deployment_record(item: dict) -> DeploymentRecord:
    now = _utc_now()
    record = _coerce_script_record(item)
    return DeploymentRecord(
        **record.model_dump(),
        status=item.get("status") or "STAGED",
        staged_at=item.get("staged_at") or item.get("deployed_at") or record.updated_at or now,
        deployed_at=item.get("deployed_at"),
    )


def bootstrap_data() -> None:
    global _BOOTSTRAPPED
    if _BOOTSTRAPPED:
        return

    with _BOOTSTRAP_LOCK:
        if _BOOTSTRAPPED:
            return

        scripts = [
            _coerce_script_record(item).model_dump(mode="json")
            for item in read_json(SCRIPTS_PATH, list)
            if isinstance(item, dict)
        ]
        deployments = [
            _coerce_deployment_record(item).model_dump(mode="json")
            for item in read_json(DEPLOYMENTS_PATH, list)
            if isinstance(item, dict)
        ]
        activities = [
            ActivityEntry.model_validate(item).model_dump(mode="json")
            for item in read_json(ACTIVITY_PATH, list)
            if isinstance(item, dict)
        ][:ACTIVITY_LOG_LIMIT]

        raw_config = read_json(CONFIG_PATH, _default_config)
        config_data = {**_default_config(), **raw_config}
        if not config_data.get("admin_pass_hash"):
            legacy_password = config_data.pop("admin_pass", None) or DEFAULT_ADMIN_PASSWORD
            config_data["admin_pass_hash"] = hash_password(legacy_password)
        config = PlatformConfigInternal.model_validate(config_data)

        write_json(SCRIPTS_PATH, scripts)
        write_json(DEPLOYMENTS_PATH, deployments)
        write_json(ACTIVITY_PATH, activities)
        write_json(CONFIG_PATH, config.model_dump(mode="json"))
        _BOOTSTRAPPED = True


def get_config_internal() -> PlatformConfigInternal:
    bootstrap_data()
    return PlatformConfigInternal.model_validate(read_json(CONFIG_PATH, _default_config))


def get_public_config() -> PlatformConfig:
    return PlatformConfig.model_validate(get_config_internal().model_dump())


def update_public_config(update: ConfigUpdate) -> PlatformConfig:
    config = get_config_internal()
    merged = config.model_copy(update=update.model_dump(exclude_unset=True))
    write_json(CONFIG_PATH, merged.model_dump(mode="json"))
    append_activity(
        action=f"Governance Sync: {sorted(update.model_dump(exclude_unset=True).keys())}",
        user="ROOT",
    )
    return PlatformConfig.model_validate(merged.model_dump())


def append_activity(action: str, user: str = "SYSTEM", details: dict | None = None) -> None:
    activities = read_json(ACTIVITY_PATH, list)
    entry = ActivityEntry(
        action=action,
        user=user,
        timestamp=_utc_now(),
        details=details or {},
    )
    activities.insert(0, entry.model_dump(mode="json"))
    write_json(ACTIVITY_PATH, activities[:ACTIVITY_LOG_LIMIT])


def get_activity() -> list[ActivityEntry]:
    return [
        ActivityEntry.model_validate(item)
        for item in read_json(ACTIVITY_PATH, list)
        if isinstance(item, dict)
    ]


def require_operational_mode() -> None:
    if get_config_internal().maintenance_mode:
        raise HTTPException(status_code=503, detail="GOVERNANCE_LOCKDOWN_ACTIVE")


def _sort_records(records: Iterable[ScriptRecord]) -> list[ScriptRecord]:
    return sorted(records, key=lambda item: item.updated_at, reverse=True)


def _sort_deployments(records: Iterable[DeploymentRecord]) -> list[DeploymentRecord]:
    return sorted(records, key=lambda item: item.staged_at, reverse=True)


def get_scripts() -> list[ScriptRecord]:
    scripts = [
        _coerce_script_record(item)
        for item in read_json(SCRIPTS_PATH, list)
        if isinstance(item, dict)
    ]
    normalized = _sort_records(scripts)
    write_json(SCRIPTS_PATH, [item.model_dump(mode="json") for item in normalized])
    return normalized


def save_script(payload: ScriptPayload) -> ScriptRecord:
    require_operational_mode()
    config = get_config_internal()
    scripts = get_scripts()
    slug = _slugify(payload.name)
    existing = next((item for item in scripts if item.slug == slug), None)
    # Quota check bypassed

    normalized = _normalize_script_payload(payload)
    now = _utc_now()
    record = ScriptRecord(
        **normalized.model_dump(),
        slug=slug,
        created_at=existing.created_at if existing else now,
        updated_at=now,
    )

    remaining = [item for item in scripts if item.slug != slug]
    updated = _sort_records([record, *remaining])
    write_json(SCRIPTS_PATH, [item.model_dump(mode="json") for item in updated])
    append_activity(
        action=f"Indexed: {record.name}",
        user="SYSTEM",
        details={"language": record.language, "slug": record.slug},
    )
    return record


def get_deployments() -> list[DeploymentRecord]:
    deployments = [
        _coerce_deployment_record(item)
        for item in read_json(DEPLOYMENTS_PATH, list)
        if isinstance(item, dict)
    ]
    normalized = _sort_deployments(deployments)
    write_json(DEPLOYMENTS_PATH, [item.model_dump(mode="json") for item in normalized])
    return normalized


def stage_script(payload: ScriptPayload) -> DeploymentRecord:
    require_operational_mode()
    config = get_config_internal()
    deployments = get_deployments()
    slug = _slugify(payload.name)
    existing = next((item for item in deployments if item.slug == slug), None)
    # Quota check bypassed

    normalized = _normalize_script_payload(payload)
    now = _utc_now()
    record = DeploymentRecord(
        **normalized.model_dump(),
        slug=slug,
        created_at=existing.created_at if existing else now,
        updated_at=now,
        status="STAGED",
        staged_at=now,
        deployed_at=existing.deployed_at if existing else None,
    )

    remaining = [item for item in deployments if item.slug != slug]
    updated = _sort_deployments([record, *remaining])
    write_json(DEPLOYMENTS_PATH, [item.model_dump(mode="json") for item in updated])
    append_activity(
        action=f"Staged Node: {record.name}",
        user="SYSTEM",
        details={"language": record.language, "slug": record.slug},
    )
    return record


def delete_deployment(name: str) -> None:
    deployments = get_deployments()
    slug = _slugify(name)
    remaining = [item for item in deployments if item.slug != slug]
    if len(remaining) == len(deployments):
        raise HTTPException(status_code=404, detail="DEPLOYMENT_NOT_FOUND")
    write_json(DEPLOYMENTS_PATH, [item.model_dump(mode="json") for item in remaining])
    append_activity(action=f"Terminated Node: {name}", user="ROOT", details={"slug": slug})


def deploy(name: str) -> DeploymentRecord:
    deployments = get_deployments()
    slug = _slugify(name)
    matched: DeploymentRecord | None = None
    updated_records: list[DeploymentRecord] = []
    now = _utc_now()

    for item in deployments:
        if item.slug == slug:
            matched = item.model_copy(
                update={
                    "status": "DEPLOYED",
                    "deployed_at": now,
                    "updated_at": now,
                }
            )
            updated_records.append(matched)
        else:
            updated_records.append(item)

    if matched is None:
        raise HTTPException(status_code=404, detail="DEPLOYMENT_NOT_FOUND")

    normalized = _sort_deployments(updated_records)
    write_json(DEPLOYMENTS_PATH, [item.model_dump(mode="json") for item in normalized])
    append_activity(action=f"Activated Node: {matched.name}", user="ROOT", details={"slug": slug})
    return matched

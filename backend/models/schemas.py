from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.core.constants import SUPPORTED_LANGUAGES


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class DependencyDetail(BaseSchema):
    name: str = Field(min_length=1, max_length=80)
    purpose: str = Field(min_length=1, max_length=240)


class ActivityEntry(BaseSchema):
    action: str = Field(min_length=1, max_length=240)
    user: str = Field(default="SYSTEM", min_length=1, max_length=60)
    timestamp: str = Field(min_length=1, max_length=80)
    details: dict[str, Any] = Field(default_factory=dict)


class PlatformConfig(BaseSchema):
    chat_limit: int = Field(default=50, ge=1, le=1000000000)
    storage_limit: int = Field(default=500, ge=1, le=1000000000)
    node_limit: int = Field(default=20, ge=1, le=1000000000)
    request_rate: int = Field(default=100, ge=5, le=1000000000)
    maintenance_mode: bool = False
    broadcast: str = Field(default="DO IT YOURSELF", max_length=160)

    @field_validator("broadcast", mode="before")
    @classmethod
    def normalize_broadcast(cls, value: Any) -> str:
        return value or ""


class PlatformConfigInternal(PlatformConfig):
    admin_pass_hash: str = Field(min_length=32, max_length=512)


class ConfigUpdate(BaseSchema):
    chat_limit: int | None = Field(default=None, ge=1, le=1000000000)
    storage_limit: int | None = Field(default=None, ge=1, le=1000000000)
    node_limit: int | None = Field(default=None, ge=1, le=1000000000)
    request_rate: int | None = Field(default=None, ge=5, le=1000000000)
    maintenance_mode: bool | None = None
    broadcast: str | None = Field(default=None, max_length=160)


class ChatMessage(BaseSchema):
    role: str
    text: str


class ChatRequest(BaseSchema):
    prompt: str = Field(min_length=1, max_length=12000)
    history: list[ChatMessage] | None = Field(default=None)
    language: str | None = Field(default=None, max_length=24)
    deployments: list[dict[str, Any]] | None = Field(default=None)


class ChatResponse(BaseSchema):
    response: str


class AnalyzeRequest(BaseSchema):
    code: str = Field(min_length=1, max_length=50000)
    language: str = Field(default="python", min_length=1, max_length=24)

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        language = value.lower()
        if language not in SUPPORTED_LANGUAGES:
            raise ValueError("Unsupported language.")
        return language


class AnalysisResponse(BaseSchema):
    name: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    author: str | None = Field(default=None, max_length=120)
    technical_overview: str | None = Field(default=None, max_length=4000)
    key_features: list[str] = Field(default_factory=list)
    version: str = Field(default="1.0.0", max_length=32)
    dependency_details: list[DependencyDetail] = Field(default_factory=list)
    quality_score: str = Field(default="B", max_length=4)
    risk_level: str = Field(default="LOW", max_length=12)
    language: str | None = Field(default=None, max_length=24)
    classes: list[str] = Field(default_factory=list)

    @field_validator("key_features", mode="before")
    @classmethod
    def normalize_key_features(cls, value: Any) -> list[str]:
        if not value:
            return []
        normalized: list[str] = []
        for item in value:
            text = str(item).strip()
            if text and text not in normalized:
                normalized.append(text[:120])
        return normalized[:8]

    @field_validator("quality_score", mode="before")
    @classmethod
    def normalize_quality_score(cls, value: Any) -> str:
        if not value:
            return "B"
        score = str(value).upper()
        allowed = {"A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"}
        return score if score in allowed else "B"


class ScriptPayload(AnalysisResponse):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=2, max_length=2000)
    author: str = Field(default="UNKNOWN_OPERATOR", min_length=2, max_length=120)
    language: str = Field(default="python", min_length=1, max_length=24)
    code: str = Field(min_length=1, max_length=120000)
    classes: list[str] = Field(default_factory=list)

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        language = value.lower()
        if language not in SUPPORTED_LANGUAGES:
            raise ValueError("Unsupported language.")
        return language


class ScriptRecord(ScriptPayload):
    slug: str = Field(min_length=2, max_length=160)
    created_at: str = Field(min_length=1, max_length=80)
    updated_at: str = Field(min_length=1, max_length=80)


class DeploymentRecord(ScriptRecord):
    status: str = Field(default="STAGED", min_length=1, max_length=24)
    staged_at: str = Field(min_length=1, max_length=80)
    deployed_at: str | None = Field(default=None, max_length=80)


class ScriptsResponse(BaseSchema):
    scripts: list[ScriptRecord] = Field(default_factory=list)


class DeploymentsResponse(BaseSchema):
    deployments: list[DeploymentRecord] = Field(default_factory=list)


class ActivityFeedResponse(BaseSchema):
    activity: list[ActivityEntry] = Field(default_factory=list)


class StatusResponse(BaseSchema):
    status: str


class LanguagesResponse(BaseSchema):
    languages: list[str] = Field(default_factory=lambda: list(SUPPORTED_LANGUAGES))


class AdminLoginRequest(BaseSchema):
    password: str = Field(min_length=4, max_length=128)


class AdminLoginResponse(BaseSchema):
    status: str
    token: str
    expires_at: str


class SandboxRequest(BaseSchema):
    code: str = Field(min_length=1, max_length=20000)


class SandboxResponse(BaseSchema):
    output: str


class TerminalCommandRequest(BaseSchema):
    command: str = Field(min_length=1, max_length=200)


class TerminalOutputResponse(BaseSchema):
    output: str


class HealthResponse(BaseSchema):
    cpu_usage: int = Field(ge=0, le=100)
    memory_usage: int = Field(ge=0)
    active_threads: int = Field(ge=0)
    disk_io: int = Field(ge=0)
    network_latency: int = Field(ge=0)
    uptime_seconds: int = Field(ge=0)
    ollama_status: str = Field(default="unknown", max_length=24)

class ModelAnalyzeRequest(BaseSchema):
    filename: str = Field(min_length=1, max_length=256)

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from backend.core.constants import ADMIN_TOKEN_TTL_SECONDS, SUPPORTED_LANGUAGES
from backend.models.schemas import (
    ActivityFeedResponse,
    AdminLoginRequest,
    AdminLoginResponse,
    AnalysisResponse,
    AnalyzeRequest,
    ChatRequest,
    ChatResponse,
    ConfigUpdate,
    DeploymentsResponse,
    HealthResponse,
    LanguagesResponse,
    ModelAnalyzeRequest,
    PlatformConfig,
    SandboxRequest,
    SandboxResponse,
    ScriptPayload,
    ScriptsResponse,
    StatusResponse,
    TerminalCommandRequest,
    TerminalOutputResponse,
)
from backend.services import llm_service, platform_service, system_service
from backend.utils.rate_limit import SlidingWindowRateLimiter
from backend.utils.security import issue_token, verify_password

from backend.core.constants import ADMIN_TOKEN_TTL_SECONDS, SUPPORTED_LANGUAGES, SESSIONS_PATH
from backend.utils.storage import read_json, write_json

router = APIRouter()
rate_limiter = SlidingWindowRateLimiter()

def _load_sessions() -> dict[str, str]:
    return read_json(SESSIONS_PATH, dict)

def _save_sessions(sessions: dict[str, str]) -> None:
    write_json(SESSIONS_PATH, sessions)

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

def _resolve_token(
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> str | None:
    if x_admin_token:
        return x_admin_token.strip()
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return None

def _prune_sessions() -> None:
    now = _utc_now()
    sessions = _load_sessions()
    expired = [t for t, expiry in sessions.items() if datetime.fromisoformat(expiry) <= now]
    if expired:
        for t in expired:
            sessions.pop(t, None)
        _save_sessions(sessions)

def enforce_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    config = platform_service.get_public_config()
    limit = config.request_rate or 100
    
    retry_after = rate_limiter.check(client_ip, limit)
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"RATE_LIMIT_EXCEEDED: Retry in {retry_after}s",
            headers={"Retry-After": str(retry_after)}
        )

def require_admin(token: str | None = Depends(_resolve_token)) -> str:
    _prune_sessions()
    sessions = _load_sessions()
    if not token or token not in sessions:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="DENIED")
    return token


@router.get("/config", response_model=PlatformConfig, dependencies=[Depends(enforce_rate_limit)])
async def get_config() -> PlatformConfig:
    return platform_service.get_public_config()


@router.post(
    "/config",
    response_model=StatusResponse,
    dependencies=[Depends(enforce_rate_limit), Depends(require_admin)],
)
async def update_config(config: ConfigUpdate) -> StatusResponse:
    platform_service.update_public_config(config)
    return StatusResponse(status="updated")


@router.get("/languages", response_model=LanguagesResponse, dependencies=[Depends(enforce_rate_limit)])
async def get_languages() -> LanguagesResponse:
    return LanguagesResponse(languages=list(SUPPORTED_LANGUAGES))


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(enforce_rate_limit)])
async def chat(payload: ChatRequest) -> ChatResponse:
    platform_service.require_operational_mode()
    content = llm_service.generate_chat_response(payload.prompt, payload.history)
    return ChatResponse(response=content)


@router.get("/models", dependencies=[Depends(enforce_rate_limit)])
async def get_models():
    return {"models": llm_service.get_available_models()}


@router.post("/models/analyze", response_model=ScriptPayload, dependencies=[Depends(enforce_rate_limit)])
async def analyze_model(payload: ModelAnalyzeRequest) -> ScriptPayload:
    platform_service.require_operational_mode()
    data = llm_service.analyze_model_file(payload.filename)
    return ScriptPayload(**data)


@router.post("/analyze", response_model=AnalysisResponse, dependencies=[Depends(enforce_rate_limit)])
async def analyze_code(payload: AnalyzeRequest) -> AnalysisResponse:
    platform_service.require_operational_mode()
    return llm_service.analyze_code(payload.code, payload.language)


@router.get("/scripts", response_model=ScriptsResponse, dependencies=[Depends(enforce_rate_limit)])
async def get_scripts() -> ScriptsResponse:
    return ScriptsResponse(scripts=platform_service.get_scripts())


@router.post("/scripts", response_model=StatusResponse, dependencies=[Depends(enforce_rate_limit)])
async def create_script(script: ScriptPayload) -> StatusResponse:
    platform_service.save_script(script)
    return StatusResponse(status="indexed")


@router.post("/stage", response_model=StatusResponse, dependencies=[Depends(enforce_rate_limit)])
async def stage_script(script: ScriptPayload) -> StatusResponse:
    platform_service.stage_script(script)
    return StatusResponse(status="staged")


@router.get("/deployments", response_model=DeploymentsResponse, dependencies=[Depends(enforce_rate_limit)])
async def get_deployments() -> DeploymentsResponse:
    return DeploymentsResponse(deployments=platform_service.get_deployments())


@router.delete(
    "/deployments/{name}",
    response_model=StatusResponse,
    dependencies=[Depends(enforce_rate_limit), Depends(require_admin)],
)
async def delete_deployment(name: str) -> StatusResponse:
    platform_service.delete_deployment(name)
    return StatusResponse(status="deleted")


@router.post(
    "/deployments/{name}/deploy",
    response_model=StatusResponse,
    dependencies=[Depends(enforce_rate_limit), Depends(require_admin)],
)
async def trigger_deployment(name: str) -> StatusResponse:
    platform_service.deploy(name)
    return StatusResponse(status="success")


@router.get(
    "/admin/activity",
    response_model=ActivityFeedResponse,
    dependencies=[Depends(enforce_rate_limit), Depends(require_admin)],
)
async def get_activity() -> ActivityFeedResponse:
    return ActivityFeedResponse(activity=platform_service.get_activity())


@router.post(
    "/admin/sandbox",
    response_model=SandboxResponse,
    dependencies=[Depends(enforce_rate_limit), Depends(require_admin)],
)
async def sandbox_test(payload: SandboxRequest) -> SandboxResponse:
    output = llm_service.sandbox_simulation(payload.code)
    platform_service.append_activity("Sandbox Simulation", "ROOT")
    return SandboxResponse(output=output)


login_rate_limiter = SlidingWindowRateLimiter(window_seconds=300) # 5 minute window

@router.post("/admin/login", response_model=AdminLoginResponse, dependencies=[Depends(enforce_rate_limit)])
async def admin_login(request: Request, payload: AdminLoginRequest) -> AdminLoginResponse:
    client_ip = request.client.host if request.client else "unknown"
    # Strict brute-force check: 5 attempts per 5 minutes
    retry_after = login_rate_limiter.check(f"login:{client_ip}", 5)
    if retry_after:
        raise HTTPException(status_code=429, detail=f"BRUTE_FORCE_PROTECTION: Retry in {retry_after}s")

    config = platform_service.get_config_internal()
    if not verify_password(payload.password, config.admin_pass_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="DENIED")

    token = issue_token()
    expires_at = _utc_now() + timedelta(seconds=ADMIN_TOKEN_TTL_SECONDS)
    
    sessions = _load_sessions()
    sessions[token] = expires_at.isoformat()
    _save_sessions(sessions)
    
    platform_service.append_activity("Admin Login", "ROOT")
    return AdminLoginResponse(
        status="authenticated",
        token=token,
        expires_at=expires_at.isoformat(),
    )


@router.get(
    "/admin/system/health",
    response_model=HealthResponse,
    dependencies=[Depends(enforce_rate_limit), Depends(require_admin)],
)
async def get_system_health() -> HealthResponse:
    return system_service.get_system_health()


@router.post(
    "/admin/terminal",
    response_model=TerminalOutputResponse,
    dependencies=[Depends(enforce_rate_limit), Depends(require_admin)],
)
async def terminal_exec(payload: TerminalCommandRequest) -> TerminalOutputResponse:
    command = payload.command.strip()
    platform_service.append_activity("Terminal Exec", "ROOT", details={"command": command})
    try:
        output = system_service.execute_admin_command(command)
    except ValueError as exc:
        output = f"ERROR: {exc}"
    return TerminalOutputResponse(output=output)

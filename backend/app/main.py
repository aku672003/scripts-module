from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse

from backend.core.constants import DEFAULT_OLLAMA_MODEL, FRONTEND_DIST_DIR
from backend.routers import script_router
from backend.services import platform_service, forge_service

logger = logging.getLogger(__name__)

app = FastAPI(title="GHOST_SHELL API", version="5.0.0")

platform_service.bootstrap_data()

app.add_middleware(GZipMiddleware, minimum_size=512)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Token"],
)

app.include_router(script_router.router, prefix="/api/v1")

@app.post("/api/forge")
async def forge_model(request: Request):
    form = await request.form()
    file = form.get("file")
    if not file:
        return JSONResponse({"error": "No file uploaded"}, status_code=400)
    
    # Save temp file
    temp_path = Path("temp_model.pt")
    with open(temp_path, "wb") as f:
        f.write(await file.read())
        
    # Run the user's script logic
    result = await forge_service.run_forge_script(str(temp_path))
    return JSONResponse(result)


@app.middleware("http")
async def attach_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http: https: ws: wss:;"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Hide server version for security
    if "Server" in response.headers:
        del response.headers["Server"]
    return response


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return _serve_frontend_or_status("/")


@app.get("/healthz")
async def healthz():
    config = platform_service.get_public_config()
    return {
        "status": "ok",
        "service": "GHOST_SHELL API",
        "version": "5.0.0",
        "maintenance_mode": config.maintenance_mode,
        "model": DEFAULT_OLLAMA_MODEL,
        "frontend_built": (FRONTEND_DIST_DIR / "index.html").exists(),
    }


def _status_payload():
    config = platform_service.get_public_config()
    return {
        "status": "GHOST_SHELL_CORE_ACTIVE",
        "version": "5.0.0",
        "maintenance_mode": config.maintenance_mode,
        "model": DEFAULT_OLLAMA_MODEL,
        "frontend_built": False,
        "message": "Frontend bundle not found. Run the frontend build or use ./run.sh.",
    }


def _serve_frontend_or_status(request_path: str):
    index_path = FRONTEND_DIST_DIR / "index.html"
    if not index_path.exists():
        return JSONResponse(_status_payload())

    if request_path in {"", "/"}:
        return FileResponse(index_path)

    normalized = request_path.lstrip("/")
    candidate = (FRONTEND_DIST_DIR / normalized).resolve()
    try:
        candidate.relative_to(FRONTEND_DIST_DIR.resolve())
    except ValueError:
        return FileResponse(index_path)

    if candidate.is_file():
        return FileResponse(candidate)

    if Path(normalized).suffix:
        return JSONResponse({"detail": "Asset not found."}, status_code=404)

    return FileResponse(index_path)


@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
async def frontend_routes(full_path: str):
    return _serve_frontend_or_status(full_path)

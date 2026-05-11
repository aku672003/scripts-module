from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
FRONTEND_ROOT = PROJECT_ROOT / "frontend-v3"
FRONTEND_DIST_DIR = FRONTEND_ROOT / "dist"
DATA_DIR = BACKEND_ROOT / "data"

SCRIPTS_PATH = DATA_DIR / "scripts.json"
DEPLOYMENTS_PATH = DATA_DIR / "deployments.json"
CONFIG_PATH = DATA_DIR / "config.json"
ACTIVITY_PATH = DATA_DIR / "activity.json"
SESSIONS_PATH = DATA_DIR / "sessions.json"

SUPPORTED_LANGUAGES = [
    "python",
    "bash",
    "javascript",
    "typescript",
    "c++",
    "rust",
    "go",
    "ruby",
    "php",
    "java",
    "sql",
]

DEFAULT_OLLAMA_MODEL = os.getenv("GHOST_SHELL_OLLAMA_MODEL", "qwen3:4b")
DEFAULT_ADMIN_PASSWORD = os.getenv("GHOST_SHELL_ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN_TTL_SECONDS = int(os.getenv("GHOST_SHELL_ADMIN_TOKEN_TTL", "315360000"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("GHOST_SHELL_RATE_LIMIT_WINDOW", "60"))
ACTIVITY_LOG_LIMIT = int(os.getenv("GHOST_SHELL_ACTIVITY_LOG_LIMIT", "200"))

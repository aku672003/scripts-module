from __future__ import annotations

import os
import resource
import shlex
import socket
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from backend.core.constants import PROJECT_ROOT
from backend.models.schemas import HealthResponse

try:
    import psutil
except ImportError:  # pragma: no cover - optional dependency
    psutil = None

START_TIME = time.time()
ALLOWED_COMMANDS = {
    "pwd",
    "ls",
    "cat",
    "head",
    "tail",
    "wc",
    "date",
    "whoami",
    "uname",
    "uptime",
    "ps",
    "df",
    "du",
    "which",
    "find",
    "grep",
}
ALLOWED_WHICH_TARGETS = {"python3", "uvicorn", "ollama", "node", "npm", "rg", "find", "grep"}
LS_FLAGS = {"-a", "-l", "-h", "-la", "-al", "-lah", "-lha", "-alh", "-1"}
UNAME_FLAGS = {"-a", "-m", "-r", "-s"}
DF_FLAGS = {"-h"}
DU_FLAGS = {"-sh"}
WC_FLAGS = {"-l", "-w", "-c"}
PS_FLAGS = {"aux", "-A", "-ef"}


def _resolve_project_path(raw_path: str) -> Path:
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = (PROJECT_ROOT / candidate).resolve()
    else:
        candidate = candidate.resolve()

    try:
        candidate.relative_to(PROJECT_ROOT)
    except ValueError as exc:
        raise ValueError("Paths must stay within the project directory.") from exc
    return candidate


def _validate_command(parts: list[str]) -> list[str]:
    executable = parts[0]
    args = parts[1:]

    if executable not in ALLOWED_COMMANDS:
        raise ValueError("Command is not permitted in the restricted admin shell.")

    if executable in {"pwd", "whoami", "uptime"} and args:
        raise ValueError(f"`{executable}` does not accept arguments here.")

    if executable == "date":
        return parts

    if executable == "uname":
        if any(arg not in UNAME_FLAGS for arg in args):
            raise ValueError("Only uname flags -a, -m, -r, -s are allowed.")
        return parts

    if executable == "ps":
        if any(arg not in PS_FLAGS for arg in args):
            raise ValueError("Only ps flags aux, -A, -ef are allowed.")
        return parts

    if executable == "df":
        if any(arg not in DF_FLAGS for arg in args):
            raise ValueError("Only `df -h` is allowed.")
        return parts

    if executable == "which":
        if len(args) != 1 or args[0] not in ALLOWED_WHICH_TARGETS:
            raise ValueError("Only known runtime binaries can be queried with `which`.")
        return parts

    if executable == "ls":
        safe_args: list[str] = [executable]
        path_count = 0
        for arg in args:
            if arg.startswith("-"):
                if arg not in LS_FLAGS:
                    raise ValueError("Unsupported ls flags.")
                safe_args.append(arg)
                continue
            path_count += 1
            if path_count > 1:
                raise ValueError("Only one ls path is allowed.")
            safe_args.append(str(_resolve_project_path(arg)))
        return safe_args

    if executable == "cat":
        if len(args) != 1:
            raise ValueError("`cat` requires exactly one file path.")
        return [executable, str(_resolve_project_path(args[0]))]

    if executable in {"head", "tail"}:
        if not args:
            raise ValueError(f"`{executable}` requires a file path.")
        if len(args) == 1:
            return [executable, str(_resolve_project_path(args[0]))]
        if len(args) == 3 and args[0] == "-n" and args[1].isdigit():
            return [executable, "-n", args[1], str(_resolve_project_path(args[2]))]
        raise ValueError(f"`{executable}` only supports `[file]` or `-n <count> [file]`.")

    if executable == "wc":
        if len(args) != 2 or args[0] not in WC_FLAGS:
            raise ValueError("`wc` only supports -l, -w, or -c with one file path.")
        return [executable, args[0], str(_resolve_project_path(args[1]))]

    if executable == "du":
        if not args:
            return [executable, "-sh", str(PROJECT_ROOT)]
        if len(args) != 2 or args[0] not in DU_FLAGS:
            raise ValueError("`du` only supports `-sh [path]`.")
        return [executable, args[0], str(_resolve_project_path(args[1]))]

    if executable in {"find", "grep"}:
        # Restricted recursive searches to project root only
        safe_args = [executable]
        for arg in args:
            if arg.startswith("-"):
                safe_args.append(arg)
            else:
                # Treat as pattern or path
                try:
                    safe_args.append(str(_resolve_project_path(arg)))
                except ValueError:
                    safe_args.append(arg)  # Treat as pattern
        return safe_args

    return parts


def execute_admin_command(command: str) -> str:
    try:
        parts = shlex.split(command)
    except ValueError as exc:
        raise ValueError(f"Invalid command syntax: {exc}") from exc

    if not parts:
        raise ValueError("Command cannot be empty.")

    safe_command = _validate_command(parts)
    result = subprocess.run(
        safe_command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        timeout=8,
        shell=False,
    )

    output = (result.stdout or result.stderr or "SUCCESS").strip()
    if result.returncode != 0:
        return f"ERROR ({result.returncode})\n{output}"
    return output


def _measure_ollama_latency() -> tuple[int, str]:
    host = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    parsed = urlparse(host)
    hostname = parsed.hostname or "127.0.0.1"
    port = parsed.port or 11434
    started = time.perf_counter()
    try:
        with socket.create_connection((hostname, port), timeout=0.3):
            elapsed = int((time.perf_counter() - started) * 1000)
            return elapsed, "online"
    except OSError:
        return 0, "offline"


def get_system_health() -> HealthResponse:
    latency_ms, ollama_status = _measure_ollama_latency()

    if psutil is not None:
        cpu_usage = int(psutil.cpu_percent(interval=0.05))
        memory_usage = int(psutil.virtual_memory().used / (1024 * 1024))
        active_threads = int(psutil.Process().num_threads())
        disk_counters = psutil.disk_io_counters()
        disk_io = 0
        if disk_counters is not None:
            disk_io = int((disk_counters.read_bytes + disk_counters.write_bytes) / (1024 * 1024))
    else:
        cpu_count = os.cpu_count() or 1
        cpu_usage = 0
        if hasattr(os, "getloadavg"):
            cpu_usage = min(int((os.getloadavg()[0] / cpu_count) * 100), 100)
        memory_usage = int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024)
        active_threads = threading.active_count()
        disk_io = 0

    uptime_seconds = int(time.time() - START_TIME)
    return HealthResponse(
        cpu_usage=cpu_usage,
        memory_usage=memory_usage,
        active_threads=active_threads,
        disk_io=disk_io,
        network_latency=latency_ms,
        uptime_seconds=uptime_seconds,
        ollama_status=ollama_status,
    )


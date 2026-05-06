from __future__ import annotations

import json
import os
import threading
import tempfile
from pathlib import Path
from typing import Any, Callable

_LOCKS: dict[Path, threading.RLock] = {}
_LOCKS_GUARD = threading.Lock()


def _get_lock(path: Path) -> threading.RLock:
    with _LOCKS_GUARD:
        if path not in _LOCKS:
            _LOCKS[path] = threading.RLock()
        return _LOCKS[path]


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default_factory: Callable[[], Any]) -> Any:
    ensure_parent(path)
    lock = _get_lock(path)
    with lock:
        if not path.exists():
            return default_factory()
        try:
            with path.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except (json.JSONDecodeError, OSError):
            return default_factory()


def write_json(path: Path, data: Any) -> None:
    ensure_parent(path)
    lock = _get_lock(path)
    with lock:
        temp_fd, temp_name = tempfile.mkstemp(
            prefix=f"{path.name}.",
            suffix=".tmp",
            dir=path.parent,
        )
        temp_path = Path(temp_name)
        with os.fdopen(temp_fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, ensure_ascii=True)
        temp_path.replace(path)

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from backend.core.constants import RATE_LIMIT_WINDOW_SECONDS


class SlidingWindowRateLimiter:
    def __init__(self, window_seconds: int = RATE_LIMIT_WINDOW_SECONDS) -> None:
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int) -> int | None:
        now = time.time()
        with self._lock:
            bucket = self._events[key]
            while bucket and now - bucket[0] > self.window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
                return retry_after
            bucket.append(now)
        return None


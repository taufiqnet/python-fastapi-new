"""
cPanel hang diagnostic.

Run inside the cPanel virtualenv from the application root:
    python cpanel_diag.py

It calls the same `application` object Passenger uses, but WITHOUT Passenger.
- If every step prints OK  -> the app is fine; the problem is Passenger/hosting.
- If a step hangs          -> after 25s all thread stack traces are printed,
                              showing exactly where it is stuck.
"""
import asyncio
import faulthandler
import io
import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)

HANG_SECONDS = 25


def step(name):
    print(f"\n=== {name}", flush=True)
    faulthandler.cancel_dump_traceback_later()
    faulthandler.dump_traceback_later(HANG_SECONDS, exit=True)
    return time.time()


def ok(t0, extra=""):
    print(f"    OK ({time.time() - t0:.2f}s) {extra}", flush=True)


# 1. Settings ---------------------------------------------------------------
t = step("1. Load settings")
from sqlalchemy.engine import make_url  # noqa: E402
from app.core.config import settings  # noqa: E402
u = make_url(settings.database_url)
ok(t, f"host={u.host!r} port={u.port} db={u.database} user={u.username}")

# 2. Sync DB (psycopg2) -------------------------------------------------------
t = step("2. Sync DB connect (psycopg2)")
from sqlalchemy import text  # noqa: E402
from app.database import engine, async_engine  # noqa: E402
with engine.connect() as c:
    c.execute(text("select 1"))
ok(t)

# 3. Async DB (asyncpg) -------------------------------------------------------
t = step("3. Async DB connect (asyncpg)")


async def _async_check():
    async with async_engine.connect() as c:
        await c.execute(text("select 1"))
    await async_engine.dispose()

asyncio.run(_async_check())
ok(t)

# 4. Tables present? ----------------------------------------------------------
t = step("4. Count tables in public schema")
with engine.connect() as c:
    n = c.execute(text(
        "select count(*) from information_schema.tables where table_schema='public'"
    )).scalar()
ok(t, f"tables={n}" + ("  <-- EMPTY: startup/create_all never ran!" if not n else ""))

# 5. Import WSGI entry -------------------------------------------------------
t = step("5. Import passenger_wsgi.application")
from passenger_wsgi import application  # noqa: E402
ok(t)


# 6. Requests through the WSGI app -------------------------------------------
def wsgi_get(path, accept="text/html"):
    environ = {
        "REQUEST_METHOD": "GET",
        "SCRIPT_NAME": "",
        "PATH_INFO": path,
        "QUERY_STRING": "",
        "SERVER_NAME": "localhost",
        "SERVER_PORT": "443",
        "SERVER_PROTOCOL": "HTTP/1.1",
        "REMOTE_ADDR": "127.0.0.1",
        "HTTP_HOST": "app.wbsoftbd.com",
        "HTTP_ACCEPT": accept,
        "CONTENT_LENGTH": "0",
        "wsgi.version": (1, 0),
        "wsgi.url_scheme": "https",
        "wsgi.input": io.BytesIO(b""),
        "wsgi.errors": sys.stderr,
        "wsgi.multithread": True,
        "wsgi.multiprocess": True,
        "wsgi.run_once": False,
    }
    status = {}

    def start_response(s, headers, exc_info=None):
        status["s"] = s
        status["h"] = dict(headers)

    body = b"".join(application(environ, start_response))
    return status.get("s"), status.get("h", {}), body


for i, (path, accept) in enumerate([
    ("/health", "application/json"),
    ("/auth/login", "text/html"),
    ("/", "text/html"),
], start=6):
    t = step(f"{i}. GET {path}")
    s, h, body = wsgi_get(path, accept)
    ok(t, f"status={s} location={h.get('location', '-')} bytes={len(body)}")
    if s and not s.startswith(("2", "3")):
        print("    body:", body[:500].decode("utf-8", "replace"))

faulthandler.cancel_dump_traceback_later()
print("\nALL STEPS PASSED - app works outside Passenger.", flush=True)
os._exit(0)

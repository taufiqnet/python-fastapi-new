import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

logging.basicConfig(
    filename=os.path.join(BASE_DIR, "passenger_app.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("passenger_wsgi")

# Hang debugging: `kill -USR1 <pid>` dumps every thread's stack to this file
import faulthandler  # noqa: E402
import signal  # noqa: E402
import time  # noqa: E402

_stack_file = open(os.path.join(BASE_DIR, "stack_dump.log"), "a")
try:
    faulthandler.register(signal.SIGUSR1, file=_stack_file, all_threads=True)
except (AttributeError, ValueError):
    pass

try:
    import asyncio
    import threading

    from a2wsgi import ASGIMiddleware
    from app.main import app
    from app.database import async_engine, engine

    # Passenger never sends ASGI lifespan events -> run startup (create_all + seed) manually
    async def _run_startup_handlers():
        for handler in app.router.on_startup:
            result = handler()
            if asyncio.iscoroutine(result):
                await result
        await async_engine.dispose()

    asyncio.run(_run_startup_handlers())
    engine.dispose()  # close sync pool before LiteSpeed forks worker processes
    log.info("Startup handlers finished (pid=%s)", os.getpid())

    # a2wsgi bridge, created lazily per worker process (see _get_wsgi_handler)
    wsgi_handler = None
    wsgi_handler_pid = None
    _handler_lock = threading.Lock()

    def _get_wsgi_handler():
        # LiteSpeed (LSAPI) imports this file once, then fork()s workers.
        # a2wsgi runs its event loop in a background thread, and threads do
        # not survive fork() -> requests would hang forever. So build the
        # bridge lazily inside each worker process.
        global wsgi_handler, wsgi_handler_pid
        pid = os.getpid()
        if wsgi_handler is None or wsgi_handler_pid != pid:
            with _handler_lock:
                if wsgi_handler is None or wsgi_handler_pid != pid:
                    engine.dispose(close=False)  # drop sockets inherited from parent
                    wsgi_handler = ASGIMiddleware(app, wait_time=5.0)
                    wsgi_handler_pid = pid
                    log.info("a2wsgi bridge created in worker pid=%s", pid)
        return wsgi_handler

    def application(environ, start_response):
        # cPanel Passenger sets SCRIPT_NAME which causes FastAPI 404s/infinite redirects
        environ["SCRIPT_NAME"] = ""
        path = environ.get("PATH_INFO")
        t0 = time.time()
        log.info("REQ start pid=%s %s %s", os.getpid(), environ.get("REQUEST_METHOD"), path)

        def _start_response(status, headers, exc_info=None):
            log.info("REQ status %s %s (%.2fs)", path, status, time.time() - t0)
            return start_response(status, headers, exc_info)

        result = _get_wsgi_handler()(environ, _start_response)

        def _logged_body():
            sent = 0
            try:
                for chunk in result:
                    sent += len(chunk)
                    yield chunk
            finally:
                log.info("REQ done %s bytes=%s (%.2fs)", path, sent, time.time() - t0)

        return _logged_body()

    log.info("Passenger WSGI app configured successfully (pid=%s).", os.getpid())

except Exception as exc:
    log.exception("Crash initializing WSGI application: %s", exc)

    def application(environ, start_response):
        status = "500 Internal Server Error"
        body = f"Application startup failure: {exc}".encode("utf-8")
        headers = [
            ("Content-Type", "text/plain; charset=utf-8"),
            ("Content-Length", str(len(body)))
        ]
        start_response(status, headers)
        return [body]
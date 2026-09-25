import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

logger = logging.getLogger("app.middleware.error_handler")


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            # Log the full stack trace securely on the server side
            logger.error(
                "Unhandled error during request %s %s: %s\n%s",
                request.method,
                request.url.path,
                str(exc),
                traceback.format_exc(),
            )

            # Return a safe error response without leaking database or code internal details
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "An internal server error occurred. Please try again later.",
                    "status_code": 500,
                },
            )

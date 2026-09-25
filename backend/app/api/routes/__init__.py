from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.documents import router as documents_router

__all__ = ["health_router", "auth_router", "users_router", "documents_router"]

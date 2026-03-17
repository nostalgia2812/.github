import os

from fastapi import Header, HTTPException, status


APP_API_KEY_ENV = "APP_API_KEY"


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    """Require X-API-Key only when APP_API_KEY is configured."""
    expected = os.getenv(APP_API_KEY_ENV)
    if not expected:
        return
    if x_api_key != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

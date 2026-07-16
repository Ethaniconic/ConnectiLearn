import os
import logging
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Load order: root .env first (lowest priority), then server .env (highest priority)
# This ensures server-specific keys always win.
root_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
server_env = os.path.join(os.path.dirname(__file__), ".env")

load_dotenv(root_env)                 # root first, no override
load_dotenv(server_env, override=True)  # server overrides root

class Settings(BaseSettings):
    mongodb_uri: str = os.getenv("MONGODB_URI", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "secret")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    hf_token: str = os.getenv("HF_TOKEN", "")
    port: int = int(os.getenv("PORT", 5000))
    client_url: str = os.getenv("CLIENT_URL", "http://localhost:5173")

    model_config = SettingsConfigDict(
        env_file=server_env,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Debug log to confirm key loaded (safe: only logs key length)
_key = settings.groq_api_key
if _key:
    logger.info(f"[config] GROQ_API_KEY loaded successfully (length={len(_key)})")
else:
    logger.warning("[config] WARNING: GROQ_API_KEY is empty! Check server/.env")

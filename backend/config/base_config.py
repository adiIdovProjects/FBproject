from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Optional, List, Union, Any
import os
import json

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Facebook Ads Analytics API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    DEV_BYPASS_AUTH: bool = False

    @field_validator("DEV_BYPASS_AUTH", mode="before")
    @classmethod
    def strip_and_parse_bool(cls, v: Any) -> Any:
        if isinstance(v, str):
            v_clean = v.strip().lower()
            if v_clean in ("true", "1", "yes", "on"):
                return True
            if v_clean in ("false", "0", "no", "off", ""):
                return False
        return v
    
    # Database Settings
    POSTGRES_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "postgres"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.DB_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Facebook API Settings
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None
    FACEBOOK_ACCESS_TOKEN: Optional[str] = None
    FACEBOOK_AD_ACCOUNT_ID: Optional[str] = None
    FB_REDIRECT_URI: str = "http://localhost:8002/api/v1/auth/facebook/callback"
    
    # Security Settings
    JWT_SECRET_KEY: str = "b4070a2575ed271033235339f40391d4e4125b2d28711e74f85e13298a58711b"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    # CORS Settings
    CORS_ORIGINS: Any = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                try:
                    return json.loads(v)
                except:
                    return [i.strip() for i in v.strip("[]").split(",")]
            return [i.strip() for i in v.split(",")]
        return v

    # OAuth Redirect URLs (different for dashboard vs website)
    FRONTEND_URL: str = "http://localhost:3000"
    GOOGLE_OAUTH_REDIRECT_URL: str = "http://localhost:3000/en/connect"  # Website front with locale
    FACEBOOK_OAUTH_REDIRECT_URL: str = "http://localhost:3000/en/callback"  # OAuth callback handler

    # AI Settings
    GEMINI_API_KEY: Optional[str] = None

    # Email Settings (Resend)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM_ADDRESS: str = "noreply@example.com"
    EMAIL_FROM_NAME: str = "AdManager Pro"
    MAGIC_LINK_EXPIRY_MINUTES: int = 15

    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

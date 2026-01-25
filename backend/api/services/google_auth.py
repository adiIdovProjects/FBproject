import os
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class GoogleAuthService:
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback")

    def get_login_url(self, state: str) -> str:
        """Generate the Google OAuth login URL with minimum required scopes"""
        # Only request email and basic profile - minimum for authentication
        scopes = ['openid', 'email', 'profile']
        scope_str = ' '.join(scopes)
        return (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={self.client_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"response_type=code&"
            f"scope={scope_str}&"
            f"state={state}"
        )

    async def get_access_token(self, code: str) -> Dict[str, Any]:
        """Exchange auth code for access and refresh tokens"""
        url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            token_data = response.json()
            
            # Add expiration timestamp
            expires_in = token_data.get("expires_in")
            if expires_in:
                token_data["expires_at"] = datetime.utcnow() + timedelta(seconds=expires_in)
            
            return token_data

    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get Google user details using the access token"""
        url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()

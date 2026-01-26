import os
import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.user import User as FBUser

logger = logging.getLogger(__name__)

class FacebookAuthService:
    def __init__(self):
        self.app_id = os.getenv("FACEBOOK_APP_ID")
        self.app_secret = os.getenv("FACEBOOK_APP_SECRET")
        self.redirect_uri = os.getenv("FACEBOOK_REDIRECT_URI", "http://localhost:8000/api/v1/auth/facebook/callback")

    def get_login_url(self, state: str) -> str:
        """Generate the Facebook OAuth login URL"""
        scopes = [
            'ads_read',
            'read_insights',
            'ads_management',
            'public_profile',
            'email',
            'pages_show_list',
            'pages_read_engagement',
            'pages_read_user_content',
            'pages_manage_ads',
            'pages_manage_metadata',
            'leads_retrieval',
            'instagram_basic',
        ]
        scope_str = ','.join(scopes)
        return (
            f"https://www.facebook.com/v18.0/dialog/oauth?"
            f"client_id={self.app_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"state={state}&"
            f"scope={scope_str}&"
            f"auth_type=rerequest"
        )

    async def get_access_token(self, code: str) -> Dict[str, Any]:
        """Exchange auth code for a short-lived user access token"""
        url = "https://graph.facebook.com/v18.0/oauth/access_token"
        params = {
            "client_id": self.app_id,
            "redirect_uri": self.redirect_uri,
            "client_secret": self.app_secret,
            "code": code,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    async def get_long_lived_token(self, short_lived_token: str) -> Dict[str, Any]:
        """Exchange short-lived token for a long-lived (60 days) token"""
        url = "https://graph.facebook.com/v18.0/oauth/access_token"
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": self.app_id,
            "client_secret": self.app_secret,
            "fb_exchange_token": short_lived_token,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            # Add calculated expiration
            expires_in = data.get("expires_in")
            if expires_in:
                data["expires_at"] = datetime.utcnow() + timedelta(seconds=expires_in)
            return data

    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get Facebook user details (id, name, email)"""
        FacebookAdsApi.init(access_token=access_token)
        me = FBUser(fbid='me')
        fields = ['id', 'name', 'email']
        user = me.api_get(fields=fields)
        return user.export_all_data()

    def _fetch_pages_for_account_http(self, account_id: str, access_token: str) -> Dict[str, Any]:
        """Fetch promote pages using direct HTTP call for true parallel execution."""
        try:
            import requests
            url = f"https://graph.facebook.com/v24.0/act_{account_id}/promote_pages"
            params = {"access_token": access_token, "fields": "id,name"}
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json().get("data", [])
                if data:
                    return {"page_id": data[0]["id"], "page_name": data[0].get("name")}
        except Exception as e:
            logger.warning(f"Could not fetch pages for account {account_id}: {e}")
        return {"page_id": None, "page_name": None}

    def get_managed_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """List ad accounts reachable by the given user token with page info"""
        FacebookAdsApi.init(access_token=access_token)
        me = FBUser(fbid='me')
        accounts = me.get_ad_accounts(fields=[
            AdAccount.Field.account_id,
            AdAccount.Field.name,
            AdAccount.Field.currency,
        ])

        # Build base account data - consume the iterator fully first
        accounts_list = []
        for account in accounts:
            accounts_list.append({
                "account_id": account[AdAccount.Field.account_id],
                "name": account[AdAccount.Field.name],
                "currency": account[AdAccount.Field.currency],
                "page_id": None,
                "page_name": None
            })

        # Fetch pages for all accounts in parallel using direct HTTP
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_idx = {
                executor.submit(self._fetch_pages_for_account_http, acc["account_id"], access_token): idx
                for idx, acc in enumerate(accounts_list)
            }
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    page_data = future.result()
                    accounts_list[idx]["page_id"] = page_data["page_id"]
                    accounts_list[idx]["page_name"] = page_data["page_name"]
                except Exception as e:
                    logger.warning(f"Failed to get pages for account index {idx}: {e}")

        return accounts_list

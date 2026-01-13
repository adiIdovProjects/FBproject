import os
import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
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
            'pages_manage_ads',
            'pages_manage_metadata'
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

    def get_managed_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """List ad accounts reachable by the given user token with page info"""
        FacebookAdsApi.init(access_token=access_token)
        me = FBUser(fbid='me')
        accounts = me.get_ad_accounts(fields=[
            AdAccount.Field.account_id,
            AdAccount.Field.name,
            AdAccount.Field.currency,
        ])

        results = []
        for account in accounts:
            account_data = {
                "account_id": account[AdAccount.Field.account_id],
                "name": account[AdAccount.Field.name],
                "currency": account[AdAccount.Field.currency],
                "page_id": None,
                "page_name": None
            }

            # Try to fetch the first page associated with this ad account
            try:
                # Get pages that this ad account promotes
                account_obj = AdAccount(f"act_{account[AdAccount.Field.account_id]}")
                pages = account_obj.get_promote_pages(fields=['id', 'name'])

                if pages and len(pages) > 0:
                    # Use the first page as default
                    account_data["page_id"] = pages[0]['id']
                    account_data["page_name"] = pages[0].get('name', None)
            except Exception as e:
                # If we can't fetch pages, just log and continue
                import logging
                logging.warning(f"Could not fetch pages for account {account[AdAccount.Field.account_id]}: {e}")

            results.append(account_data)

        return results

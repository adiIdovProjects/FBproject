"""
Stripe Router - API endpoints for Stripe subscription management.
"""

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session
from backend.api.dependencies import get_db, get_current_user
from backend.api.services.stripe_service import StripeService
from backend.config.base_config import settings

router = APIRouter(
    prefix="/api/v1/stripe",
    tags=["stripe"],
)


@router.post("/create-checkout-session")
async def create_checkout_session(
    plan_type: str = Query(..., description="Plan type: starter, pro, or enterprise"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create a Stripe Checkout session for subscription"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    service = StripeService(db)

    success_url = f"{settings.FRONTEND_URL}/en/settings?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.FRONTEND_URL}/en/settings?cancelled=true"

    try:
        result = service.create_checkout_session(
            current_user, plan_type, success_url, cancel_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhook events (no auth required)"""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhooks not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    service = StripeService(db)

    try:
        result = service.handle_webhook(payload, sig_header)
        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Webhook error")


@router.get("/billing-portal")
async def get_billing_portal(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get Stripe billing portal URL for managing subscription"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    service = StripeService(db)
    return_url = f"{settings.FRONTEND_URL}/en/settings"

    try:
        url = service.get_billing_portal_url(current_user, return_url)
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription")
async def get_subscription_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get current user's subscription status"""
    service = StripeService(db)
    return service.get_subscription_status(current_user.id)

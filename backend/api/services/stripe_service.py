"""
Stripe Service - Handles Stripe integration for subscriptions.
"""

import stripe
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from backend.config.base_config import settings
from backend.api.repositories.subscription_repository import SubscriptionRepository
from backend.api.services.audit_service import AuditService
from backend.models.user_schema import User
from backend.utils.logging_utils import get_logger

logger = get_logger(__name__)


class StripeService:
    def __init__(self, db: Session):
        self.db = db
        self.subscription_repo = SubscriptionRepository(db)

        if settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY

    def _get_price_id(self, plan_type: str) -> Optional[str]:
        """Get Stripe price ID for a plan type"""
        price_map = {
            "starter": settings.STRIPE_PRICE_STARTER,
            "pro": settings.STRIPE_PRICE_PRO,
            "enterprise": settings.STRIPE_PRICE_ENTERPRISE
        }
        return price_map.get(plan_type)

    def create_customer(self, user: User) -> str:
        """Create a Stripe customer for a user"""
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name,
            metadata={"user_id": str(user.id)}
        )
        return customer.id

    def create_checkout_session(
        self,
        user: User,
        plan_type: str,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        """Create a Stripe Checkout session"""
        price_id = self._get_price_id(plan_type)
        if not price_id:
            raise ValueError(f"Invalid plan type: {plan_type}")

        # Get or create subscription record
        subscription = self.subscription_repo.get_or_create_subscription(user.id)

        # Get or create Stripe customer
        customer_id = subscription.stripe_customer_id
        if not customer_id:
            customer_id = self.create_customer(user)
            self.subscription_repo.update_subscription(
                subscription.id,
                stripe_customer_id=customer_id
            )

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(user.id), "plan_type": plan_type}
        )

        return {"url": session.url, "session_id": session.id}

    def get_billing_portal_url(self, user: User, return_url: str) -> str:
        """Get Stripe billing portal URL"""
        subscription = self.subscription_repo.get_subscription_by_user(user.id)
        if not subscription or not subscription.stripe_customer_id:
            raise ValueError("User has no Stripe customer ID")

        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=return_url
        )
        return session.url

    def handle_webhook(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Process Stripe webhook events"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {e}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise

        event_type = event["type"]
        data = event["data"]["object"]

        logger.info(f"Processing Stripe webhook: {event_type}")

        handlers = {
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "invoice.payment_succeeded": self._handle_payment_succeeded,
            "invoice.payment_failed": self._handle_payment_failed,
        }

        handler = handlers.get(event_type)
        if handler:
            handler(data)

        return {"status": "success", "event_type": event_type}

    def _handle_subscription_created(self, data: Dict):
        """Handle subscription created event"""
        customer_id = data["customer"]
        subscription = self.subscription_repo.get_subscription_by_stripe_customer(customer_id)

        if not subscription:
            logger.warning(f"No subscription found for customer: {customer_id}")
            return

        status = data["status"]  # trialing, active, etc.
        plan_type = self._get_plan_from_price(data)

        self.subscription_repo.update_subscription(
            subscription.id,
            stripe_subscription_id=data["id"],
            status=status,
            plan_type=plan_type,
            current_period_start=datetime.fromtimestamp(data["current_period_start"]),
            current_period_end=datetime.fromtimestamp(data["current_period_end"]),
            trial_start=datetime.fromtimestamp(data["trial_start"]) if data.get("trial_start") else None,
            trial_end=datetime.fromtimestamp(data["trial_end"]) if data.get("trial_end") else None
        )

        # Log event
        self.subscription_repo.log_subscription_event(
            subscription.user_id,
            "subscription_created",
            subscription.id,
            to_plan=plan_type
        )

        AuditService.log_event(
            self.db,
            str(subscription.user_id),
            "SUBSCRIPTION_STARTED",
            f"Started {plan_type} subscription",
            {"plan_type": plan_type, "status": status}
        )

    def _handle_subscription_updated(self, data: Dict):
        """Handle subscription updated event"""
        customer_id = data["customer"]
        subscription = self.subscription_repo.get_subscription_by_stripe_customer(customer_id)

        if not subscription:
            return

        old_plan = subscription.plan_type
        new_status = data["status"]
        new_plan = self._get_plan_from_price(data)

        self.subscription_repo.update_subscription(
            subscription.id,
            status=new_status,
            plan_type=new_plan,
            current_period_start=datetime.fromtimestamp(data["current_period_start"]),
            current_period_end=datetime.fromtimestamp(data["current_period_end"]),
            cancelled_at=datetime.fromtimestamp(data["canceled_at"]) if data.get("canceled_at") else None
        )

        # Determine event type
        if old_plan != new_plan:
            event_type = "upgraded" if self._is_upgrade(old_plan, new_plan) else "downgraded"
            self.subscription_repo.log_subscription_event(
                subscription.user_id,
                event_type,
                subscription.id,
                from_plan=old_plan,
                to_plan=new_plan
            )

            AuditService.log_event(
                self.db,
                str(subscription.user_id),
                f"SUBSCRIPTION_{event_type.upper()}",
                f"Changed from {old_plan} to {new_plan}",
                {"from_plan": old_plan, "to_plan": new_plan}
            )

    def _handle_subscription_deleted(self, data: Dict):
        """Handle subscription cancelled/deleted event"""
        customer_id = data["customer"]
        subscription = self.subscription_repo.get_subscription_by_stripe_customer(customer_id)

        if not subscription:
            return

        self.subscription_repo.update_subscription(
            subscription.id,
            status="cancelled",
            cancelled_at=datetime.utcnow()
        )

        self.subscription_repo.log_subscription_event(
            subscription.user_id,
            "cancelled",
            subscription.id,
            from_plan=subscription.plan_type
        )

        AuditService.log_event(
            self.db,
            str(subscription.user_id),
            "SUBSCRIPTION_CANCELLED",
            f"Cancelled {subscription.plan_type} subscription"
        )

    def _handle_payment_succeeded(self, data: Dict):
        """Handle successful payment"""
        customer_id = data["customer"]
        subscription = self.subscription_repo.get_subscription_by_stripe_customer(customer_id)

        if subscription:
            self.subscription_repo.log_subscription_event(
                subscription.user_id,
                "payment_succeeded",
                subscription.id,
                metadata={"amount": data.get("amount_paid"), "invoice_id": data.get("id")}
            )

    def _handle_payment_failed(self, data: Dict):
        """Handle failed payment"""
        customer_id = data["customer"]
        subscription = self.subscription_repo.get_subscription_by_stripe_customer(customer_id)

        if subscription:
            self.subscription_repo.update_subscription(
                subscription.id,
                status="past_due"
            )

            self.subscription_repo.log_subscription_event(
                subscription.user_id,
                "payment_failed",
                subscription.id,
                metadata={"invoice_id": data.get("id")}
            )

            AuditService.log_event(
                self.db,
                str(subscription.user_id),
                "PAYMENT_FAILED",
                "Payment failed for subscription"
            )

    def _get_plan_from_price(self, data: Dict) -> str:
        """Extract plan type from subscription data"""
        items = data.get("items", {}).get("data", [])
        if not items:
            return "unknown"

        price_id = items[0].get("price", {}).get("id")

        # Reverse lookup from price ID to plan type
        if price_id == settings.STRIPE_PRICE_STARTER:
            return "starter"
        elif price_id == settings.STRIPE_PRICE_PRO:
            return "pro"
        elif price_id == settings.STRIPE_PRICE_ENTERPRISE:
            return "enterprise"
        return "unknown"

    def _is_upgrade(self, from_plan: str, to_plan: str) -> bool:
        """Determine if plan change is an upgrade"""
        plan_order = {"free": 0, "starter": 1, "pro": 2, "enterprise": 3}
        return plan_order.get(to_plan, 0) > plan_order.get(from_plan, 0)

    def get_subscription_status(self, user_id: int) -> Dict[str, Any]:
        """Get current subscription status for a user"""
        subscription = self.subscription_repo.get_subscription_by_user(user_id)

        if not subscription:
            return {
                "status": "free",
                "plan_type": "free",
                "trial_end": None,
                "current_period_end": None
            }

        return {
            "status": subscription.status,
            "plan_type": subscription.plan_type,
            "trial_end": str(subscription.trial_end) if subscription.trial_end else None,
            "current_period_end": str(subscription.current_period_end) if subscription.current_period_end else None
        }

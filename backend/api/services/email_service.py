"""
Email Service - Handles sending emails via Resend
"""
import resend
from typing import Optional
from backend.config.base_config import settings


# Initialize Resend with API key
resend.api_key = settings.RESEND_API_KEY


def send_magic_link(email: str, magic_link: str, is_new_user: bool = False) -> bool:
    """
    Send a magic link email for passwordless authentication

    Args:
        email: Recipient email address
        magic_link: The full magic link URL
        is_new_user: Whether this is a new user signup or returning user

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # Development mode: Just print the link to console
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY == "re_xxxxxxxxxxxx":
        print("\n" + "="*80)
        print("🔗 MAGIC LINK (Development Mode)")
        print("="*80)
        print(f"To: {email}")
        print(f"Type: {'New User' if is_new_user else 'Returning User'}")
        print(f"\nClick this link to sign in:")
        print(f"\n{magic_link}\n")
        print("="*80 + "\n")
        return True

    try:
        # Determine subject and greeting based on user type
        if is_new_user:
            subject = f"Welcome to {settings.EMAIL_FROM_NAME}! 🎉"
            greeting = "Welcome!"
            message_intro = "Click the button below to verify your email and get started:"
        else:
            subject = f"Sign in to {settings.EMAIL_FROM_NAME}"
            greeting = "Welcome back!"
            message_intro = "Click the button below to sign in to your account:"

        # HTML email template
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #1a73e8;
            font-size: 24px;
            margin: 0;
        }}
        .content {{
            text-align: center;
            margin: 30px 0;
        }}
        .button {{
            display: inline-block;
            background-color: #1a73e8;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }}
        .button:hover {{
            background-color: #1557b0;
        }}
        .footer {{
            text-align: center;
            margin-top: 40px;
            font-size: 14px;
            color: #666;
        }}
        .expiry-notice {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
        }}
        .security-notice {{
            font-size: 13px;
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{settings.EMAIL_FROM_NAME}</h1>
        </div>

        <div class="content">
            <h2>{greeting}</h2>
            <p>{message_intro}</p>

            <a href="{magic_link}" class="button">Sign In</a>

            <div class="expiry-notice">
                ⏱️ This link expires in {settings.MAGIC_LINK_EXPIRY_MINUTES} minutes
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: #1a73e8;">{magic_link}</span>
            </p>
        </div>

        <div class="security-notice">
            <p><strong>Security Notice:</strong></p>
            <p>This email contains a secure link to access your account. If you didn't request this email, please ignore it. The link will expire automatically.</p>
        </div>

        <div class="footer">
            <p>© 2026 {settings.EMAIL_FROM_NAME}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        # Plain text fallback
        text_content = f"""
{greeting}

{message_intro}

{magic_link}

This link expires in {settings.MAGIC_LINK_EXPIRY_MINUTES} minutes.

If you didn't request this email, please ignore it.

---
© 2026 {settings.EMAIL_FROM_NAME}
"""

        # Send email via Resend
        params = {
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": [email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }

        response = resend.Emails.send(params)

        print(f"Email sent successfully to {email}. Message ID: {response.get('id', 'N/A')}")
        return True

    except Exception as e:
        error_msg = str(e)
        print(f"Failed to send email to {email}: {error_msg}")

        # If email sending fails, print to console as fallback (for development)
        if "domain" in error_msg.lower() or "verification" in error_msg.lower():
            print("\n⚠️  Email domain not verified in Resend. Using console fallback:\n")
            print("="*80)
            print("🔗 MAGIC LINK (Fallback Mode)")
            print("="*80)
            print(f"To: {email}")
            print(f"Type: {'New User' if is_new_user else 'Returning User'}")
            print(f"\nClick this link to sign in:")
            print(f"\n{magic_link}\n")
            print("="*80 + "\n")
            return True

        return False


def send_welcome_email(email: str, user_name: str) -> bool:
    """
    Send a welcome email after user completes onboarding

    Args:
        email: User email address
        user_name: User's full name

    Returns:
        bool: True if email sent successfully
    """
    try:
        subject = f"You're all set! Welcome to {settings.EMAIL_FROM_NAME} 🎉"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
        }}
        h1 {{ color: #1a73e8; }}
        .button {{
            display: inline-block;
            background-color: #1a73e8;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 6px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome aboard, {user_name}!</h1>
        <p>Your account is now fully set up and ready to go. We're excited to help you analyze and optimize your Facebook ad campaigns.</p>

        <p><strong>What's next?</strong></p>
        <ul>
            <li>Explore your ad campaign dashboard</li>
            <li>Get AI-powered insights on your creative performance</li>
            <li>Track your key metrics and trends</li>
        </ul>

        <a href="{settings.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>

        <p>If you have any questions, just reply to this email. We're here to help!</p>

        <p>Best regards,<br>The {settings.EMAIL_FROM_NAME} Team</p>
    </div>
</body>
</html>
"""

        params = {
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": [email],
            "subject": subject,
            "html": html_content,
        }

        response = resend.Emails.send(params)
        print(f"Welcome email sent to {email}. Message ID: {response.get('id', 'N/A')}")
        return True

    except Exception as e:
        print(f"Failed to send welcome email to {email}: {str(e)}")
        return False

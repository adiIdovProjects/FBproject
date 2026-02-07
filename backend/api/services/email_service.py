"""
Email Service - Handles sending emails via Resend
"""
import resend
from typing import Optional
from backend.config.base_config import settings


# Initialize Resend with API key
resend.api_key = settings.RESEND_API_KEY


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


def send_daily_report_email(
    email: str,
    user_name: str,
    report_data: dict
) -> bool:
    """
    Send daily/weekly report email with metrics and recommendations.

    Args:
        email: User email address
        user_name: User's full name
        report_data: Dict containing metrics, recommendations, etc.

    Returns:
        bool: True if email sent successfully
    """
    try:
        # Extract data
        date_str = report_data.get('date', 'Today')
        metrics = report_data.get('metrics', {})
        recommendations = report_data.get('recommendations', [])
        budget = report_data.get('budget_status', {})

        # Format metrics
        spend = metrics.get('spend', 0)
        conversions = metrics.get('conversions', 0)
        cpa = metrics.get('cpa', 0)

        # Build metrics HTML
        metrics_html = f"""
        <div style="display: flex; gap: 20px; margin: 20px 0;">
            <div style="background: #f0f9ff; padding: 15px 20px; border-radius: 8px; flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #1a73e8;">${spend:.2f}</div>
                <div style="font-size: 12px; color: #666;">Spend</div>
            </div>
            <div style="background: #f0fdf4; padding: 15px 20px; border-radius: 8px; flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #16a34a;">{conversions}</div>
                <div style="font-size: 12px; color: #666;">Conversions</div>
            </div>
            <div style="background: #fef3c7; padding: 15px 20px; border-radius: 8px; flex: 1; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #d97706;">${cpa:.2f}</div>
                <div style="font-size: 12px; color: #666;">Cost per Result</div>
            </div>
        </div>
        """

        # Build recommendations HTML
        recs_html = ""
        if recommendations:
            recs_items = "".join(
                f'<li style="margin: 8px 0;">{rec.get("message", "")}</li>'
                for rec in recommendations
            )
            recs_html = f"""
            <div style="background: #fffbeb; border-left: 4px solid #fbbf24; padding: 15px; margin: 20px 0;">
                <div style="font-weight: bold; color: #92400e; margin-bottom: 10px;">💡 Recommendations</div>
                <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                    {recs_items}
                </ul>
            </div>
            """

        subject = f"Your Daily Report - {date_str}"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .header {{
            text-align: center;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }}
        .header h1 {{
            color: #1a73e8;
            font-size: 20px;
            margin: 0;
        }}
        .button {{
            display: inline-block;
            background-color: #1a73e8;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Your Daily Report</h1>
            <p style="color: #666; margin: 5px 0 0 0;">{date_str}</p>
        </div>

        <p>Hi {user_name},</p>
        <p>Here's your ad performance snapshot:</p>

        {metrics_html}

        {recs_html}

        <div style="text-align: center; margin: 30px 0;">
            <a href="{settings.FRONTEND_URL}/my-reports" class="button">View Full Report</a>
        </div>

        <div class="footer">
            <p>You're receiving this because you enabled daily reports.</p>
            <p><a href="{settings.FRONTEND_URL}/my-reports">Manage your report settings</a></p>
            <p>© 2026 {settings.EMAIL_FROM_NAME}</p>
        </div>
    </div>
</body>
</html>
"""

        # Plain text fallback
        recs_text = "\n".join(f"• {r.get('message', '')}" for r in recommendations)
        text_content = f"""
Your Daily Report - {date_str}

Hi {user_name},

Here's your ad performance snapshot:

Spend: ${spend:.2f}
Conversions: {conversions}
Cost per Result: ${cpa:.2f}

{'Recommendations:\n' + recs_text if recs_text else ''}

View full report: {settings.FRONTEND_URL}/my-reports

---
© 2026 {settings.EMAIL_FROM_NAME}
"""

        params = {
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": [email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }

        response = resend.Emails.send(params)
        print(f"Daily report email sent to {email}. Message ID: {response.get('id', 'N/A')}")
        return True

    except Exception as e:
        print(f"Failed to send daily report email to {email}: {str(e)}")
        return False

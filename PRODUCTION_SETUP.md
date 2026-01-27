# Production Setup Guide

This guide covers everything needed to deploy your Facebook Ads Analytics Platform to production.

## Quick Start Checklist

Before deploying, complete these critical steps:

- [ ] Rotate all API keys (Facebook, Google, Gemini, Resend)
- [ ] Generate new JWT secret: `python -c "import secrets; print(secrets.token_hex(32))"`
- [ ] Set up Render.com account
- [ ] Set up CloudFlare account
- [ ] Set up Sentry.io account
- [ ] Configure environment variables in Render

---

## 1. Render.com Deployment

### Create Services

1. **Backend (FastAPI)**
   - Type: Web Service
   - Environment: Python 3.11
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`
   - Plan: Starter ($7/mo)

2. **meta-dashboard (Next.js)**
   - Type: Web Service
   - Environment: Node 20
   - Build Command: `cd meta-dashboard && npm ci && npm run build`
   - Start Command: `cd meta-dashboard && npm start`
   - Plan: Starter ($7/mo)

3. **website-front (Next.js)**
   - Type: Web Service
   - Environment: Node 20
   - Build Command: `cd website-front && npm ci && npm run build`
   - Start Command: `cd website-front && npm start`
   - Plan: Starter ($7/mo)

4. **PostgreSQL Database**
   - Type: PostgreSQL
   - Plan: Starter ($7/mo)

### Environment Variables

Set these in Render dashboard for each service:

**Backend:**
```env
DATABASE_URL=<from Render PostgreSQL>
JWT_SECRET_KEY=<generate new 64-char hex>
FACEBOOK_APP_ID=<your app id>
FACEBOOK_APP_SECRET=<your app secret>
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
GEMINI_API_KEY=<your api key>
RESEND_API_KEY=<your api key>
FRONTEND_URL=https://your-dashboard.onrender.com
CORS_ORIGINS=["https://your-dashboard.onrender.com","https://your-website.onrender.com"]
ENVIRONMENT=production
DEV_BYPASS_AUTH=false
DEBUG=false
SENTRY_DSN=<from Sentry>
```

**meta-dashboard:**
```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
NEXT_PUBLIC_SENTRY_DSN=<from Sentry>
```

**website-front:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://your-website.onrender.com
NEXT_PUBLIC_DASHBOARD_URL=https://your-dashboard.onrender.com
NEXT_PUBLIC_SENTRY_DSN=<from Sentry>
```

---

## 2. CloudFlare Setup

### DNS Configuration

1. Add your domain to CloudFlare
2. Update nameservers at your registrar
3. Add CNAME records pointing to Render:
   - `api` → your-backend.onrender.com
   - `app` → your-dashboard.onrender.com
   - `www` → your-website.onrender.com

### Security Settings

Enable these in CloudFlare dashboard:

1. **SSL/TLS** → Full (strict)
2. **Edge Certificates** → Always Use HTTPS: ON
3. **Security** → WAF: Enable managed rules
4. **Security** → Bot Fight Mode: ON
5. **Speed** → Auto Minify: JS, CSS, HTML

### Page Rules (Optional)

- `api.yourdomain.com/*` → Cache Level: Bypass
- `*.yourdomain.com/api/*` → Cache Level: Bypass

---

## 3. Sentry Setup

### Create Projects

1. Go to sentry.io and create account
2. Create 3 projects:
   - `facebook-ads-backend` (Python/FastAPI)
   - `facebook-ads-dashboard` (Next.js)
   - `facebook-ads-website` (Next.js)

### Install SDKs

**Backend (already in requirements.txt if added):**
```bash
pip install sentry-sdk[fastapi]
```

Add to `backend/api/main.py`:
```python
import sentry_sdk

if os.getenv('SENTRY_DSN'):
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN'),
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )
```

**Frontend (meta-dashboard & website-front):**
```bash
npm install @sentry/nextjs
```

Run Sentry wizard:
```bash
npx @sentry/wizard@latest -i nextjs
```

---

## 4. OAuth Configuration

### Facebook App

1. Go to developers.facebook.com
2. Add production redirect URI:
   - `https://api.yourdomain.com/api/v1/auth/facebook/callback`
3. Add required permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`

### Google Cloud Console

1. Go to console.cloud.google.com
2. Add authorized redirect URI:
   - `https://api.yourdomain.com/api/v1/auth/google/callback`
3. Add authorized JavaScript origins:
   - `https://app.yourdomain.com`
   - `https://yourdomain.com`

---

## 5. Database Migration

Run migrations before first deployment:

```bash
# Connect to Render PostgreSQL
# The schema creates automatically on first run via create_schema()
```

---

## 6. Post-Deployment Verification

### Security Checklist

- [ ] Visit https://securityheaders.com and check your domain
- [ ] Verify HTTPS is enforced (http:// redirects to https://)
- [ ] Test OAuth flows (Google + Facebook login)
- [ ] Verify rate limiting is working
- [ ] Check Sentry is receiving errors

### Functional Checklist

- [ ] User registration works
- [ ] User login works (email + OAuth)
- [ ] Facebook account connection works
- [ ] Dashboard loads data correctly
- [ ] Reports generate successfully

---

## 7. Monitoring

### Uptime Monitoring

Set up uptime monitoring with:
- Render's built-in health checks (uses `/ping` endpoint)
- UptimeRobot (free) or Better Uptime

### Error Tracking

Sentry will capture:
- Unhandled exceptions
- API errors (4xx, 5xx)
- Frontend crashes

### Performance

Consider adding:
- Sentry Performance (included in free tier)
- Vercel Analytics (if using Vercel instead)

---

## 8. Backup Strategy

### Database

Render PostgreSQL includes:
- Daily automatic backups
- Point-in-time recovery (paid plans)

### Code

- GitHub repository is your backup
- Consider enabling branch protection on `main`

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Render Backend | $7 |
| Render Dashboard | $7 |
| Render Website | $7 |
| Render PostgreSQL | $7 |
| CloudFlare | Free |
| Sentry | Free (5K events) |
| **Total** | **~$28/month** |

---

## Support

If you encounter issues:
1. Check Render logs in dashboard
2. Check Sentry for errors
3. Review CloudFlare analytics for blocked requests

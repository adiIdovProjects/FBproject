# Adstyr Go-Live Checklist

## Overview
Comprehensive checklist of everything needed before launching to production.

---

## 🎥 CONTENT & MEDIA

### Demo Video (CRITICAL)
- [ ] **Record product demo video** (2-3 minutes)
  - Show: Connect account → Dashboard → AI insights → Create campaign
  - Host on YouTube/Vimeo or self-hosted
- [ ] **Implement demo video modal** in Hero.tsx (button exists, no handler)
  - File: `meta-dashboard/src/components/landing/Hero.tsx` line 74-77

### Tutorial Videos
- [ ] **Create tutorial video series**:
  - Getting started (first login)
  - Understanding your dashboard
  - Creating your first campaign
  - Reading reports & insights
  - Using AI features
- [ ] **Embed videos in Learning Center** (`learning/page.tsx`)
- [ ] **Unblock quiz completion video** (currently "Coming Soon" placeholder)

---

## 📧 EMAIL SETUP (CRITICAL)

### Domain Email
- [ ] **Set up custom domain in Resend** (not `noreply@example.com`)
- [ ] **Configure DNS records** (DKIM, SPF, DMARC)
- [ ] **Update EMAIL_FROM_ADDRESS** in Render env vars
- [ ] **Recommended**: Use `hello@adstyr.com` or `support@adstyr.com`

### Email Templates Needed
- [ ] **Welcome email** (exists but never triggered)
- [ ] **Trial expiring reminder** (3 days before, 1 day before)
- [ ] **Payment failed notification**
- [ ] **Subscription confirmation**
- [ ] **Password reset** (not implemented)
- [ ] **Feedback acknowledgment**

### Email Scheduler
- [ ] **Add APScheduler to requirements.txt** (imported but not installed)
- [ ] **Wire up daily/weekly report emails** (service exists, scheduler not connected)
- [ ] **Start scheduler from main.py**

---

## 💳 BILLING & SUBSCRIPTIONS (CRITICAL)

### Plan Enforcement
- [ ] **Add subscription check middleware** (currently no enforcement)
- [ ] **Gate paid features** (AI credits, advanced analytics)
- [ ] **Implement AI credit system** (pricing mentions credits but not tracked)

### Trial System
- [ ] **Auto-provision trial on signup** (7-day)
- [ ] **Enforce trial expiration** (auto-downgrade to free)
- [ ] **Send trial expiring emails**

### User Billing UI
- [ ] **Build Settings > Billing tab** (currently "Coming Soon")
  - Show current plan & status
  - Link to Stripe billing portal
  - Show renewal date
  - Show AI credits remaining

### Admin Revenue Dashboard
- [ ] **Calculate actual MRR from Stripe** (currently hardcoded $0)
- [ ] **Fetch revenue data from Stripe API**

---

## 📄 LEGAL & COMPLIANCE

### Pages to Create
- [ ] **Contact page** (`/contact`) - Footer link is broken (`#`)
- [ ] **About Us page** (`/about`) - Footer link is broken (`#`)
- [ ] **Cookie Policy page** (`/cookie-policy`) - Only inline consent exists

### Pages to Fix
- [ ] **Fix company name** in Privacy Policy & Terms
  - Currently says "AdsAI" - should be "Adstyr"
  - Files: `/privacy-policy/page.tsx`, `/terms/page.tsx`
- [ ] **Fix accessibility contact email**
  - Currently: `accessibility@example.com` (placeholder)
  - Fix in: `/accessibility/page.tsx`

### Footer Links
- [ ] **Fix Contact link** in `LandingFooter.tsx` (currently `#`)
- [ ] **Fix About link** in `LandingFooter.tsx` (currently `#`)
- [ ] **Fix social media links** (Twitter/X, Email are `#`)

---

## 🔍 SEO & ANALYTICS

### Critical Missing
- [ ] **Create sitemap.ts** (`src/app/sitemap.ts`)
- [ ] **Create robots.txt** (`src/app/robots.ts`)
- [ ] **Create llms.txt** (`public/llms.txt`) - For AI/LLM crawlers
- [ ] **Add Google Analytics (GA4)** with gtag
- [ ] **Implement Facebook Pixel** (ironic for FB ads platform!)

### Meta Tags
- [ ] **Add Open Graph tags** (og:title, og:description, og:image, og:url)
- [ ] **Add Twitter Card tags** (twitter:card, twitter:title, twitter:image)
- [ ] **Add hreflang tags** for multi-language SEO
- [ ] **Add canonical tags** to prevent duplicate content

### Icons & Branding
- [ ] **Create proper favicon** (currently only `/file.svg`)
  - favicon.ico (32x32)
  - favicon-16x16.png
  - favicon-32x32.png
  - apple-touch-icon.png (180x180)
- [ ] **Create OG image** for social sharing (1200x630px)

### Structured Data
- [ ] **Add JSON-LD** for Organization schema
- [ ] **Add BreadcrumbList** schema for navigation

---

## 👥 TESTIMONIALS & SOCIAL PROOF

### Replace Placeholders
- [ ] **Get real customer testimonials** (currently using generic names + Pravatar)
  - Sarah J. → Real customer with photo
  - Marcus T. → Real customer with photo
  - Elena R. → Real customer with photo
- [ ] **Verify outcome metrics** ($47% ROAS, etc. are made up)
- [ ] **Add LinkedIn verification or company logos**

### Trust Signals
- [ ] **Add customer logos** (if available)
- [ ] **Add live user counter** (optional: "Join 500+ marketers")
- [ ] **Consider video testimonials**

---

## 🎓 ONBOARDING & HELP

### Already Implemented ✅
- 3-step onboarding flow
- Learning Center with 5 sections
- Searchable glossary (30+ terms)
- AI chat assistance
- Inline tooltips & hints
- Getting started card

### Enhancements
- [ ] **Add more guided tours** (beyond initial 4-step tour)
  - First campaign creation tour
  - Reports page tour
  - AI features tour
- [ ] **Track learning progress** (optional gamification)

---

## 🔐 SECURITY & INFRASTRUCTURE

### Already Implemented ✅
- JWT authentication (1-week expiry)
- Rate limiting (100 req/min)
- CSRF protection
- Security headers (CSP, HSTS, X-Frame-Options)
- Cookie consent (GDPR)
- Sentry error tracking

### Verify
- [ ] **Confirm Stripe webhook secret** is set in Render
- [ ] **Confirm all API keys** are in Render (not .env)
- [ ] **Test webhook endpoint** works from Stripe dashboard
- [ ] **Set up Sentry alerts** for production errors

---

## 🎨 UI/UX POLISH

### Landing Page
- [ ] **Demo video button** needs handler
- [ ] **Social links** need real URLs

### Dashboard
- [ ] **Billing tab** needs implementation
- [ ] **Video tutorial** placeholders need content

---

## 📋 PRIORITY ORDER

### Phase 1 - Must Have for Launch
1. Demo video + modal implementation
2. Domain email setup (Resend + DNS)
3. Fix broken footer links (Contact, About, Social)
4. Fix company name in legal pages
5. Plan enforcement + trial auto-provision
6. Sitemap + robots.txt
7. Real testimonials (or remove section)
8. Proper favicon

### Phase 2 - Should Have
1. GA4 analytics
2. Facebook Pixel
3. Tutorial video series
4. Email scheduler for reports
5. Billing settings UI
6. Open Graph tags
7. Trial expiration emails

### Phase 3 - Nice to Have
1. Video testimonials
2. More guided tours
3. AI credit tracking
4. Learning progress tracking
5. Structured data (JSON-LD)

---

## ESTIMATED EFFORT

| Category | Items | Est. Time |
|----------|-------|-----------|
| Content (videos) | 6-8 videos | 2-3 days |
| Email setup | Domain + 5 templates | 1 day |
| Billing fixes | Enforcement + UI | 2 days |
| Legal/Footer | 5 pages/links | 0.5 day |
| SEO basics | Sitemap, robots, tags | 0.5 day |
| Icons/branding | Favicon set + OG | 0.5 day |
| Testimonials | 3 real testimonials | External |

**Total technical work**: ~4-5 days
**Content creation**: 2-3 days + external testimonials

---

## Previous Tasks (Archived)

<details>
<summary>Click to expand previous completed tasks</summary>

### Previous Task: Fix Translation Issue on Connect-Facebook Page
- [x] Fix duplicate `onboarding` key in all translation files (en, ar, de, fr, he)
- [x] Renamed tour section to `onboarding_tour` to avoid conflict
- [x] Updated OnboardingTour.tsx to use new key prefix
- [x] Updated i18n-keys.ts type file

**Root Cause**: JSON files had two `"onboarding"` sections - one for connect-facebook flow (line ~633) and one for dashboard tour (line ~2276). The second one was overriding the first, causing translation keys to show as raw text.

### Previous Task: Fix Render Deployment Port Scan Timeout
- [x] Add a simple root `/` endpoint that returns immediately
- [ ] Verify the fix works (push to main to trigger deploy)

### Previous Task: Leads Page Improvements (COMPLETED)
- Date filter, Kanban board, Unqualified stage

### Previous Task: Pixel Event Scanner + Wizard Smart Guidance (COMPLETED)
- Pixel health indicator, event stats, AI copy generation

</details>

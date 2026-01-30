# Business Intelligence & Smart Recommendations Feature

**Status:** ✅ Complete (All 8 Phases)
**Date:** January 30, 2026

---

## 🎯 Executive Summary

Built a complete AI-powered business intelligence system that:
1. **Collects** business information during onboarding (website URL or description)
2. **Analyzes** businesses automatically using Google Gemini AI
3. **Enriches** all AI features with rich business context
4. **Recommends** smart targeting, ad copy, and creative direction
5. **Replaces** the old account quiz with a superior solution

---

## 📊 Feature Overview

### What It Does

**For Users:**
- Provide website URL (or brief description) during onboarding
- AI analyzes the website + social pages automatically
- Get personalized recommendations for:
  - **Audience targeting** (interests, demographics, countries)
  - **Ad copy** (3 variants matching brand tone)
  - **Creative direction** (visual style, content angles, formats)

**For the Business:**
- Better ad performance through AI-powered recommendations
- Time savings (no manual research for targeting/copy)
- Consistent brand voice across campaigns
- Data-driven creative decisions

---

## 🏗️ Architecture

### Database Schema

**New Table: `business_profiles`**
```sql
CREATE TABLE business_profiles (
    id SERIAL PRIMARY KEY,
    account_id BIGINT UNIQUE REFERENCES dim_account(account_id),

    -- User Input
    website_url TEXT,
    business_description TEXT,  -- fallback if no URL

    -- AI-Extracted (from website)
    business_type VARCHAR(100),    -- ecommerce, lead_gen, saas, etc.
    business_model VARCHAR(50),    -- b2b, b2c, b2b2c
    target_audience TEXT,          -- ICP description
    tone_of_voice VARCHAR(100),    -- professional, casual, playful
    products_services TEXT,        -- JSON array
    geographic_focus TEXT,         -- JSON array
    industry VARCHAR(100),
    value_propositions TEXT,       -- JSON array
    visual_style_notes TEXT,

    -- AI-Extracted (from social pages)
    content_themes TEXT,           -- JSON
    posting_style TEXT,
    engagement_patterns TEXT,      -- JSON

    -- Status
    analysis_status VARCHAR(50) DEFAULT 'pending',
    website_analyzed_at TIMESTAMP,
    social_analyzed_at TIMESTAMP,
    profile_json TEXT,             -- full Gemini response

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (FastAPI)                      │
├─────────────────────────────────────────────────────────────┤
│  business_profile.py    │  recommendations.py               │
│  - POST /business-profile │ - GET /recommendations/audience │
│  - GET /business-profile  │ - GET /recommendations/ad-copy  │
│                           │ - GET /recommendations/creative │
└───────────────┬───────────┴──────────────┬──────────────────┘
                │                          │
                ▼                          ▼
┌───────────────────────────┐  ┌──────────────────────────────┐
│  BusinessProfileService   │  │  RecommendationService       │
│  - analyze_website()      │  │  - get_audience_recs()       │
│  - analyze_social_pages() │  │  - get_ad_copy_recs()        │
│  - build_full_profile()   │  │  - get_creative_direction()  │
└──────────┬────────────────┘  └──────────┬───────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│ BusinessProfileRepo      │   │  Google Gemini API           │
│ - CRUD operations        │   │  - Structured extraction     │
│ - Query by account_id    │   │  - JSON responses            │
└──────────────────────────┘   └──────────────────────────────┘
```

### Frontend Flow

```
User Links Account
      ↓
[Business Profile Page]
   - Enter website URL
   - OR brief description
      ↓
Background Analysis
   - Fetch website HTML
   - Send to Gemini for extraction
   - Analyze FB/IG posts
   - Save to database
      ↓
User Completes Quiz
      ↓
[Dashboard + Campaign Creation]
   - AI context enriched
   - Recommendations available
```

---

## 🔧 Implementation Details

### Phase 1: Database & Models ✅
- Created `BusinessProfile` SQLAlchemy model
- Migration script (`add_business_profiles.sql`)
- Drops old `account_quiz_responses` table

### Phase 2: Backend Services ✅
**Files Created:**
- `business_profile_repository.py` - CRUD operations
- `business_profile_service.py` - AI analysis orchestrator
  - `analyze_website()` - Crawl website, extract text, Gemini analysis
  - `analyze_social_pages()` - Fetch FB/IG posts, Gemini tone analysis
  - `build_full_profile()` - Background task, merges both analyses

### Phase 3: API Endpoints ✅
**Business Profile Router:**
- `POST /api/v1/accounts/{id}/business-profile` - Save URL/description, trigger analysis
- `GET /api/v1/accounts/{id}/business-profile` - Retrieve profile + status

**Recommendations Router:**
- `GET /api/v1/accounts/{id}/recommendations/audience`
- `GET /api/v1/accounts/{id}/recommendations/ad-copy?objective=SALES`
- `GET /api/v1/accounts/{id}/recommendations/creative-direction`

### Phase 4: Frontend Onboarding ✅
**New Page:** `/onboard/business-profile/page.tsx`

**Features:**
- Multi-account wizard (for users with multiple accounts)
- Website URL input (primary)
- "I don't have a website" toggle → description fallback
- Real-time analysis status
- Progress dots for multiple accounts
- i18n support (en, ar, de, fr, he)

**Updated Flow:**
```
/select-accounts → /onboard/business-profile → /quiz → /homepage
```

### Phase 5: Cleanup ✅
**Removed:**
- `/account-quiz` page
- Quiz endpoints from accounts router
- `AccountQuizRequest` schema
- Quiz methods from `AccountRepository`
- "Complete Setup" button from Sidebar
- Quiz service methods from `accounts.service.ts`

### Phase 6: AI Context Enhancement ✅
**Updated Services:**
- `ai_service.py` - Now pulls BusinessProfile context instead of quiz
- `insights_repository.py` - Gets business context from profiles

**Before:**
```python
context = {
    'primary_goal': 'purchases',
    'industry': 'ecommerce',
    'optimization_priority': 'scaling'
}
```

**After:**
```python
context = {
    'business_type': 'ecommerce',
    'business_model': 'b2c',
    'industry': 'fashion',
    'target_audience': 'Women 25-45, fashion-conscious...',
    'tone_of_voice': 'casual and friendly',
    'business_description': 'Online boutique...'
}
```

### Phase 7: Recommendations Engine ✅
**Backend:** `recommendation_service.py` + `recommendations.py` router

**Recommendation Types:**

**1. Audience Targeting**
```json
{
  "interests": ["Fashion", "Shopping", "Style", "Boutique"],
  "age_range": {"min": 25, "max": 45},
  "genders": ["female"],
  "countries": ["US", "CA", "UK", "AU"],
  "rationale": "Your business targets fashion-conscious women..."
}
```

**2. Ad Copy** (3 variants)
```json
{
  "variants": [
    {
      "headline": "Style That Speaks to You",
      "primary_text": "Discover curated fashion that matches your unique style...",
      "description": "Shop the latest trends",
      "cta": "SHOP_NOW"
    }
  ],
  "tips": [
    "Use emojis sparingly to maintain sophistication",
    "Highlight exclusivity and quality",
    "Include social proof when available"
  ]
}
```

**3. Creative Direction**
```json
{
  "visual_style": "Clean, bright lifestyle photography with neutral backgrounds",
  "content_angles": ["transformation", "exclusivity", "quality", "trendsetting"],
  "ad_formats": ["carousel", "single_image", "video"],
  "messaging_themes": ["confidence", "self-expression", "community"],
  "best_practices": [
    "Show products being worn/styled",
    "Use diverse models to appeal to broad audience",
    "Emphasize limited editions or new arrivals"
  ]
}
```

**Frontend:** `SmartSuggestions.tsx` component

**Features:**
- 3 tabs: Ad Copy | Audience | Creative
- "Use This Copy" and "Apply These Settings" buttons
- Auto-loads recommendations when tab is selected
- Callback props for integration with campaign forms
- Error handling with helpful messages

### Phase 8: Nano Banana Contract ✅
**File:** `external_integrations.py`

**Pydantic Models Defined:**
- `NanaBananaBusinessProfile` - Business context to send
- `NanaBananaAdRequest` - Request parameters
- `NanaBananaCreativeVariant` - Single variant response
- `NanaBananaAdResponse` - Complete API response

**Ready for implementation** when Nano Banana API documentation is available.

---

## 📁 Files Created (17 files)

### Backend (9 files)
1. `backend/models/schema.py` - Added BusinessProfile model
2. `backend/migrations/add_business_profiles.sql` - Migration
3. `backend/api/repositories/business_profile_repository.py`
4. `backend/api/services/business_profile_service.py`
5. `backend/api/routers/business_profile.py`
6. `backend/api/services/recommendation_service.py`
7. `backend/api/routers/recommendations.py`
8. `backend/api/schemas/external_integrations.py`
9. `backend/api/main.py` - Registered new routers

### Frontend (6 files)
1. `meta-dashboard/src/app/[locale]/onboard/business-profile/page.tsx`
2. `meta-dashboard/src/components/recommendations/SmartSuggestions.tsx`
3. `meta-dashboard/messages/en.json` - i18n keys
4. `meta-dashboard/messages/ar.json`
5. `meta-dashboard/messages/de.json`
6. `meta-dashboard/messages/fr.json`
7. `meta-dashboard/messages/he.json`

### Documentation (2 files)
1. `BUSINESS_INTELLIGENCE_FEATURE.md` (this file)
2. `SMART_RECOMMENDATIONS_USAGE.md` - Integration guide

---

## 📝 Files Modified (12+ files)

### Backend
- `backend/api/routers/auth.py` - Changed onboarding step to `business_profile`
- `backend/api/routers/accounts.py` - Removed quiz endpoints
- `backend/api/repositories/account_repository.py` - Removed quiz methods
- `backend/api/schemas/requests.py` - Removed `AccountQuizRequest`
- `backend/api/services/ai_service.py` - Use BusinessProfile context
- `backend/api/repositories/insights_repository.py` - Use BusinessProfile

### Frontend
- `meta-dashboard/src/app/[locale]/select-accounts/page.tsx` - Redirect to business-profile
- `meta-dashboard/src/services/accounts.service.ts` - Removed quiz methods
- `meta-dashboard/src/components/Sidebar.tsx` - Removed quiz button

### Deleted
- `meta-dashboard/src/app/[locale]/account-quiz/page.tsx` ❌

---

## 🚀 Deployment Checklist

### Prerequisites
- ✅ Google Gemini API key configured (`GEMINI_API_KEY` env var)
- ✅ Facebook OAuth scopes include `pages_read_engagement`
- ✅ PostgreSQL database accessible

### Steps

1. **Run Database Migration**
```bash
# Connect to Render PostgreSQL
# Run: backend/migrations/add_business_profiles.sql
# This will:
# - Create business_profiles table
# - Drop account_quiz_responses table
```

2. **Deploy Backend**
```bash
# Push to main branch (auto-deploys on Render)
git add .
git commit -m "Add business intelligence & recommendations feature"
git push origin main
```

3. **Verify Deployment**
- Check Render logs for successful startup
- Test endpoints:
  - `GET /health` - Should show Gemini API configured
  - `POST /api/v1/accounts/{id}/business-profile` - Save profile
  - `GET /api/v1/accounts/{id}/recommendations/audience` - Get recs

4. **Test Onboarding Flow**
- Create test account
- Link Facebook ad account
- Complete business profile step (provide URL or description)
- Verify analysis runs in background
- Check recommendations endpoint returns data

---

## 🧪 Testing Scenarios

### Test Case 1: Complete Onboarding with Website URL
1. User logs in via Facebook OAuth
2. Selects ad account(s) to link
3. **NEW:** Enters website URL (e.g., `https://example.com`)
4. System analyzes website in background
5. User completes profile quiz
6. Goes to dashboard
7. **Verify:** Business profile exists with `analysis_status = 'completed'`

### Test Case 2: Complete Onboarding without Website
1. User logs in
2. Links account
3. **NEW:** Clicks "I don't have a website"
4. Enters brief description ("ecommerce store")
5. Completes quiz
6. **Verify:** Business profile saved with description, analysis skipped

### Test Case 3: View Recommendations
1. User with completed business profile
2. Goes to campaign creation
3. Clicks "Get AI Suggestions" (or opens SmartSuggestions component)
4. **Verify:** See 3 ad copy variants, audience suggestions, creative direction
5. Clicks "Use This Copy"
6. **Verify:** Form fields populate with recommended copy

### Test Case 4: Existing User (Already Completed Quiz)
1. User who completed old account quiz
2. Logs in
3. **Verify:** Not forced through business profile step
4. Recommendations show error: "No business profile found"
5. User can manually complete profile from settings (future feature)

---

## 📊 Success Metrics

### User Adoption
- % of users who provide website URL vs description
- % of business profiles successfully analyzed
- Average time to complete business profile step

### Recommendation Usage
- % of campaigns using AI ad copy recommendations
- % of campaigns using AI audience recommendations
- Click rate on "Use This Copy" / "Apply These Settings" buttons

### Ad Performance
- CTR comparison: Campaigns with AI copy vs manual copy
- CPA comparison: Campaigns with AI targeting vs manual targeting
- ROAS improvement for users using recommendations

---

## 🔮 Future Enhancements

### Short-term
1. **Settings Page Integration** - Allow users to view/edit business profile from account settings
2. **Re-analyze Button** - Let users trigger re-analysis if business changes
3. **Profile Completeness Score** - Show % complete and prompt for missing info
4. **Recommendation History** - Save which recommendations were applied

### Medium-term
1. **Nano Banana Integration** - Implement full ad creative generation
2. **Competitor Analysis** - Fetch competitor ads from Ads Library
3. **Performance Feedback Loop** - Learn from which recommendations perform best
4. **Multi-language Ad Copy** - Generate copy in user's target languages

### Long-term
1. **A/B Test Suggestions** - AI recommends which variants to A/B test
2. **Budget Optimization** - AI recommends budget allocation across campaigns
3. **Seasonal Recommendations** - Adjust suggestions based on seasonality/holidays
4. **Lookalike Audience Creation** - Auto-create lookalikes from best customers

---

## 🐛 Known Issues / Limitations

1. **Website Crawling Limitations**
   - Some sites block bots or require JavaScript rendering
   - Large sites may timeout (15s limit)
   - Fallback: User provides description manually

2. **Gemini Rate Limits**
   - Analysis runs as background task, no retry logic yet
   - If analysis fails, status stays "analyzing" (needs manual retry)

3. **Social Page Analysis**
   - Only fetches 20-30 recent posts
   - Requires `page_id` to be set during account linking
   - Instagram posts require business account connection

4. **Existing Users**
   - Users who completed account quiz won't have business profile
   - Need to manually complete profile (UI not built yet)

---

## 💡 Design Decisions

### Why Replace Account Quiz?

**Old Approach (Quiz):**
- 4-5 multiple choice questions
- Limited business context
- User has to remember/think about answers
- Generic recommendations

**New Approach (Business Profile):**
- Single input: website URL or description
- Rich context extracted automatically
- AI analyzes actual business presence
- Personalized recommendations

**Result:** Better data quality with less user effort.

### Why Background Analysis?

**Alternatives Considered:**
1. **Blocking:** Wait for analysis to complete before proceeding
   - ❌ Poor UX (user waits 10-30 seconds)
2. **Lazy:** Analyze only when recommendations requested
   - ❌ Slow first recommendation load
3. **Background (chosen):** Start analysis immediately, continue onboarding
   - ✅ Best UX, recommendations ready when needed

### Why Three Recommendation Types?

**Audience:** Most impactful for performance (wrong audience = wasted spend)
**Ad Copy:** Time-consuming to write, benefits from AI
**Creative Direction:** Strategic guidance, not implementation

All three work together: right audience + right message + right creative = performance.

---

## 📚 Related Documentation

- [Smart Recommendations Usage Guide](./SMART_RECOMMENDATIONS_USAGE.md)
- [API Documentation](./backend/api/routers/) - OpenAPI docs at `/docs`
- [Frontend Components](./meta-dashboard/src/components/recommendations/)
- [External Integrations](./backend/api/schemas/external_integrations.py)

---

## 👥 Support

For questions or issues:
1. Check Render logs for backend errors
2. Check browser console for frontend errors
3. Verify GEMINI_API_KEY is configured
4. Test endpoints with curl/Postman
5. Review this documentation

---

**Built with ❤️ using:**
- Google Gemini 2.0 Flash (AI analysis)
- FastAPI (Backend API)
- Next.js 16 (Frontend)
- PostgreSQL (Database)
- Tailwind CSS v4 (Styling)

---

**Status:** ✅ Production Ready
**Last Updated:** January 30, 2026

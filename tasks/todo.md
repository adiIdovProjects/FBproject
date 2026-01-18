# Project Tasks & Progress

## Current Task: Change Report Builder Toggle from X to +/- Icons

### Todo
- [x] Change X icon to Minus (-) icon when panel is open
- [x] Change collapsed button from Filter icon to Plus (+) icon when panel is closed

### Plan
Simple icon swap in FilterPanel.tsx:
1. Import `Minus` and `Plus` icons from lucide-react
2. Replace `X` with `Minus` in header (line 280)
3. Replace `Filter` with `Plus` in collapsed state button (line 258)

---

## Previous Task: Insights Page Full Localization (Completed)

### Summary
Added complete translation support for all hardcoded English text on the Insights page, including RTL layout fixes for Hebrew/Arabic.

### Changes Made

#### Frontend Components
1. **OverviewInsights.tsx** - Fixed RTL card ordering (monthly->weekly->daily for RTL), added translations for period labels and metrics
2. **HistoricalTrendsView.tsx** - Translated all section titles, error messages, and chart labels
3. **CreativeAnalysisView.tsx** - Translated all table headers, status labels, and analysis text
4. **CampaignAnalysisView.tsx** - Translated all campaign table headers and section titles
5. **AIChat.tsx** - Translated welcome message, error messages, and UI labels
6. **insights/page.tsx** - Fixed RTL tab ordering with `flex-row-reverse`

#### Translation Files
- Added 55+ new translation keys to all 5 language files (en, he, ar, de, fr)

#### Backend (insights_service.py)
1. **_generate_tldr_summary()** - Added translations for summary bullet points (month declining, week improvement, daily good/bad)
2. **_generate_fallback_period_insight()** - Added translations for fallback insight messages, updated callers to pass locale
3. **_get_improvement_checks()** - Added translations for learning phase and pixel check messages

### RTL Fixes
- Cards now display in correct order: Monthly (right) -> Weekly -> Daily (left) for RTL
- Tabs display right-to-left for Hebrew/Arabic
- Floating AI button positioned on left side for RTL

---

## Previous Task: Age-Gender Translation Support

### Issue
When displaying demographics data with combined age-gender format (e.g., "65+ | female"), the gender part needs translation while keeping the age part intact.

### Solution
Added translation logic to detect the `" | "` separator and translate only the gender portion using existing `breakdown.values.male`, `breakdown.values.female`, `breakdown.values.unknown` translations.

### Files Changed

1. **CreativeBreakdownTabs.tsx** - Updated `translateValue()` function to handle combined age-gender values
2. **BreakdownTabs.tsx** (campaigns) - Added `translateValue()` function with same logic + country translation via `Intl.DisplayNames`
3. **ComparisonTable.tsx** (reports) - Added `translateBreakdownValue()` function to translate both primary and secondary breakdown values

### How it works
- When `activeTab === 'age-gender'` and value contains `" | "` (e.g., "65+ | female")
- Split on `" | "` to get `[age, gender]`
- Translate only the gender part using `t('breakdown.values.female')` -> "female" in Hebrew
- Return combined: `"65+ | female"`

---

## Previous Task: Reports Account Filtering Bug Fix + Platform Breakdown

### Issue 1: Account Filtering Bug (Fixed)
When filtering reports with Campaign + Placement (or other entity + special breakdown combinations), the results showed campaigns from OTHER accounts instead of only the selected account.

**Root Cause**: In `reports_service.py`, the main method `get_comparison_data()` correctly converted `account_id` (string) to `account_ids` (list of ints), but then passed the ORIGINAL string `account_id` to all private helper methods instead of the converted int list.

**Fix**: Updated all method calls and signatures to use `account_ids: Optional[List[int]]` consistently.

### Issue 2: Platform Breakdown Separate from Placement (Added)
User requested Platform as a separate breakdown option (Facebook, Instagram, Messenger, Audience Network) distinct from Placement (which shows detailed positions like "Instagram Stories", "Facebook Feed").

### Changes Made

#### 1. Backend Repository (breakdown_repository.py)
- Added `get_platform_by_entity()` method that:
  - Queries placement data grouped by entity (campaign/adset/ad)
  - Aggregates placements into platform categories (e.g., "Instagram Stories" -> "Instagram")
  - Returns entity + platform combinations

#### 2. Backend Schemas (responses.py)
- Added `EntityPlatformBreakdown` response model with fields:
  - `entity_name`, `platform`, `spend`, `impressions`, `clicks`, `ctr`, `cpc`

#### 3. Backend Router (breakdowns.py)
- Added `GET /api/v1/breakdowns/platform/by-entity` endpoint
- Also fixed legacy endpoints to include `account_id` and `current_user`:
  - `/age-gender`
  - `/placement`
  - `/country`
  - `/adset`

#### 4. Backend Service (metrics_service.py)
- Added `get_platform_by_entity()` service method
- Imported `EntityPlatformBreakdown` schema

#### 5. Frontend Service (reports.service.ts)
- Added `platform` to `fetchEntityBreakdownReport()` endpoint map
- Updated response parsing to handle `platform` field
- Updated `getSpecialBreakdownType()` to return `'platform'` separately

#### 6. Frontend UI (FilterPanel.tsx)
- Platform was already in the UI as a chip option
- Translation key `reports.builder.platform` already exists

### Summary
- **Account filtering**: Now correctly filters by selected account across all breakdown types
- **Platform breakdown**: Now available as Entity + Platform combination (e.g., "Campaign x Platform")
  - Shows high-level platforms: Facebook, Instagram, Messenger, Audience Network
  - Placement continues to show detailed positions like Stories, Feed, Reels

---

## Previous Completed Tasks

### Reports Page - Entity + Special Breakdown Combinations
Enabled 2-dimensional reports combining entity breakdowns with special breakdowns.

### Internationalize Hardcoded English Text
Converted all hardcoded English text to use i18n translation system.

### Add Compare Periods to Targeting Page
Added period comparison functionality to the targeting page.

### Make Optimization Preferences Editable
Added edit functionality to the Optimization tab.

### Fix Creatives Page 500 Error
Fixed type mismatch in creative_repository.py.

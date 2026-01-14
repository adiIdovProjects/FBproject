# Project Tasks & Progress

## ✅ COMPLETED TASK: Reports Page - Entity + Special Breakdown Combinations

### Overview
Enabled 2-dimensional reports combining entity breakdowns (Campaign, Ad Set, Ad) with special breakdowns (Placement, Demographics, Country). Previously these were treated as mutually exclusive.

### Changes Made

#### 1. Frontend (FilterPanel.tsx)
- Modified `getSecondaryOptions()` to show special breakdowns as secondary options for entity breakdowns
- Added Placement, Demographics, Country as secondary options when Campaign/Ad Set/Ad is selected
- Simplified secondary prompt label to generic "Add grouping"
- Updated conversion metric hiding to work with entity + special combinations

#### 2. Backend Repository (breakdown_repository.py)
- Added `get_placement_by_entity()` - GROUP BY entity + placement
- Added `get_demographics_by_entity()` - GROUP BY entity + age/gender
- Added `get_country_by_entity()` - GROUP BY entity + country

#### 3. Backend Router (breakdowns.py)
- Added `GET /breakdowns/placement/by-entity` endpoint
- Added `GET /breakdowns/demographics/by-entity` endpoint
- Added `GET /breakdowns/country/by-entity` endpoint

#### 4. Backend Service (metrics_service.py)
- Added service methods to call the new repository methods
- Added response schema imports

#### 5. Backend Schemas (responses.py)
- Added `EntityPlacementBreakdown` schema
- Added `EntityDemographicsBreakdown` schema
- Added `EntityCountryBreakdown` schema

#### 6. Frontend Service (reports.service.ts)
- Added `fetchEntityBreakdownReport()` function
- Added helper functions: `isEntityBreakdown()`, `getEntityType()`, `getSpecialBreakdownType()`

#### 7. Frontend Page (reports/page.tsx)
- Updated `fetchData()` to detect entity + special combinations
- Routes to new API endpoints when combination is detected
- Updated conversion metric hiding logic for combinations

#### 8. Translations (en.json)
- Added `reports.builder.add_grouping` key

### Example Usage
- Select "Campaign" → click "Placement" in secondary → Shows "Campaign × Placement"
- Data displays as: "Campaign A - Instagram Feed", "Campaign A - Stories", etc.

---

## ✅ COMPLETED TASK: Internationalize Hardcoded English Text

### Overview
Converted all hardcoded English text in pages and components to use the i18n translation system.

### Changes Made

#### 1. Translation File (en.json)
- Added `auth.*` keys for login/magic link flow
- Added `onboarding.*` keys for Facebook connect flow
- Added `accounts.*` keys for account selection
- Added `quiz.*` keys for profile quiz (including nested job_titles, experience, referral)
- Added `settings.*` keys for account settings page

#### 2. Files Updated

| File | Changes |
|------|---------|
| [login/page.tsx](meta-dashboard/src/app/[locale]/login/page.tsx) | Passwordless login, magic link UI, social buttons, notes |
| [auth/verify/page.tsx](meta-dashboard/src/app/[locale]/auth/verify/page.tsx) | Verification states, error messages |
| [callback/page.tsx](meta-dashboard/src/app/[locale]/callback/page.tsx) | Login status messages |
| [select-accounts/page.tsx](meta-dashboard/src/app/[locale]/select-accounts/page.tsx) | Page title, error states, help text |
| [onboard/connect-facebook/page.tsx](meta-dashboard/src/app/[locale]/onboard/connect-facebook/page.tsx) | Step indicator, access info, button text |
| [quiz/page.tsx](meta-dashboard/src/app/[locale]/quiz/page.tsx) | All questions, options, sync status, completion |
| [AccountSelector.tsx](meta-dashboard/src/components/connect/AccountSelector.tsx) | Loading, empty state, selection UI |
| [AccountSettings.tsx](meta-dashboard/src/components/AccountSettings.tsx) | Profile form, billing, reconnect |

#### 3. Translation Sync
Ran `node scripts/sync-translations.mjs` to propagate all new keys to:
- Arabic (ar): 101 new translations
- German (de): 115 new translations
- French (fr): 127 new translations
- Hebrew (he): 112 new translations

### Summary
- **~70+ hardcoded strings** converted to dynamic translations
- All 5 languages now fully supported for auth, onboarding, and settings flows
- Uses `useTranslations()` hook consistently across all updated components

---

## Previous Tasks

### ✅ Add Compare Periods to Targeting Page (COMPLETED)
- Added period comparison functionality to the targeting page

### ✅ Make Optimization Preferences Editable (COMPLETED)
- Added edit functionality to the Optimization tab in AdAccountSettings.tsx

### ✅ Fix Creatives Page 500 Error (COMPLETED)
- Fixed type mismatch in creative_repository.py

# Project Tasks & Progress

## 🔨 CURRENT TASK: Add Compare Periods to Targeting Page

### Overview
Add period comparison functionality to the targeting page (`/targeting`), similar to how it's implemented in the creatives page. This includes:
1. Compare toggle in the "Targeting Type Comparison Table" (the summary table at the top)
2. Compare toggle for the "TargetingTable" (the ad sets table)

### Implementation Plan

#### 1. Backend Changes
- [x] Add `/api/v1/metrics/breakdowns/adset/comparison` endpoint in `metrics.py` router
- [x] Add `get_adset_breakdown_comparison()` method in `MetricsService`
- [x] Add `AdsetComparisonMetrics` schema in `responses.py`

#### 2. Frontend Service Layer
- [x] Add `fetchBreakdownWithComparison()` function in `campaigns.service.ts`

#### 3. Frontend Types
- [x] Extend `TargetingRow` type with comparison fields (previous_*, *_change_pct)
- [x] Extend `BreakdownRow` type with comparison fields

#### 4. Targeting Page Changes
- [x] Add `showComparison` state
- [x] Add Compare Periods toggle button
- [x] Conditionally call comparison endpoint when toggle is on
- [x] Update "Targeting Type Comparison Table" to show VS PREV columns
- [x] Update `formatMetrics` calculation to include previous period data
- [x] Add Total row to the Type Comparison Table

#### 5. TargetingTable Component Changes
- [x] Add `showComparison` prop
- [x] Add VS PREV columns conditionally
- [x] Add `renderChangeBadge` helper function

### Files to Modify
1. `backend/api/routers/metrics.py` - Add endpoint
2. `backend/api/services/metrics_service.py` - Add service method
3. `backend/api/schemas/responses.py` - Add schema
4. `meta-dashboard/src/services/campaigns.service.ts` - Add service function
5. `meta-dashboard/src/types/targeting.types.ts` - Extend types
6. `meta-dashboard/src/app/[locale]/targeting/page.tsx` - Add toggle & comparison UI
7. `meta-dashboard/src/components/targeting/TargetingTable.tsx` - Add comparison columns

### Notes
- The comparison calculates previous period as same duration before the selected date range
- CTR higher = better (green), CPC/CPA lower = better (green)
- Spend uses grey/neutral color (not red/green since higher/lower isn't inherently good/bad)
- Follows same pattern as creatives comparison implementation

---

## Review

### Changes Made
1. **Backend** (`backend/api/schemas/responses.py`): Added `AdsetComparisonMetrics` schema extending `AdsetBreakdown` with comparison fields
2. **Backend** (`backend/api/services/metrics_service.py`): Added `get_adset_breakdown_comparison()` method that fetches current period data, calculates previous period, and computes change percentages
3. **Backend** (`backend/api/routers/metrics.py`): Added `/api/v1/metrics/breakdowns/adset/comparison` endpoint
4. **Frontend Service** (`campaigns.service.ts`): Added `fetchBreakdownWithComparison()` function
5. **Frontend Types** (`targeting.types.ts`, `campaigns.types.ts`): Extended types with comparison fields
6. **Targeting Page** (`targeting/page.tsx`):
   - Added `showComparison` state and Compare Periods toggle
   - Updated data loading to use comparison endpoint when enabled
   - Updated Type Comparison Table with VS PREV columns
   - Added Total row to the Type Comparison Table
7. **TargetingTable Component** (`TargetingTable.tsx`):
   - Added `showComparison` prop
   - Added VS PREV columns for Spend, CTR, CPC, Conversions, CPA
   - Added `renderChangeBadge` helper with color coding

### Color Coding
- **Spend**: Grey/neutral (↑/↓ shown but no red/green)
- **CTR, Conversions**: Green for increase, Red for decrease (higher = better)
- **CPC, CPA**: Green for decrease, Red for increase (lower = better)

---

## Previous Tasks

### ✅ Make Optimization Preferences Editable (COMPLETED)
- Added edit functionality to the Optimization tab in AdAccountSettings.tsx

### ✅ Fix Creatives Page 500 Error (COMPLETED)
- Changed `COALESCE(cr.is_carousel, 0)` to `COALESCE(cr.is_carousel, FALSE)` in creative_repository.py
- Fixed type mismatch between boolean and integer in PostgreSQL


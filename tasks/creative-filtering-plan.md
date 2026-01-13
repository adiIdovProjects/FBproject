# Creative-Level Filtering Implementation Plan

## Overview
Allow users to select 1+ creatives from the table and filter all page sections (breakdown tabs, performance chart, Image vs Video cards) to show only data for those selected creatives.

## Current State
- ✅ Multi-select checkboxes implemented in CreativesTable
- ✅ `selectedCreativeIds` state tracked in creatives page
- ✅ Breakdown tabs already support `creative_id` filtering (backend ready)
- ❌ Trend/chart endpoint doesn't support creative filtering yet
- ❌ No "Apply Filter" UI mechanism

## Implementation Steps

### Phase 1: UI/UX (Frontend) - 1-2 hours

#### Task 1.1: Add Filter Toggle Button
**File**: `meta-dashboard/src/app/[locale]/creatives/page.tsx`
**Location**: Next to "Compare" button in filters section

Add new state:
```typescript
const [isFilterActive, setIsFilterActive] = useState(false);
const [filteredCreativeIds, setFilteredCreativeIds] = useState<number[]>([]);
```

Add button UI (when creatives selected):
```typescript
{selectedCreativeIds.length > 0 && (
  <button
    onClick={() => {
      setIsFilterActive(true);
      setFilteredCreativeIds(selectedCreativeIds);
    }}
    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
  >
    <Filter className="w-4 h-4" />
    <span>Filter Page ({selectedCreativeIds.length})</span>
  </button>
)}

{isFilterActive && (
  <button
    onClick={() => {
      setIsFilterActive(false);
      setFilteredCreativeIds([]);
      setSelectedCreativeIds([]);
    }}
    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
  >
    <X className="w-4 h-4" />
    <span>Clear Filter</span>
  </button>
)}
```

#### Task 1.2: Update Image vs Video Cards
**File**: `meta-dashboard/src/app/[locale]/creatives/page.tsx`
**Location**: `formatMetrics` useMemo

Filter creatives before calculating:
```typescript
const formatMetrics = useMemo(() => {
    // Filter creatives if filter is active
    const creativesToAnalyze = isFilterActive && filteredCreativeIds.length > 0
        ? creatives.filter(c => filteredCreativeIds.includes(c.creative_id))
        : creatives;

    const imageCreatives = creativesToAnalyze.filter(c => !c.is_video);
    const videoCreatives = creativesToAnalyze.filter(c => c.is_video);

    // ... rest of calculation logic
}, [creatives, isFilterActive, filteredCreativeIds]);
```

#### Task 1.3: Pass Filter to Breakdown Tabs
**File**: `meta-dashboard/src/app/[locale]/creatives/page.tsx`
**Location**: CreativeBreakdownTabs component

Update to handle multiple creative IDs:
```typescript
<CreativeBreakdownTabs
    dateRange={dateRange}
    currency={currency}
    isRTL={isRTL}
    accountId={selectedAccountId}
    creativeIds={isFilterActive ? filteredCreativeIds : null}  // Changed from creativeId to creativeIds
/>
```

#### Task 1.4: Update CreativeBreakdownTabs Component
**File**: `meta-dashboard/src/components/creatives/CreativeBreakdownTabs.tsx`

Change prop from single `creativeId` to array `creativeIds`:
```typescript
interface CreativeBreakdownTabsProps {
  dateRange: DateRange;
  currency?: string;
  isRTL?: boolean;
  accountId?: string | null;
  creativeIds?: number[] | null;  // Changed to array
}
```

Update fetchBreakdown calls to pass array:
```typescript
const data = await fetchBreakdown(
    dateRange,
    activeTab as BreakdownType,
    demographicSubTab,
    [],
    '',
    accountId,
    creativeIds  // Now passing array instead of single ID
);
```

#### Task 1.5: Update Trend Data Fetching
**File**: `meta-dashboard/src/app/[locale]/creatives/page.tsx`
**Location**: fetchTrend useEffect

```typescript
useEffect(() => {
    const fetchTrend = async () => {
        if (!dateRange.startDate || !dateRange.endDate) return;

        setIsTrendLoading(true);
        try {
            const data = await fetchTrendData(
                dateRange,
                granularity,
                selectedAccountId,
                isFilterActive ? filteredCreativeIds : null  // Add creative IDs
            );
            setTrendData(data || []);
        } catch (err: any) {
            console.error('[Creatives Page] Error fetching trend data:', err);
        } finally {
            setIsTrendLoading(false);
        }
    };

    fetchTrend();
}, [dateRange, granularity, selectedAccountId, isFilterActive, filteredCreativeIds]);  // Add dependencies
```

---

### Phase 2: Frontend Service Layer - 30 mins

#### Task 2.1: Update fetchTrendData Function
**File**: `meta-dashboard/src/services/campaigns.service.ts`

```typescript
export async function fetchTrendData(
  dateRange: DateRange,
  granularity: TimeGranularity = 'day',
  accountId?: string | null,
  creativeIds?: number[] | null  // Add parameter
): Promise<any[]> {
  const { startDate, endDate } = dateRange;
  try {
    const params: any = {
      start_date: startDate,
      end_date: endDate,
      granularity,
    };

    if (accountId) {
      params.account_id = accountId;
    }

    if (creativeIds && creativeIds.length > 0) {
      params.creative_ids = creativeIds;  // Add creative_ids parameter
    }

    const response = await apiClient.get<any[]>('/api/v1/metrics/trend', { params });
    return response.data;
  } catch (error) {
    console.error('[Campaigns Service] Error fetching trend data:', error);
    throw error;
  }
}
```

#### Task 2.2: Update fetchBreakdown Function
**File**: `meta-dashboard/src/services/campaigns.service.ts`

Change from single `creativeId` to array `creativeIds`:
```typescript
export async function fetchBreakdown(
  dateRange: DateRange,
  breakdownType: BreakdownType,
  groupBy: 'age' | 'gender' | 'both' = 'both',
  status: string[] = [],
  searchQuery: string = '',
  accountId?: string | null,
  creativeIds?: number[] | null  // Changed to array
): Promise<BreakdownRow[]> {
  // ... existing code ...

  if (creativeIds && creativeIds.length > 0) {
    params.creative_ids = creativeIds;  // Changed to array parameter
  }

  // ... rest of function
}
```

---

### Phase 3: Backend Updates - 2-3 hours

#### Task 3.1: Update Trend Endpoint Router
**File**: `backend/api/routers/metrics.py`

Add creative_ids parameter:
```python
from typing import List, Optional

@router.get("/trend", response_model=List[TimeSeriesDataPoint])
def get_trend_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    granularity: str = Query('day', regex="^(day|week|month)$"),
    account_id: Optional[str] = Query(None),
    creative_ids: Optional[List[int]] = Query(None),  # Add this
    db: Session = Depends(get_db)
):
    service = MetricsService(db)
    return service.get_trend_data(
        start_date=start_date,
        end_date=end_date,
        granularity=granularity,
        account_id=account_id,
        creative_ids=creative_ids  # Add this
    )
```

#### Task 3.2: Update MetricsService
**File**: `backend/api/services/metrics_service.py`

Add creative_ids parameter to get_trend_data:
```python
def get_trend_data(
    self,
    start_date: date,
    end_date: date,
    granularity: str = 'day',
    account_id: Optional[str] = None,
    creative_ids: Optional[List[int]] = None  # Add parameter
) -> List[TimeSeriesDataPoint]:
    # Resolve account IDs
    filtered_account_ids = self._resolve_account_ids(
        [int(account_id)] if account_id else None
    )

    # Get trend data from repository
    trend_data = self.historical_repo.get_trend_data(
        start_date,
        end_date,
        granularity,
        filtered_account_ids,
        creative_ids  # Pass to repository
    )

    # ... rest of logic
```

#### Task 3.3: Update Historical Repository
**File**: `backend/api/repositories/historical_repository.py`

Find the `get_trend_data` method and add creative filtering:
```python
def get_trend_data(
    self,
    start_date: date,
    end_date: date,
    granularity: str = 'day',
    account_ids: Optional[List[int]] = None,
    creative_ids: Optional[List[int]] = None  # Add parameter
) -> List[Dict[str, Any]]:
    # ... existing account filter logic ...

    # Add creative filter
    creative_filter = ""
    if creative_ids is not None and len(creative_ids) > 0:
        placeholders = ', '.join([f':creative_id_{i}' for i in range(len(creative_ids))])
        creative_filter = f"AND f.creative_id IN ({placeholders})"

    query = text(f"""
        SELECT
            d.date,
            SUM(f.spend) as spend,
            SUM(f.impressions) as impressions,
            SUM(f.clicks) as clicks,
            SUM(f.conversions) as conversions
        FROM fact_core_metrics f
        JOIN dim_date d ON f.date_id = d.date_id
        WHERE d.date >= :start_date
            AND d.date <= :end_date
            {account_filter}
            {creative_filter}  -- Add creative filter
        GROUP BY d.date
        ORDER BY d.date
    """)

    params = {
        'start_date': start_date,
        'end_date': end_date
    }

    # Add account params
    if account_ids:
        for i, aid in enumerate(account_ids):
            params[f'account_id_{i}'] = aid

    # Add creative params
    if creative_ids:
        for i, cid in enumerate(creative_ids):
            params[f'creative_id_{i}'] = cid

    # ... rest of logic
```

#### Task 3.4: Update Breakdown Repository (Already Supports Single ID)
**File**: `backend/api/repositories/breakdown_repository.py`

Update to support array of creative IDs instead of single:
```python
def get_placement_breakdown(
    self,
    start_date: date,
    end_date: date,
    campaign_id: Optional[int] = None,
    campaign_status: Optional[List[str]] = None,
    search_query: Optional[str] = None,
    account_ids: Optional[List[int]] = None,
    creative_ids: Optional[List[int]] = None  # Changed to array
) -> List[Dict[str, Any]]:
    # ... existing code ...

    # Update creative filter to handle array
    creative_filter = ""
    if creative_ids is not None and len(creative_ids) > 0:
        placeholders = ', '.join([f':creative_id_{i}' for i in range(len(creative_ids))])
        creative_filter = f"AND f.creative_id IN ({placeholders})"

    # ... in query WHERE clause ...

    # Add creative params
    if creative_ids:
        for i, cid in enumerate(creative_ids):
            params[f'creative_id_{i}'] = cid
```

Do the same for:
- `get_age_gender_breakdown()`
- `get_country_breakdown()`

#### Task 3.5: Update Breakdown Router
**File**: `backend/api/routers/breakdowns.py`

Change creative_id from single int to array:
```python
@router.get("/placement", response_model=List[PlacementBreakdown])
def get_placement_breakdown(
    start_date: date = Query(...),
    end_date: date = Query(...),
    campaign_id: Optional[int] = Query(None),
    creative_ids: Optional[List[int]] = Query(None),  # Changed to array
    db: Session = Depends(get_db)
):
    service = MetricsService(db)
    return service.get_placement_breakdown(
        start_date=start_date,
        end_date=end_date,
        campaign_id=campaign_id,
        creative_ids=creative_ids  # Pass array
    )
```

Update for all three endpoints (placement, age-gender, country).

#### Task 3.6: Update MetricsService Breakdown Methods
**File**: `backend/api/services/metrics_service.py`

Update all three breakdown methods to accept array:
```python
def get_placement_breakdown(
    self,
    start_date: date,
    end_date: date,
    campaign_id: Optional[int] = None,
    campaign_status: Optional[List[str]] = None,
    search_query: Optional[str] = None,
    account_ids: Optional[List[int]] = None,
    creative_ids: Optional[List[int]] = None  # Changed to array
) -> List[PlacementBreakdown]:
    # ... pass to repository ...
    breakdowns = self.breakdown_repo.get_placement_breakdown(
        start_date, end_date, campaign_id, campaign_status,
        search_query, filtered_account_ids, creative_ids  # Pass array
    )
```

---

## Testing Checklist

### Frontend Testing
- [ ] Select 1 creative → Click "Filter Page" → All sections update
- [ ] Select 3 creatives → Click "Filter Page" → All sections update
- [ ] Click "Clear Filter" → All sections show full data
- [ ] Image vs Video cards reflect filtered creatives
- [ ] Performance chart shows only filtered creatives' trends
- [ ] Breakdown tabs show only filtered creatives' breakdowns
- [ ] Filter persists when changing tabs
- [ ] Filter persists when changing date range

### Backend Testing
- [ ] `/api/v1/metrics/trend?creative_ids=123&creative_ids=456` returns correct data
- [ ] `/api/v1/metrics/breakdowns/placement?creative_ids=123` returns correct data
- [ ] `/api/v1/metrics/breakdowns/age-gender?creative_ids=123&creative_ids=456` returns correct data
- [ ] `/api/v1/metrics/breakdowns/country?creative_ids=123` returns correct data
- [ ] Without creative_ids parameter, returns all data (backward compatible)

---

## Estimated Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Frontend UI | Tasks 1.1 - 1.5 | 1-2 hours |
| Phase 2: Frontend Services | Tasks 2.1 - 2.2 | 30 mins |
| Phase 3: Backend | Tasks 3.1 - 3.6 | 2-3 hours |
| Testing | Full QA | 1 hour |
| **Total** | | **4.5-6.5 hours** |

---

## Nice-to-Have Enhancements (Optional)

1. **Filter Badge**: Show active filter count in header
2. **Filter Summary**: Show names of filtered creatives below filter button
3. **Quick Clear**: Add X button on each selected creative in table
4. **Save Filter**: Allow saving common creative combinations
5. **Filter History**: Show recently used filters
6. **Performance**: Add caching for filtered results

---

## Risk Assessment

**Low Risk** - This is a purely additive feature:
- ✅ Backward compatible (no breaking changes)
- ✅ Backend already supports single creative filtering
- ✅ Just extending to support arrays
- ✅ Frontend state management already in place
- ✅ Can be toggled on/off by user

## Dependencies

- None - self-contained feature

# Facebook Ads ETL Pipeline - Documentation for Claude

This document provides critical knowledge about the Facebook Ads ETL pipeline architecture, data flow, and important pitfalls to avoid.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [ETL Pipeline Flow](#etl-pipeline-flow)
3. [Critical: Large Integer Precision](#critical-large-integer-precision)
4. [Facebook API Integration](#facebook-api-integration)
5. [Database Schema](#database-schema)
6. [Key Files and Their Roles](#key-files-and-their-roles)
7. [Pitfalls and Gotchas](#pitfalls-and-gotchas)
8. [What NOT to Touch](#what-not-to-touch)
9. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Architecture Overview

**Pattern**: Extract → Transform → Load (ETL)
**Database**: PostgreSQL (Star Schema)
**API**: Facebook Marketing API (facebook-business SDK)
**Language**: Python 3.14+
**Key Libraries**: pandas, SQLAlchemy, facebook-business

### Data Flow
```
Facebook API
    ↓
[extractors/fb_api.py] → Raw DataFrames
    ↓
[transformers/] → Cleaned & Enriched DataFrames
    ↓
[utils/db_utils.py] → PostgreSQL (Star Schema)
```

---

## ETL Pipeline Flow

### Main Entry Point: `etl/main.py`

```python
class ETLPipeline:
    def run(start_date, end_date):
        1. _ensure_schema()          # Create tables if needed
        2. _extract_data()            # Pull from Facebook API
        3. _transform_data()          # Clean and enrich
        4. _load_dimensions()         # Load dimension tables
        5. _load_facts()              # Load fact tables
        6. _validate_loaded_data()    # Check data quality
```

### Step-by-Step Breakdown

#### 1. Extract (`extractors/fb_api.py`)

**Purpose**: Pull raw data from Facebook Marketing API

**Key Methods**:
- `get_core_metrics(days)` - Pulls ad performance metrics (spend, impressions, clicks)
- `get_breakdown_data(breakdowns, days)` - Pulls demographic breakdowns (age, gender, country)
- `get_metadata(df_core)` - **CRITICAL** - Fetches campaign/adset/ad names and statuses

**Data Pulled**:
- Core metrics: date, campaign_id, adset_id, ad_id, spend, impressions, clicks, conversions
- Metadata: campaign names, statuses, objectives (via separate API calls)
- Breakdowns: age, gender, country dimensions

**Parallel Processing**:
- Date chunks processed in parallel (ThreadPoolExecutor)
- Metadata fetched in parallel for each entity type

#### 2. Transform (`transformers/`)

**Purpose**: Clean, validate, and enrich raw data

**Key Transformers**:

1. **`core_transformer.py`** - Main data cleaning
   - Merges metadata (names, statuses) with core metrics
   - Handles click field fallback logic
   - Converts types, cleans nulls
   - **CRITICAL**: Handles large integer precision during merges

2. **`action_parser.py`** - Parse Facebook actions array
   - Extracts conversions (purchases, leads, add_to_cart)
   - Parses video engagement metrics
   - Creates fact_action_metrics rows

3. **`dimension_builder.py`** - Extract dimension tables
   - Builds dim_campaign, dim_adset, dim_ad
   - Assigns default values for missing data
   - Ensures referential integrity

4. **`fact_builder.py`** - Build fact tables
   - Aggregates metrics by dimension keys
   - Creates fact_core_metrics, fact_age_gender_metrics, etc.
   - Handles date_id foreign keys

#### 3. Load (`utils/db_utils.py`)

**Purpose**: Write DataFrames to PostgreSQL

**UPSERT Strategy**:
```sql
INSERT INTO table (columns...)
VALUES (...)
ON CONFLICT (primary_key)
DO UPDATE SET column = EXCLUDED.column
```

**Dimension Tables**: Update existing records (campaigns can change status)
**Fact Tables**: Insert new rows, update if already exists

---

## Critical: Large Integer Precision

### THE PROBLEM

Facebook campaign/adset/ad IDs are **18-digit integers** (e.g., `120213328950940104`).

**Python int**: Can handle arbitrarily large integers ✅
**pandas int64**: Can store up to 2^63-1 (19 digits) ✅
**pandas float64**: Loses precision after ~15 digits ❌

### WHY THIS MATTERS

When pandas DataFrames merge with `how='outer'`, pandas may convert int64 → float64 to handle NaN values, causing:
```python
120213328950940104  →  120213328950940096  # WRONG! Last digits corrupted
```

### THE SOLUTION (CRITICAL - DO NOT MODIFY)

**Location**: `extractors/fb_api.py` lines 251-303

**Strategy**: Convert IDs to STRING before merge, then back to int64 after

```python
# BEFORE MERGE: Convert all ID columns to strings
id_cols = [col for col in df_meta.columns if '_id' in col]
for col in id_cols:
    df_meta[col] = df_meta[col].astype(str)

# MERGE: Works with strings (no float conversion possible)
df_meta = df_meta.merge(df, on=common_cols, how='outer')

# AFTER MERGE: Convert strings back to int64
for col in id_cols:
    df_meta[col] = pd.to_numeric(df_meta[col], errors='coerce').fillna(0).astype('int64')
```

**NEVER**:
- Use `downcast='integer'` in `pd.to_numeric()` - causes integer overflow
- Remove the string conversion step - will cause ID corruption
- Modify the merge logic without preserving this pattern

---

## Facebook API Integration

### Authentication

**Location**: `.env` file (NOT in git)
```env
FACEBOOK_ACCESS_TOKEN=your_token
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_secret
FACEBOOK_AD_ACCOUNT_ID=your_account_id
```

**Initialization** (in `extractors/fb_api.py`):
```python
FacebookAdsApi.init(app_id, app_secret, access_token)
account = AdAccount(f'act_{account_id}')
```

### Two Types of API Calls

#### 1. Insights API (Metrics Data)
```python
insights = account.get_insights(
    fields=['date_start', 'campaign_id', 'spend', 'impressions', ...],
    params={
        'level': 'ad',  # or 'campaign', 'adset'
        'time_range': {'since': '2024-10-28', 'until': '2024-10-30'},
        'time_increment': 1,  # Daily
    }
)
```

**Returns**: Metrics (spend, clicks, conversions) but NOT names/statuses

#### 2. Object API (Metadata)
```python
campaign = Campaign(campaign_id)
data = campaign.api_get(fields=[
    Campaign.Field.name,
    Campaign.Field.status,
    Campaign.Field.objective
]).export_all_data()
```

**Returns**: Entity attributes (name, status, objective)

### Rate Limiting

**Error 80004**: "Too many calls to this ad-account"
- Facebook has rate limits per ad account
- Retry with exponential backoff (implemented in `_fetch_entity`)
- If testing extensively, wait 30-60 minutes for reset

### Field Availability

**CRITICAL**: Not all metrics exist for all date ranges
- Old data may not have `inline_link_clicks` (added later by Facebook)
- If field doesn't exist, Facebook doesn't return it
- Fallback logic in `core_transformer.py` handles missing fields

---

## Database Schema

### Star Schema Design

**Fact Tables** (metrics):
- `fact_core_metrics` - Daily ad performance (spend, clicks, impressions)
- `fact_age_gender_metrics` - Breakdowns by age/gender
- `fact_country_metrics` - Breakdowns by country
- `fact_action_metrics` - Conversion events

**Dimension Tables** (entities):
- `dim_campaign` - Campaign details (name, status, objective)
- `dim_adset` - Ad Set details
- `dim_ad` - Ad details
- `dim_date` - Date dimension (for reporting)
- `dim_age_group` - Age ranges
- `dim_gender` - Gender values
- `dim_country` - Countries
- `dim_action_type` - Conversion types

### Foreign Key Pattern

Fact tables reference dimensions by ID:
```sql
fact_core_metrics (
    date_id → dim_date.date_id,
    campaign_id → dim_campaign.campaign_id,
    adset_id → dim_adset.adset_id,
    ad_id → dim_ad.ad_id
)
```

### Unknown Member (ID=0)

Each dimension has a record with ID=0 for "Unknown":
- Used when metadata fetch fails
- Prevents orphaned fact records
- Allows ETL to continue even with API errors

---

## Key Files and Their Roles

### Configuration
- **`config/settings.py`** - All configuration constants
  - `BASE_FIELDS_TO_PULL` - Fields requested from Facebook API
  - `FIRST_PULL_DAYS` - Days to pull on first run (450)
  - `CHUNK_DAYS` - Days per parallel chunk (7)
  - Static dimension lists (age groups, genders)

### Extractors
- **`extractors/fb_api.py`** - Facebook API client
  - 700+ lines - handles all API communication
  - Parallel processing with ThreadPoolExecutor
  - Retry logic with exponential backoff
  - **CONTAINS CRITICAL ID PRECISION CODE**

### Transformers
- **`transformers/core_transformer.py`** - Main transformation logic
  - Click field fallback cascade
  - Metadata merge validation
  - Type conversions

- **`transformers/action_parser.py`** - Parse Facebook actions
  - Extracts purchases, leads, add_to_cart from nested JSON
  - Video engagement metrics

- **`transformers/dimension_builder.py`** - Build dimension tables
  - Assigns default values ("Unknown Campaign")
  - Deduplicates entities

- **`transformers/fact_builder.py`** - Build fact tables
  - Aggregates metrics
  - Maps to dimension IDs

### Database
- **`models/schema.py`** - SQLAlchemy table definitions
  - All CREATE TABLE statements
  - Primary keys, indexes

- **`utils/db_utils.py`** - Database utilities
  - UPSERT operations
  - Connection management
  - Lookup caching

### Orchestration
- **`etl/main.py`** - Main pipeline orchestrator
  - Coordinates extract → transform → load
  - Validation reporting
  - Error handling

---

## Pitfalls and Gotchas

### 1. Campaign ID Corruption (CRITICAL)

**Symptom**: Campaign names show "Unknown Campaign" despite API returning data

**Root Cause**: Large integers (18 digits) lose precision when pandas converts int64 → float64 during merge

**Solution**: String-based merge (lines 251-303 in `fb_api.py`)

**DO NOT**:
- Remove string conversion before merge
- Use `downcast='integer'` anywhere
- Modify merge logic without understanding precision issue

### 2. Click Fields Missing

**Symptom**: All clicks = 0 despite having impressions

**Root Cause**:
- Old data doesn't have `inline_link_clicks` field
- Facebook didn't return field because no data exists

**Solution**: Fallback cascade in `core_transformer.py` lines 250-317
```python
Priority: inline_link_clicks → link_clicks → outbound_clicks → clicks
```

**DO NOT**:
- Assume all fields always exist
- Remove fallback logic

### 3. Metadata vs Insights Separation

**CRITICAL**: Campaign names/statuses are NOT in insights API

You must:
1. Pull insights (metrics) from `get_insights()`
2. Pull metadata (names) from object API via `get_metadata()`
3. Merge them together

**DO NOT**:
- Expect insights API to return entity names
- Skip the metadata extraction step

### 4. Python Cache (.pyc files)

**Symptom**: Code changes not reflected in ETL runs

**Root Cause**: Python caches bytecode in `__pycache__` directories

**Solution**: Clear cache after major changes
```bash
find backend -type f -name "*.pyc" -delete
find backend -type d -name "__pycache__" -exec rm -rf {} +
```

### 5. Rate Limiting (Error 80004)

**Symptom**: API calls fail with "Too many calls to this ad-account"

**Solution**:
- Wait 30-60 minutes
- Reduce parallel workers (META_MAX_WORKERS in fb_api.py)
- Use smaller date ranges during testing

### 6. Empty Date Ranges

**Symptom**: ETL finds 0 rows, exits early

**Cause**:
- No ad spend during date range
- Pulling future dates
- Pulling dates before account existed

**Solution**: Check date range matches actual campaign activity

---

## What NOT to Touch

### ❌ DO NOT MODIFY Without Understanding:

1. **Large Integer Precision Code** (`fb_api.py` lines 251-303)
   - String-based merge logic
   - Any code dealing with campaign_id/adset_id/ad_id conversion
   - Reason: Will cause ID corruption

2. **Metadata Extraction Logic** (`fb_api.py` lines 179-327)
   - Parallel metadata fetching
   - Entity ID extraction
   - Reason: Critical for campaign names to appear

3. **Click Fallback Logic** (`core_transformer.py` lines 250-317)
   - Field availability checks
   - Cascading fallback priority
   - Reason: Ensures clicks data is captured

4. **UPSERT Logic** (`db_utils.py` save_dataframe function)
   - ON CONFLICT handling
   - Reason: Prevents duplicate records and maintains data integrity

5. **Field Configuration** (`settings.py` BASE_FIELDS_TO_PULL)
   - Especially: `inline_link_clicks`, `outbound_clicks`
   - Reason: Required for clicks data

### ✅ Safe to Modify:

1. **Date ranges** - Change FIRST_PULL_DAYS, DAILY_PULL_DAYS
2. **Logging levels** - Adjust log verbosity
3. **Parallel workers** - Tune MAX_WORKERS, META_MAX_WORKERS
4. **Validation thresholds** - Adjust warning percentages in `_validate_loaded_data()`
5. **Breakdowns** - Add/remove age groups, genders in settings.py

---

## Common Issues and Solutions

### Issue: "No matching campaign IDs between data and metadata!"

**Diagnosis**: Campaign ID overlap = 0%

**Possible Causes**:
1. ID corruption during merge (float64 conversion)
2. Metadata API calls all failed (check for error logs)
3. Type mismatch (string vs int)

**Solution**:
1. Check for `[MERGE DEBUG]` logs showing IDs before/after merge
2. Verify `✅ ID integrity preserved` message appears
3. Check for API errors in metadata fetch section
4. Ensure string-based merge is active

### Issue: "All campaign names = 'Unknown Campaign'"

**Diagnosis**: Validation shows 100% unknown campaigns

**Possible Causes**:
1. Metadata merge failed (see above)
2. API rate limited during metadata fetch
3. Access token lacks permissions

**Solution**:
1. Check Campaign ID overlap in logs
2. Look for API error messages (80004, 190, 100)
3. Wait for rate limit reset
4. Verify token has `ads_read` permission

### Issue: "All clicks = 0 but impressions > 0"

**Diagnosis**: CTR = 0% in validation report

**Possible Causes**:
1. `inline_link_clicks` not in BASE_FIELDS_TO_PULL
2. Old data from before Facebook added the field
3. Fallback logic not triggered

**Solution**:
1. Verify `inline_link_clicks` in settings.py
2. Check logs for "Using inline_link_clicks" message
3. Check if date range has actual click data

### Issue: ETL takes too long / times out

**Possible Causes**:
1. Too many days to pull (FIRST_PULL_DAYS too high)
2. Too many parallel workers causing rate limits
3. Large number of campaigns/ads

**Solution**:
1. Reduce FIRST_PULL_DAYS for testing
2. Reduce MAX_WORKERS and META_MAX_WORKERS
3. Use smaller CHUNK_DAYS

---

## Debugging Checklist

When investigating issues, check these in order:

### 1. Environment
- [ ] .env file exists with valid credentials
- [ ] Facebook access token not expired
- [ ] Database connection works

### 2. API Communication
- [ ] Check for API errors in logs (80004, 190, 100)
- [ ] Verify fields requested match what Facebook returns
- [ ] Check rate limiting messages

### 3. Data Extraction
- [ ] Core data extracted (check row count in logs)
- [ ] Metadata extracted (check "Retrieved X campaign records")
- [ ] Campaign IDs correct format (ending in correct digits)

### 4. Data Transformation
- [ ] Metadata merge succeeded (Campaign ID overlap > 0%)
- [ ] Click fields available and populated
- [ ] No type conversion errors

### 5. Data Load
- [ ] Fact tables loaded (check row counts)
- [ ] Dimension tables updated
- [ ] No foreign key violations

### 6. Validation
- [ ] Campaign names not all "Unknown Campaign"
- [ ] Clicks > 0 when impressions > 0
- [ ] Campaign statuses not all "UNKNOWN"

---

## Quick Reference: Log Messages to Look For

### ✅ Success Indicators
```
✅ Core data extracted: 1754 rows
✓ Retrieved 15 campaign records
✅ ID integrity preserved through merge!
Campaign ID overlap: 15 out of 15 data IDs
✓ Using inline_link_clicks (sum: 5,800)
✅ fact_core_metrics: 135 rows upserted
CTR: 0.35%
```

### ❌ Error Indicators
```
❌ ID CORRUPTION DETECTED!
Campaign ID overlap: 0 out of 15 data IDs
⚠️ No matching campaign IDs between data and metadata!
[METADATA] ✗ API ERROR for campaign ID=... (80004)
⚠️ WARNING: 100.0% of campaigns have 'Unknown Campaign' name
❌ CRITICAL: 0 clicks but impressions > 0
```

---

## Version History

**Current Version**: All 6 fixes applied
- ✅ Fix 1: Added inline_link_clicks, outbound_clicks fields
- ✅ Fix 2: Implemented click fallback cascade
- ✅ Fix 3: String-based merge for ID precision
- ✅ Fix 4: Enhanced error handling with specific error codes
- ✅ Fix 5: Merge validation with diagnostics
- ✅ Fix 6: Post-load data validation

**Known Working State**: December 19, 2025
- Clicks: 5,800 total, CTR: 0.35%
- Campaign names: Working (when not rate limited)
- Large integer precision: Preserved

---

## Contact / Further Reading

**Facebook Marketing API Docs**: https://developers.facebook.com/docs/marketing-apis
**Pandas Precision Issues**: https://pandas.pydata.org/docs/user_guide/gotchas.html#support-for-integer-na
**Rate Limiting**: https://developers.facebook.com/docs/graph-api/overview/rate-limiting

---

*Last Updated: 2025-12-19*
*Critical fixes for campaign ID precision and click data extraction applied and verified.*

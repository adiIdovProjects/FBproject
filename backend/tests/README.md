# Backend Tests and Debug Scripts

This directory contains test scripts and debug utilities for the Facebook Ads ETL pipeline.

## Test Scripts

### Data Validation Tests
- **`test_astype_str.py`** - Verifies `.astype(str)` doesn't corrupt large 18-digit integers
- **`test_pandas_merge.py`** - Tests pandas merge behavior with large integers to ensure no precision loss
- **`test_facebook_response.py`** - Tests Facebook API response parsing

### Integration Tests
- **`database_testing.py`** - Database connection and query tests
- **`diagnose_data.py`** - Data quality diagnostics

### Configuration Tests
- **`test_settings.py`** - Verifies settings are loaded correctly and BASE_FIELDS_TO_PULL is populated

## Debug Scripts

### API Testing
- **`debug_api_fields.py`** - Tests what fields Facebook API actually returns for a specific date
  - Useful for verifying field availability
  - Tests both insights API and metadata API
  - Run: `python debug_api_fields.py`

### Quick ETL Tests
- **`test_etl_fresh.py`** - Quick single-day ETL test with custom date range

## Running Tests

### Individual Test
```bash
cd backend
python tests/test_pandas_merge.py
```

### Debug API Fields
```bash
cd backend
python tests/debug_api_fields.py
```

## Important Notes

- These are standalone test scripts, not pytest-based unit tests
- Each script is self-contained and can run independently
- Debug scripts require `.env` file with valid Facebook credentials
- Test scripts that verify integer precision are critical for maintaining data integrity

## Test Data

Test date used: **2024-10-28** (known to have data in the Facebook account)

## When to Run These Tests

1. **After modifying fb_api.py** - Run `test_pandas_merge.py` and `test_astype_str.py`
2. **After changing BASE_FIELDS_TO_PULL** - Run `test_settings.py` and `debug_api_fields.py`
3. **When debugging data issues** - Run `diagnose_data.py`
4. **When testing API changes** - Run `debug_api_fields.py`

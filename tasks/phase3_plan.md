# Phase 3: ETL Per-User Refactoring

## Goal
Make the ETL pipeline work with individual user tokens so each user can sync their own ad account data after OAuth.

## Current Status
- ✅ Backend OAuth setup complete (Facebook + Google)
- ✅ Users can log in and link ad accounts  
- ❌ ETL currently uses global .env credentials
- ❌ ETL needs to run per-user with their specific access tokens

## Implementation Steps

### Step 1: Modify FacebookExtractor to Accept User Tokens
**File**: backend/extractors/fb_api.py
- Update __init__() to accept optional access_token and account_id parameters
- Keep backward compatibility with .env credentials
- Store user_id for tracking

### Step 2: Add run_for_user() Method to ETL
**File**: backend/etl/main.py
- Add new method: run_for_user(user_id, account_ids)
- Fetch user's fb_access_token from database
- Check if token is expired
- Run ETL for each of user's linked accounts

### Step 3: Add Token Expiration Checking
- Add method to check token validity in user_repository
- Skip ETL if token expired

### Step 4: Wire Up Background ETL Trigger
**File**: backend/api/routers/auth.py
- Update run_etl_for_user() function
- Call ETLPipeline().run_for_user()

### Step 5: Test End-to-End
- Login with Facebook
- Link accounts
- Verify ETL runs with user token
- Check data in dashboard

## Files to Modify
1. backend/extractors/fb_api.py (~10 lines)
2. backend/etl/main.py (~50 lines)
3. backend/api/repositories/user_repository.py (~15 lines)
4. backend/api/routers/auth.py (~5 lines)


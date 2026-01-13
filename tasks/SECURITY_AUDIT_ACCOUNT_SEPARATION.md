# Security Audit: Account Separation & Data Isolation

**Audit Date:** 2026-01-12
**Auditor:** Claude Code (Senior Security Review)
**Scope:** Backend account separation, user authorization, and AI data leakage prevention

---

## Executive Summary

### Overall Security Posture: ⚠️ **CRITICAL VULNERABILITIES FOUND**

The application has **CRITICAL security vulnerabilities** that allow users to access data from other users' accounts through the AI query endpoint. The main architecture is sound, but the AI service bypasses all security controls.

**Risk Level:** 🔴 **HIGH - Immediate action required**

---

## ✅ What's Working Correctly

### 1. Authentication Layer (✅ SECURE)
- **File:** `backend/api/dependencies.py`
- JWT-based authentication with proper token validation
- `get_current_user()` dependency correctly extracts and validates user identity
- DEV_BYPASS_AUTH flag properly isolated to development only

### 2. Service Layer Account Filtering (✅ SECURE)
- **File:** `backend/api/services/metrics_service.py:56-81`
- `_get_user_account_ids()` properly fetches user's linked accounts
- `_resolve_account_ids()` validates requested accounts against user's permissions
- Proper intersection logic: only returns accounts user has access to

**Example (Line 64-81):**
```python
def _resolve_account_ids(self, requested_ids: Optional[List[int]]) -> List[int]:
    user_account_ids = self._get_user_account_ids() or []

    if requested_ids:
        # Intersection of requested and allowed
        filtered = [aid for aid in requested_ids if aid in user_account_ids]
        return filtered if filtered else []

    return user_account_ids
```

### 3. Repository Layer (✅ SECURE)
All repository methods properly accept and filter by `account_ids`:
- `MetricsRepository.get_aggregated_metrics()` ✅
- `CreativeRepository.get_creative_metrics()` ✅
- `CampaignRepository.get_campaign_breakdown()` ✅
- `TimeSeriesRepository.get_time_series()` ✅

**Example SQL Filtering:**
```sql
WHERE d.date >= :start_date
  AND d.date <= :end_date
  AND f.account_id IN (:acc_id_0, :acc_id_1, ...)
```

### 4. Router Endpoints (✅ MOSTLY SECURE)
Most routers properly:
- Use `Depends(get_current_user)` for authentication
- Pass `user_id` to service layer
- Accept `account_id` parameter and convert to list

**Good Examples:**
- `metrics.py` ✅ - All endpoints use `current_user.id`
- `insights.py` ✅ - All endpoints use `current_user.id`
- `creatives.py` ✅ - All endpoints use `current_user.id`
- `accounts.py` ✅ - Uses `verify_account_access()` helper
- `users.py` ✅ - Only returns current user's data

### 5. Account-Level Authorization (✅ SECURE)
- **File:** `backend/api/routers/accounts.py:17-26`
- `verify_account_access()` helper properly validates user owns account
- Used consistently in all account-specific endpoints

**Example:**
```python
def verify_account_access(account_id: str, user_id: int, db: Session) -> bool:
    user_repo = UserRepository(db)
    user_account_ids = user_repo.get_user_account_ids(user_id)
    account_id_int = int(account_id)
    return account_id_int in user_account_ids
```

---

## 🔴 CRITICAL VULNERABILITIES

### 1. AI Service - Complete Authorization Bypass (🔴 CRITICAL)

**File:** `backend/api/services/ai_service.py:252-311`
**Router:** `backend/api/routers/ai.py:45-63`

**Problem:** The AI query endpoint (`/api/v1/ai/query`) fetches data from ALL accounts without any user filtering.

**Vulnerable Code:**
```python
# Line 296-300 - NO account_ids parameter!
campaign_data = self.campaign_repo.get_campaign_breakdown(
    start_date=start_date,
    end_date=end_date,
    limit=50
)

# Line 303-304 - NO account_ids parameter!
overview = self.repository.get_aggregated_metrics(start_date, end_date)
prev_overview = self.repository.get_aggregated_metrics(prev_start, prev_end)

# Line 307-311 - NO account_ids parameter!
daily_trends = self.timeseries_repo.get_time_series(
    start_date=start_date,
    end_date=end_date,
    granularity='day'
)
```

**Impact:**
- ❌ User A can see User B's campaign data via AI queries
- ❌ User A can see User B's spend, conversions, ROI
- ❌ User A can ask "What are my campaigns?" and get ALL campaigns from ALL users
- ❌ Business intelligence and competitive data exposed to wrong users

**Exploit Scenario:**
```
User A asks: "What campaigns are spending the most?"
AI responds with User B's campaigns because no filtering is applied
```

**Root Cause:**
1. `AIService.__init__()` doesn't accept or store `user_id`
2. Router endpoint has `current_user` in dependencies but never uses it
3. No account filtering applied before sending data to AI

---

### 2. AI Router - User Context Not Passed (🔴 CRITICAL)

**File:** `backend/api/routers/ai.py:45-63`

**Problem:**
```python
@router.post("/query")
async def query_ai(
    request: Request,
    query_request: AIQueryRequest,
    db: Session = Depends(get_db)
):
    service = AIService(db)  # ❌ No user_id passed!
    return await service.query_data(query_request.question, account_id)
```

**Issues:**
- ❌ `current_user` is in dependencies but NEVER used
- ❌ Only `account_id` is passed (from client, not validated)
- ❌ No verification that user owns the account_id they're querying

---

### 3. Budget Optimizer Service - Potential Cross-Account Access (⚠️ HIGH)

**File:** `backend/api/services/budget_optimizer.py` (referenced in ai_service.py:116)

**Concern:** Budget recommendations are generated without user context filtering.

**Line 280:**
```python
budget_answer = await self._generate_budget_recommendations(start_date, end_date)
```

No `user_id` or `account_ids` passed to budget optimizer.

---

## 🟡 Medium Priority Issues

### 1. Account Quiz Context Leakage (🟡 MEDIUM)

**File:** `backend/api/services/ai_service.py:314-331`

**Issue:** AI service fetches account context (business description, goals) using only `account_id` from client without validating user ownership.

```python
# Line 318 - No ownership verification!
quiz = account_repo.get_account_quiz(int(account_id))
```

**Impact:** User could potentially query another user's business context if they guess the account_id.

**Mitigation:** Always verify account ownership before fetching context.

---

### 2. Cache Keys Don't Include User ID (🟡 MEDIUM)

**File:** `backend/api/services/ai_service.py:131-134`

**Issue:** Cache keys only include question and account_id, not user_id.

```python
def _get_cache_key(self, question: str, start_date: date, end_date: date) -> str:
    key_str = f"{question}:{start_date}:{end_date}"
    return hashlib.md5(key_str.encode()).hexdigest()
```

**Impact:**
- User A queries data for Account X
- Cache stores response
- User B queries same question → gets User A's cached results (if no account filtering fixed)

**Fix:** Include `user_id` in cache key.

---

## ✅ Best Practices Observed

1. **UserRepository** properly implements `get_user_account_ids()` for filtering
2. **Service pattern** correctly separates user context resolution from data fetching
3. **Router pattern** consistently uses `Depends(get_current_user)`
4. **SQL injection protection** via SQLAlchemy parameter binding
5. **Account linking** properly enforced via `UserAdAccount` join table

---

## 🔧 Required Fixes (Priority Order)

### 1. Fix AI Service Authorization (🔴 CRITICAL - DO FIRST)

**File:** `backend/api/services/ai_service.py`

**Changes Required:**

```python
# Step 1: Add user_id to __init__
class AIService:
    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id  # ADD THIS
        self.repository = MetricsRepository(db)
        # ... rest of init

# Step 2: Add helper method (like MetricsService)
def _get_user_account_ids(self) -> Optional[List[int]]:
    """Get account IDs for current user"""
    if not self.user_id:
        return None
    from backend.api.repositories.user_repository import UserRepository
    user_repo = UserRepository(self.db)
    return user_repo.get_user_account_ids(self.user_id)

# Step 3: Update query_data to filter by user accounts
async def query_data(self, question: str, account_id: Optional[str] = None):
    # Get user's allowed accounts
    user_account_ids = self._get_user_account_ids() or []

    # Validate account_id if provided
    if account_id:
        account_id_int = int(account_id)
        if account_id_int not in user_account_ids:
            raise HTTPException(status_code=403, detail="Access denied to this account")
        filtered_account_ids = [account_id_int]
    else:
        filtered_account_ids = user_account_ids

    # Pass account_ids to ALL repository calls
    campaign_data = self.campaign_repo.get_campaign_breakdown(
        start_date=start_date,
        end_date=end_date,
        limit=50,
        account_ids=filtered_account_ids  # ADD THIS
    )

    overview = self.repository.get_aggregated_metrics(
        start_date, end_date,
        account_ids=filtered_account_ids  # ADD THIS
    )

    # ... same for all other calls
```

### 2. Fix AI Router to Pass User Context (🔴 CRITICAL)

**File:** `backend/api/routers/ai.py`

```python
@router.post("/query")
async def query_ai(
    request: Request,
    query_request: AIQueryRequest,
    current_user=Depends(get_current_user),  # Already here!
    db: Session = Depends(get_db)
):
    # Pass user_id to service
    service = AIService(db, user_id=current_user.id)  # FIX THIS

    account_id = None
    if query_request.context and 'accountId' in query_request.context:
        account_id = str(query_request.context['accountId'])

    return await service.query_data(query_request.question, account_id)
```

### 3. Fix Budget Optimizer (⚠️ HIGH)

**File:** `backend/api/services/budget_optimizer.py`

**Action:** Audit and update `SmartBudgetOptimizer` to accept and filter by `account_ids`.

### 4. Add User ID to Cache Keys (🟡 MEDIUM)

**File:** `backend/api/services/ai_service.py:131-134`

```python
def _get_cache_key(self, question: str, start_date: date, end_date: date) -> str:
    key_str = f"{self.user_id}:{question}:{start_date}:{end_date}"  # ADD user_id
    return hashlib.md5(key_str.encode()).hexdigest()
```

### 5. Validate Account Ownership for Context (🟡 MEDIUM)

**File:** `backend/api/services/ai_service.py:314-331`

```python
# Before fetching quiz
if account_id:
    user_account_ids = self._get_user_account_ids()
    if int(account_id) not in user_account_ids:
        logger.warning(f"User {self.user_id} attempted to access account {account_id}")
        account_context_str = ""  # Deny access silently
    else:
        # Fetch context only if authorized
        quiz = account_repo.get_account_quiz(int(account_id))
```

---

## Testing Recommendations

### 1. Create Security Test Suite

Create `tests/security/test_account_separation.py`:

```python
def test_user_cannot_query_other_user_campaigns():
    """Ensure User A cannot see User B's campaigns via AI"""
    # Create User A with Account 1
    # Create User B with Account 2
    # Login as User A
    # Query AI: "What are my campaigns?"
    # Assert: Response only includes Account 1 campaigns
    # Assert: Account 2 campaigns NOT in response

def test_account_id_validation():
    """Ensure users cannot query accounts they don't own"""
    # Login as User A
    # Try to query with Account B's ID
    # Assert: 403 Forbidden response
```

### 2. Manual Penetration Testing

```bash
# Test 1: Query without account filter
POST /api/v1/ai/query
Authorization: Bearer {user_a_token}
Body: {"question": "What campaigns spent the most?"}
# Expected: Only User A's campaigns
# Verify: No User B data in response

# Test 2: Query with unauthorized account_id
POST /api/v1/ai/query
Authorization: Bearer {user_a_token}
Body: {
  "question": "Show campaign performance",
  "context": {"accountId": {user_b_account_id}}
}
# Expected: 403 Forbidden
# Actual (before fix): Returns User B's data 🔴
```

---

## Compliance & Regulatory Impact

### GDPR Implications
- ❌ **Data breach** - User A accessing User B's data violates GDPR Article 32 (Security of Processing)
- ❌ **Unauthorized access** - No consent for cross-user data sharing

### SOC 2 Implications
- ❌ **CC6.1** - Logical and physical access controls not properly implemented
- ❌ **CC6.6** - Unauthorized access to data not prevented

### Potential Legal/Business Risk
- **High:** Customers could sue for data breach
- **High:** Competitive intelligence leaked between competitors
- **Medium:** Reputational damage if disclosed publicly

---

## Summary Table

| Component | Status | Issue | Priority |
|-----------|--------|-------|----------|
| Authentication | ✅ Secure | None | - |
| Service Layer (Metrics) | ✅ Secure | None | - |
| Repositories | ✅ Secure | None | - |
| Routers (Most) | ✅ Secure | None | - |
| Accounts Router | ✅ Secure | None | - |
| **AI Service** | 🔴 **CRITICAL** | No account filtering | **P0** |
| **AI Router** | 🔴 **CRITICAL** | User context not passed | **P0** |
| Budget Optimizer | ⚠️ Unverified | Needs audit | **P1** |
| Account Quiz Context | 🟡 Medium | No ownership check | **P2** |
| Cache Keys | 🟡 Medium | Missing user_id | **P2** |

---

## Recommended Deployment Plan

1. **Immediate (Today):**
   - ✅ Review this audit with team
   - ✅ Confirm vulnerability in staging environment
   - 🔴 **Disable AI query endpoint in production** until fixed

2. **Next 24 Hours:**
   - Fix AI service account filtering
   - Fix AI router user context
   - Add security tests
   - Test thoroughly in staging

3. **Next 48 Hours:**
   - Audit budget optimizer service
   - Fix cache key issue
   - Deploy to production with monitoring

4. **Next Week:**
   - Add comprehensive security test suite
   - Conduct penetration testing
   - Review all other services for similar patterns

---

## Conclusion

**Overall Assessment:** The application has a solid security foundation, but the AI integration completely bypasses all security controls. This is a **critical vulnerability** that must be fixed immediately.

**Good News:** The fix is straightforward because the proper patterns already exist in `MetricsService`. We just need to apply the same pattern to `AIService`.

**Estimated Fix Time:** 2-3 hours for critical fixes + testing

**Risk if Not Fixed:** ⚠️ **HIGH** - User data breach, GDPR violation, potential lawsuits

---

**Auditor Notes:**
- The codebase shows good security practices in most areas
- The AI feature was likely added quickly without following existing patterns
- No malicious intent detected - appears to be an oversight
- Once fixed, security posture will be strong

**Next Steps:** Implement fixes in order of priority, then re-audit AI service.

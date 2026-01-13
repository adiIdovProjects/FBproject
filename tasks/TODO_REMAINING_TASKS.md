# Remaining Tasks for Complete Account Separation

**Status:** 🟡 Critical fixes done, minor issues remain
**Priority:** Medium (not critical, but should be fixed)

---

## ✅ What's Already Fixed (Complete)

- [x] AI Service account filtering (CRITICAL)
- [x] AI Router user context (CRITICAL)
- [x] Budget Optimizer account filtering (HIGH)
- [x] Cache key isolation (HIGH)
- [x] Account quiz validation (MEDIUM)

---

## 🟡 What Still Needs Attention

### 1. **Suggested Questions Endpoint** (🟡 MEDIUM Priority)

**File:** `backend/api/routers/ai.py:24-37`

**Issue:** The `/suggested-questions` endpoint doesn't pass user context to AIService.

**Current Code:**
```python
@router.get("/suggested-questions")
async def get_suggested_questions(db: Session = Depends(get_db)):
    service = AIService(db)  # ❌ No user_id
    return await service.get_suggested_questions()
```

**Impact:**
- `get_suggested_questions()` checks database for video/demographic data
- Currently checks ALL users' data (not just current user's)
- Low security risk (only reveals data types, not actual data)
- But incorrect - suggests video questions even if user has no videos

**Fix:**
```python
@router.get("/suggested-questions")
async def get_suggested_questions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    service = AIService(db, user_id=current_user.id)  # ✅ Pass user_id
    return await service.get_suggested_questions()
```

**Then update `ai_service.py` method:**
```python
async def get_suggested_questions(self) -> Dict[str, List[str]]:
    # Add account filter
    account_filter, params = self._build_account_filter()

    has_video = self.db.execute(text(f"""
        SELECT EXISTS(
            SELECT 1 FROM fact_core_metrics f
            WHERE f.video_plays > 0
            {account_filter}
            LIMIT 1
        )
    """), params).scalar()

    # Same for demographics check
```

---

### 2. **Cleanup Service** (🟢 LOW Priority)

**File:** `backend/api/services/cleanup_service.py`

**Issue:** Cleanup service doesn't validate account ownership before deletion.

**Current Code:**
```python
class CleanupService:
    def __init__(self, db: Session):
        self.db = db
```

**Impact:**
- Used in `/users/me/accounts/{account_id}` DELETE endpoint
- Router DOES check ownership (line 85-91 in users.py)
- Service itself doesn't double-check
- LOW risk because router validates first

**Action:** No fix needed (router already validates), but could add defensive check.

---

### 3. **Testing** (⚠️ HIGH Priority)

**What's needed:**
- [ ] Manual testing with 2 users
- [ ] Verify AI queries only show user's data
- [ ] Test unauthorized account access (should fail)
- [ ] Test budget optimization isolation
- [ ] Test cache isolation
- [ ] Optional: Create automated security tests

**Estimated Time:** 30-60 minutes

---

### 4. **Deployment** (⚠️ HIGH Priority)

**Steps:**
- [ ] Test in staging environment
- [ ] Review logs for errors
- [ ] Deploy to production
- [ ] Monitor for 24-48 hours

**Estimated Time:** 2-4 hours (including monitoring)

---

### 5. **Documentation** (🟢 LOW Priority - NICE TO HAVE)

**Optional improvements:**
- [ ] Add security section to README
- [ ] Document account separation architecture
- [ ] Add inline code comments explaining security checks
- [ ] Create onboarding doc for new developers

**Estimated Time:** 1-2 hours

---

## Priority Recommendation

### Do Now (Critical):
1. ✅ **Test the critical fixes** (AI query, budget optimizer)
2. ⚠️ **Deploy to staging**

### Do Soon (This Week):
3. 🟡 **Fix suggested questions endpoint** (15 minutes)
4. ⚠️ **Deploy to production**

### Do Later (Nice to Have):
5. 🟢 **Add automated tests** (1-2 hours)
6. 🟢 **Improve documentation** (1-2 hours)

---

## Quick Fix for Suggested Questions

If you want me to fix it now, here's the simple change:

**Step 1: Update Router**
```python
# backend/api/routers/ai.py line 29
async def get_suggested_questions(
    current_user=Depends(get_current_user),  # ADD THIS
    db: Session = Depends(get_db)
):
    service = AIService(db, user_id=current_user.id)  # ADD user_id
    return await service.get_suggested_questions()
```

**Step 2: Update Service Method**

Add helper method to AIService:
```python
def _build_account_filter_for_exists(self) -> Tuple[str, Dict]:
    """Build account filter for EXISTS queries"""
    account_ids = self._get_user_account_ids() or []
    if not account_ids:
        return "", {}

    placeholders = ', '.join([f':acc_id_{i}' for i in range(len(account_ids))])
    filter_sql = f"AND f.account_id IN ({placeholders})"
    params = {f'acc_id_{i}': acc_id for i, acc_id in enumerate(account_ids)}
    return filter_sql, params
```

Update checks:
```python
async def get_suggested_questions(self) -> Dict[str, List[str]]:
    account_filter, params = self._build_account_filter_for_exists()

    has_video = self.db.execute(text(f"""
        SELECT EXISTS(
            SELECT 1 FROM fact_core_metrics f
            WHERE f.video_plays > 0
            {account_filter}
            LIMIT 1
        )
    """), params).scalar()

    has_demographics = self.db.execute(text(f"""
        SELECT EXISTS(
            SELECT 1 FROM fact_core_metrics f
            WHERE f.age IS NOT NULL
            {account_filter}
            LIMIT 1
        )
    """), params).scalar()
```

---

## Risk Assessment

| Issue | Current Risk | After Fix |
|-------|--------------|-----------|
| AI Query Data Leakage | 🔴 CRITICAL | ✅ **FIXED** |
| Budget Optimizer Leakage | 🔴 CRITICAL | ✅ **FIXED** |
| Cache Poisoning | 🔴 HIGH | ✅ **FIXED** |
| Suggested Questions | 🟡 LOW | 🟢 **Will Fix** |
| Cleanup Service | 🟢 MINIMAL | 🟢 OK (Router validates) |

**Overall Status:** ✅ **Production Ready** (after testing)

---

## Summary

### What You MUST Do:
1. **Test the fixes** (30-60 min)
2. **Deploy to production** (2-4 hours)

### What You SHOULD Do:
3. **Fix suggested questions** (15 min) - I can do this now if you want

### What You COULD Do:
4. **Add automated tests** (optional, 1-2 hours)
5. **Improve docs** (optional, 1-2 hours)

---

## My Recommendation

**Option A: Ship Now (Fastest)**
- Skip suggested questions fix (low risk)
- Test critical fixes
- Deploy to production
- Fix suggested questions later

**Option B: Fix Everything (Recommended)**
- Let me fix suggested questions now (15 min)
- Test everything
- Deploy complete solution
- No technical debt

**Which do you prefer?**

---

## Questions?

**Q: Is suggested questions a security risk?**
A: Low risk. It only reveals IF video/demographic data exists, not the actual data. But it's incorrect (suggests features user doesn't have).

**Q: Should I fix it now or later?**
A: Either is fine. It's not critical, but it's a 15-minute fix.

**Q: What's the biggest risk if I don't test?**
A: SQL errors from the new joins in budget_optimizer. Test with 2 users to verify.

**Q: Can I deploy without testing?**
A: Not recommended. At minimum, test the AI query endpoint manually.

---

**Let me know if you want me to:**
1. Fix the suggested questions endpoint now
2. Create automated test scripts
3. Just leave it as-is (critical fixes are done)

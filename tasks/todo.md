# Project Tasks & Progress

## 🔨 CURRENT TASK: Make Optimization Preferences Editable

### Problem
Users cannot change their Optimization Preferences (primary goal, industry, optimization priority, conversions) after completing the onboarding quiz. The settings page displays these values as read-only.

### Solution
Add edit functionality to the Optimization tab in AdAccountSettings.tsx using dropdowns for single-select fields (primary goal, industry, optimization priority) and checkboxes for conversions.

### Approach
- Add "Edit" button to the Optimization section header
- When in edit mode, show dropdowns instead of read-only text
- Use the same option constants from account-quiz page (PRIMARY_GOALS, INDUSTRIES, OPTIMIZATION_PRIORITIES)
- Keep the existing save mechanism (already supports UPSERT)

### Todo
- [ ] Extract option constants to a shared location (or duplicate in component)
- [ ] Add edit mode state and "Edit" / "Cancel" toggle button
- [ ] Convert primary_goal display to dropdown when editing
- [ ] Convert industry display to dropdown when editing
- [ ] Convert optimization_priority display to dropdown when editing
- [ ] Convert conversions display to multi-select checkboxes when editing
- [ ] Update save handler to include all edited fields
- [ ] Test the edit and save functionality

### Files to Modify
- [AdAccountSettings.tsx](meta-dashboard/src/components/settings/AdAccountSettings.tsx)

---

## Previous Tasks

### ✅ Fix Creatives Page 500 Error (COMPLETED)
- Changed `COALESCE(cr.is_carousel, 0)` to `COALESCE(cr.is_carousel, FALSE)` in creative_repository.py
- Fixed type mismatch between boolean and integer in PostgreSQL


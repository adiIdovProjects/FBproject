# Settings Page Reorganization Plan

## Problem Statement

The current settings page (`AccountSettings.tsx`) mixes user-level and account-level settings in a confusing way:
- 7 tabs without clear separation of concerns
- Profile tab has hardcoded values not connected to backend
- Conversions tab is account-specific but buried among user-level settings
- No clear handling of multi-account scenarios

## Current Structure Analysis

### Existing Tabs (7):
1. **Profile** - User-level (name, email, job title) - **HARDCODED VALUES**
2. **Accounts** - Ad account management (link/unlink) - **ACCOUNT-LEVEL**
3. **Billing** - Subscription management - **USER-LEVEL**
4. **Team** - Team members - **BUSINESS-LEVEL**
5. **Security** - 2FA, password - **USER-LEVEL**
6. **Conversions** - Conversion tracking - **ACCOUNT-LEVEL**
7. **Integrations** - Third-party services - **USER-LEVEL**

### Issues:
- Profile, Security, Billing, Integrations are user-level (apply to all accounts)
- Conversions is account-specific (should be per-account)
- Accounts tab manages account linking (correct placement)
- Team tab is unclear (user team? business team?)

## FINAL Architecture: Three-Tier System

### Updated Structure (User → Business → Ad Accounts)

**Reasoning**: User confirmed team features needed, requires business account layer for multi-user collaboration

#### 1. User Settings (Personal Level)
**Route**: `/settings`
**Applies to**: Individual logged-in user (personal profile)

**Tabs** (3 tabs):
- **Profile** - Personal info (name, email, job title, years_experience, referral_source)
  - Connect to backend: `GET /api/v1/users/me` and `PATCH /api/v1/users/me/profile`
- **Security** - Password, 2FA
- **Billing** - Subscription, payment methods

**Where**: Accessible from top-right user menu (avatar dropdown)

#### 2. Business Settings (Team/Agency Level) - **NEW LAYER**
**Route**: `/business/settings` (single business for now, expand to multi-business later)
**Applies to**: Business account (team/agency that owns multiple ad accounts)

**Tabs** (2 tabs):
- **Team** - Invite members, manage roles (owner, admin, member), permissions
- **Manage Ad Accounts** - Link/unlink Facebook ad accounts to this business
  - List of linked accounts (from `fetchLinkedAccounts()`)
  - "Add Account" button → Facebook account selector
  - Unlink account action (with delete data option)

**Where**: Accessible from:
- User menu → "Business Settings"
- Sidebar → "Switch Account" menu → "Manage Accounts" link

**New DB Schema Required**:
- `businesses` table (id, name, created_at)
- `business_members` table (business_id, user_id, role: owner/admin/member)
- `user_ad_accounts` table → UPDATE to include business_id (links accounts to business, not user directly)

#### 3. Ad Account Settings (Per-Account Level)
**Route**: `/accounts/{accountId}/settings`
**Applies to**: Specific selected ad account

**Tabs** (2 tabs):
- **Overview** - Account name, currency, ID (read-only from Facebook)
- **Optimization** - Quiz data (primary goal, conversions, industry, priority)
  - Connect to backend: `GET /api/v1/accounts/{accountId}/quiz`

**Where**: Accessible from:
- Sidebar "⚙️ Account Settings" link (uses `selectedAccountId`)
- Business Settings → Manage Ad Accounts → "Settings" button per account

## Rationale for Three-Tier

1. **Supports team collaboration**: Team members can access shared ad accounts
2. **Agency-friendly**: Agencies can manage multiple client accounts under one business
3. **Clear separation**: User (personal) → Business (team) → Ad Account (Facebook data)
4. **Scalable permissions**: Roles (owner, admin, member) control access to accounts
5. **Multi-business support**: User can belong to multiple businesses/teams (future enhancement)

## Implementation Plan

### Phase 1: User Settings (Profile, Security, Billing) ⭐ PRIORITY

**Goal**: Fix hardcoded values, connect Profile to backend

**New Files**:
1. `meta-dashboard/src/app/[locale]/settings/page.tsx` - User settings page (rewrite existing)
2. `meta-dashboard/src/components/settings/UserSettings.tsx` - User settings component (NEW)

**Tabs** (3):
- **Profile** - Connect to backend (full_name, email, job_title from user quiz)
- **Security** - Password, 2FA (placeholder for now)
- **Billing** - Subscription management (placeholder for now)

**Backend Integration**:
```typescript
// GET user data
const user = await apiClient.get('/api/v1/users/me');

// PATCH profile updates
await apiClient.patch('/api/v1/users/me/profile', {
  full_name: 'Updated Name',
  job_title: 'Updated Title'
});
```

**Success Criteria**:
- ✅ Profile shows real data (not "Alex Morgen" hardcoded)
- ✅ Email field read-only (from OAuth)
- ✅ Full name & job title editable + saves to backend

---

### Phase 2: Ad Account Settings (Overview, Optimization)

**Goal**: Per-account settings using quiz data

**New Files**:
1. `meta-dashboard/src/app/[locale]/accounts/[accountId]/settings/page.tsx` - Account settings page (NEW)
2. `meta-dashboard/src/components/settings/AdAccountSettings.tsx` - Account settings component (NEW)

**Tabs** (2):
- **Overview** - Account name, currency, ID (read-only from Facebook)
- **Optimization** - Account quiz data (4 questions: goal, conversions, industry, priority)

**Backend Integration**:
```typescript
// GET account quiz data
const quiz = await apiClient.get(`/api/v1/accounts/${accountId}/quiz`);

// Quiz fields to display:
quiz.primary_goal  // "increase_sales", "generate_leads", etc.
quiz.conversion_types  // ["purchase", "lead"]
quiz.industry  // "ecommerce", "saas", etc.
quiz.optimization_priority  // "conversions", "reach", etc.
```

**Success Criteria**:
- ✅ Displays quiz data from backend (not hardcoded)
- ✅ URL param: `/accounts/123456789/settings`
- ✅ Works with `AccountContext` (selectedAccountId)

---

### Phase 3: Business Settings (Team, Manage Accounts) - **REQUIRES NEW DB SCHEMA**

**Goal**: Add business account layer for team collaboration

**3A. Database Migration** (FIRST - Backend)

**New Tables**:
```sql
-- businesses table
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- business_members table (user ↔ business with roles)
CREATE TABLE business_members (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- 'owner', 'admin', 'member'
    invited_at TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP,
    UNIQUE(business_id, user_id)
);

-- UPDATE user_ad_accounts to link accounts to business (not user)
ALTER TABLE user_ad_accounts ADD COLUMN business_id INTEGER REFERENCES businesses(id);
```

**Migration Strategy**:
- Create default business for each existing user
- Assign existing users as "owner" of their business
- Migrate existing `user_ad_accounts` to link to business_id

**3B. Backend Endpoints** (NEW)

**Business Endpoints**:
- `POST /api/v1/business/create` - Create business (auto-create on signup)
- `GET /api/v1/business/me` - Get user's business
- `PATCH /api/v1/business/me` - Update business name/settings

**Team Endpoints**:
- `GET /api/v1/business/members` - List team members
- `POST /api/v1/business/members/invite` - Invite member by email
- `DELETE /api/v1/business/members/{userId}` - Remove member
- `PATCH /api/v1/business/members/{userId}/role` - Update member role

**Account Management** (UPDATE existing endpoints):
- `GET /api/v1/business/accounts` - List business ad accounts (was `/users/me/accounts`)
- `POST /api/v1/business/accounts/link` - Link accounts to business (was `/users/me/accounts/link`)
- `DELETE /api/v1/business/accounts/{accountId}` - Unlink account

**3C. Frontend - Business Settings Page**

**New Files**:
1. `meta-dashboard/src/app/[locale]/business/settings/page.tsx` - Business settings page (NEW)
2. `meta-dashboard/src/components/settings/BusinessSettings.tsx` - Business settings component (NEW)
3. `meta-dashboard/src/services/business.service.ts` - Business API client (NEW)

**Tabs** (2):
- **Team** - Invite members, manage roles, remove members
- **Manage Ad Accounts** - Link/unlink Facebook accounts

**Success Criteria**:
- ✅ Business owner can invite team members
- ✅ Team members see shared ad accounts
- ✅ Role-based permissions (owner > admin > member)

---

### Phase 4: Update Navigation & Context

**Changes Needed**:

**4A. Update AccountContext** (`meta-dashboard/src/contexts/AccountContext.tsx`):
- Add `businessId` to context
- Update `fetchLinkedAccounts()` to use `/api/v1/business/accounts`

**4B. Update Sidebar** (`meta-dashboard/src/components/Sidebar.tsx`):
- Add "⚙️ Account Settings" link → `/accounts/{selectedAccountId}/settings`
- Update "Switch Account" menu → "Manage Accounts" link → `/business/settings` (Manage Ad Accounts tab)

**4C. Add User Menu** (top-right avatar dropdown - may need to create):
- "User Settings" → `/settings`
- "Business Settings" → `/business/settings`
- Separator
- "Logout"

---

### Phase 5: Cleanup & Testing

**Steps**:
1. Remove old `AccountSettings.tsx` component (525 lines)
2. Update `/settings` route to use new `UserSettings.tsx`
3. Test multi-account switching
4. Test team member invitation flow
5. Test permissions (member can't remove accounts, admin can, owner can change roles)

## File Changes Summary

### Phase 1: User Settings
**New Files**:
1. `meta-dashboard/src/components/settings/UserSettings.tsx` - User settings component (Profile, Security, Billing)

**Modified Files**:
1. `meta-dashboard/src/app/[locale]/settings/page.tsx` - Rewrite to use UserSettings component

### Phase 2: Ad Account Settings
**New Files**:
1. `meta-dashboard/src/app/[locale]/accounts/[accountId]/settings/page.tsx` - Account settings page
2. `meta-dashboard/src/components/settings/AdAccountSettings.tsx` - Account settings component (Overview, Optimization)

### Phase 3: Business Settings (Team Collaboration)
**Backend Files** (NEW):
1. `backend/migrations/add_business_accounts.sql` - DB migration for businesses + business_members tables
2. `backend/models/business.py` - SQLAlchemy models for Business + BusinessMember
3. `backend/api/repositories/business_repository.py` - Business data access layer
4. `backend/api/services/business_service.py` - Business logic (create, invite, permissions)
5. `backend/api/routers/business.py` - Business API endpoints
6. `backend/api/schemas/business.py` - Pydantic schemas for Business/Member requests/responses

**Frontend Files** (NEW):
1. `meta-dashboard/src/app/[locale]/business/settings/page.tsx` - Business settings page
2. `meta-dashboard/src/components/settings/BusinessSettings.tsx` - Business settings component (Team, Manage Accounts)
3. `meta-dashboard/src/services/business.service.ts` - Business API client

### Phase 4: Navigation Updates
**Modified Files**:
1. `meta-dashboard/src/components/Sidebar.tsx` - Add Account Settings link, update Switch Account menu
2. `meta-dashboard/src/contexts/AccountContext.tsx` - Add businessId, update account fetching
3. User menu component (TBD - need to find or create)

### Phase 5: Cleanup
**Deprecated Files**:
1. `meta-dashboard/src/components/AccountSettings.tsx` - Old 525-line monolithic component (DELETE after migration)

## Navigation Structure (After Implementation)

```
User Menu (Avatar Dropdown)
├── User Settings → /settings
│   ├── Profile (connected to backend)
│   ├── Security
│   └── Billing
├── Business Settings → /business/settings
│   ├── Team (invite members, roles, permissions)
│   └── Manage Ad Accounts (link/unlink Facebook accounts)
├── ────────────
└── Logout

Sidebar (Per-Account Context)
├── Dashboard
├── Campaigns
├── Reports
├── ────────────
├── Switch Account Menu (dropdown)
│   ├── Account 1 (act_123) ✓ Selected
│   ├── Account 2 (act_456)
│   └── Manage Accounts → /business/settings (Manage Ad Accounts tab)
├── ⚙️ Account Settings → /accounts/{selectedAccountId}/settings
│   ├── Overview (account name, currency, ID)
│   └── Optimization (quiz data: goal, conversions, industry, priority)
└── Complete Setup (if quiz not completed)
```

## Profile Tab Backend Connection

**Current State**: Hardcoded values
```typescript
// BEFORE (hardcoded)
<input value="Alex Morgen" />
<input value="alex@example.com" />
```

**After Implementation**: Connected to backend
```typescript
// AFTER (from backend)
const { data: user } = useQuery({
  queryKey: ['current-user'],
  queryFn: fetchCurrentUser
});

<input value={user?.full_name || ''} onChange={...} />  // From user quiz
<input value={user?.email || ''} disabled />             // From OAuth (read-only)
<input value={user?.job_title || ''} onChange={...} />   // From user quiz
```

**Save Changes**:
```typescript
const updateProfile = async (data: UserProfileUpdate) => {
  await apiClient.patch('/api/v1/users/me/profile', {
    full_name: data.full_name,
    job_title: data.job_title,
    // years_experience and referral_source not editable (set once in quiz)
  });
};
```

## Business Account Auto-Creation (Phase 3)

**When**: Auto-create on user signup (after Phase 3 migration)

**Default Business Setup**:
- Create business with name: "{user.full_name}'s Business" (editable later)
- Add user as "owner" role
- Link all user's ad accounts to this business

**Multi-Business Support (Future)**:
- Phase 3 supports single business per user (simplest)
- Later: Allow user to belong to multiple businesses
- Later: Business invitation flow (user gets invited to join existing business)

## Success Criteria

### Phase 1 Success Criteria:
- ✅ User settings (Profile, Security, Billing) accessible from user menu
- ✅ Profile tab displays real data from backend (not hardcoded "Alex Morgen")
- ✅ Profile tab saves changes to backend via PATCH `/api/v1/users/me/profile`
- ✅ Email field read-only (from OAuth)
- ✅ Full name & job title editable

### Phase 2 Success Criteria:
- ✅ Account settings accessible from sidebar per-account
- ✅ Account settings displays quiz data (4 questions: goal, conversions, industry, priority)
- ✅ Works with URL param: `/accounts/{accountId}/settings`
- ✅ Works with AccountContext (selectedAccountId)

### Phase 3 Success Criteria:
- ✅ Business settings accessible from user menu
- ✅ Business owner can invite team members (email invitation)
- ✅ Team members can access shared ad accounts
- ✅ Role-based permissions work (owner > admin > member)
- ✅ Manage Ad Accounts moved to Business Settings
- ✅ Database migration completed (businesses + business_members tables)

### Overall Success Criteria:
- ✅ Clear three-tier separation: User → Business → Ad Account
- ✅ No confusion about which settings apply where
- ✅ Multi-account support: Account settings scoped to selected account
- ✅ Team collaboration enabled (Phase 3)

## User Decisions (Confirmed)

1. **Billing tab**: ⚠️ Keep in User Settings for now (can move to separate `/billing` page later if needed)
2. **Integrations tab**: ❌ **REMOVE** - No integrations planned
3. **Team features**: ✅ **YES** - Multi-user/team collaboration features planned
   - **Impact**: Requires **THREE-TIER** architecture (User → Business → Ad Accounts)
4. **Account preferences**: ✅ Use existing **account quiz data** (4 questions from complete setup)

## UPDATED Recommendation: Three-Tier Architecture (Option C)

**Reasoning**: User confirmed team features are planned, so we need Business Account layer NOW

### Architecture: User → Business → Ad Accounts

```
User (Personal)
├── Profile (name, email, job title)
├── Security (password, 2FA)
└── Billing (subscription)

Business Account (Team/Agency)
├── Team Members (invite, roles, permissions)
├── Linked Ad Accounts (add/remove Facebook accounts)
└── Business Settings (business name, default settings)

Ad Account Settings (Per-Account)
├── Overview (account info from Facebook)
├── Optimization (quiz data: goal, conversions, industry, priority)
└── Preferences (display settings)
```

### Implementation Strategy

**Start Simple, Build Up**:
1. Phase 1: User Settings (Profile, Security, Billing) - **NO TEAM TAB**
2. Phase 2: Ad Account Settings (Overview, Optimization from quiz data)
3. Phase 3: Manage Accounts page (link/unlink accounts)
4. Phase 4: Business Account layer (Team tab, business members table, permissions)

**Why This Order**:
- Get user/account settings working first (most urgent, fixes hardcoded values)
- Defer team features to Phase 4 (requires new DB schema)
- Each phase delivers value independently

## Recommendation

**Implement THREE-TIER, but in phases**:
- Phases 1-3: Focus on User + Ad Account settings (fixes current issues)
- Phase 4: Add Business Account layer (team collaboration features)

**Estimated effort**:
1. User Settings page (Phase 1) - 3-4 hours
2. Connect Profile tab to backend - 1 hour
3. Ad Account Settings page (Phase 2) - 2-3 hours
4. Manage Accounts page (Phase 3) - 2 hours
5. Update navigation (Phases 1-3) - 1 hour
6. Business Account layer (Phase 4) - 6-8 hours (DB schema + backend + frontend)

**Total estimate**: ~16-20 hours (Phases 1-5)

---

## Summary

**Chosen Architecture**: Three-Tier (User → Business → Ad Accounts)

**Why Three-Tier**: User confirmed team collaboration features are needed

**Implementation Order**:
1. ⭐ **Phase 1 (PRIORITY)**: User Settings - Fix hardcoded profile values (~4 hours)
2. **Phase 2**: Ad Account Settings - Display quiz data per account (~3 hours)
3. **Phase 3**: Business Settings - Team collaboration + DB migration (~8 hours)
4. **Phase 4**: Navigation updates - Sidebar + user menu (~1 hour)
5. **Phase 5**: Cleanup - Remove old AccountSettings.tsx (~1 hour)

**Key Decisions**:
- ✅ Remove Integrations tab (not needed)
- ✅ Keep Billing in User Settings (for now)
- ✅ Use account quiz data for Optimization tab (4 questions already collected)
- ✅ Auto-create default business on signup (Phase 3)
- ✅ Single business per user initially (multi-business support later)

**Ready to implement?** Yes - Plan is complete and approved by user.

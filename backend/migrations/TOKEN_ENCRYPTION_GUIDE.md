# OAuth Token Encryption Guide

## Overview

OAuth tokens (Facebook, Google) are now **encrypted at rest** in the database for enhanced security.

## How It Works

1. **Storage**: Tokens are encrypted before being written to the database
2. **Retrieval**: Tokens are decrypted automatically when accessed via properties
3. **Algorithm**: Fernet symmetric encryption (from Python's `cryptography` library)
4. **Key Derivation**: Uses existing `JWT_SECRET_KEY` (no new secrets needed)

## For Developers

### ✅ CORRECT: Use Decrypted Properties

```python
# When calling external APIs, use the decrypted properties:
user = get_current_user()

# Facebook API
fb_service.get_accounts(user.decrypted_fb_token)  # ✅ CORRECT

# Google API
google_service.fetch_data(user.decrypted_google_token)  # ✅ CORRECT
```

### ❌ INCORRECT: Direct Database Access

```python
# DO NOT access database fields directly for API calls:
user.fb_access_token  # ❌ This is encrypted! Will fail API calls
user.google_access_token  # ❌ This is encrypted! Will fail API calls
```

### When to Use Direct Fields

Direct database fields are only needed when:
- **Storing** new tokens (handled by repository methods)
- **Checking** if a token exists: `if user.fb_access_token:` (works fine)

### User Model Properties

The `User` model provides these convenience properties:

- `user.decrypted_fb_token` → Facebook access token (plaintext)
- `user.decrypted_google_token` → Google access token (plaintext)
- `user.decrypted_google_refresh_token` → Google refresh token (plaintext)

## Migration

### First-Time Setup

After deploying this feature, run the migration **once** to encrypt existing tokens:

```bash
cd /path/to/project
python -m backend.migrations.encrypt_oauth_tokens
```

### What the Migration Does

1. Finds all users with OAuth tokens
2. Checks if tokens are already encrypted (idempotent - safe to run multiple times)
3. Encrypts plaintext tokens
4. Commits changes to database

## Files to Update

If you add code that uses OAuth tokens, remember to use the decrypted properties:

### Common Locations

1. **API Routers** (`backend/api/routers/`)
   - `auth.py` - Facebook OAuth
   - `google_auth.py` - Google OAuth
   - `mutations.py` - Ad mutations
   - `sync.py` - Data syncing

2. **Services** (`backend/api/services/`)
   - Any service that calls Facebook/Google APIs

3. **Background Jobs**
   - ETL scripts
   - Token refresh jobs

## Security Benefits

- ✅ Tokens encrypted at rest in database
- ✅ No additional secrets to manage (uses JWT secret)
- ✅ Backwards compatible (gracefully handles old plaintext tokens during migration)
- ✅ Automatic encryption/decryption (transparent to most code)

## Troubleshooting

### "Invalid token" errors after deployment

**Symptom**: API calls fail with authentication errors

**Cause**: Code is using `user.fb_access_token` (encrypted) instead of `user.decrypted_fb_token`

**Fix**: Update code to use decrypted properties

### Migration fails

**Check**:
1. JWT_SECRET_KEY is set correctly
2. Database connection is working
3. No other processes are writing to users table during migration

## Cost

**FREE** - Uses Python's built-in `cryptography` library (no additional services needed)

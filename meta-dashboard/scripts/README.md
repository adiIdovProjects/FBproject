# Translation Automation System

Automated translation system for internationalizing the Meta Dashboard using Google Cloud Translation API.

## Overview

This system automatically translates English text to Arabic, German, French, and Hebrew using Google's AI-powered translation service.

## Setup

### 1. Get Google Cloud Translation API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Cloud Translation API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Cloud Translation API"
   - Click "Enable"
4. Create an API key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated key

### 2. Configure API Key

Create a `.env.local` file in the `meta-dashboard` directory:

```bash
cd meta-dashboard
echo "GOOGLE_TRANSLATE_API_KEY=your_api_key_here" > .env.local
```

**Important**: Never commit `.env.local` to git (already in .gitignore)

## Usage

### Development Workflow (Recommended)

Start watch mode to automatically translate as you edit:

```bash
npm run i18n:watch
```

Now edit `messages/en.json` and translations will auto-sync to all languages within seconds!

### One-Time Sync

Translate all missing keys manually:

```bash
npm run i18n:sync
```

### Find Missing Keys

Scan your code for translation keys that don't exist in language files:

```bash
npm run i18n:audit
```

### Generate TypeScript Types

Auto-generate TypeScript types from translation keys:

```bash
npm run i18n:generate-types
```

## How It Works

### File Structure

```
meta-dashboard/
├── messages/
│   ├── en.json          # Source of truth (English)
│   ├── ar.json          # Arabic (auto-translated)
│   ├── de.json          # German (auto-translated)
│   ├── fr.json          # French (auto-translated)
│   └── he.json          # Hebrew (auto-translated)
└── scripts/
    ├── config/
    │   └── i18n-config.mjs           # Language configuration
    ├── services/
    │   └── translation-service.mjs   # Google Translate API client
    ├── sync-translations.mjs         # Main sync engine
    └── watch-translations.mjs        # File watcher
```

### Translation Process

1. **Edit** `messages/en.json` with new/updated English text
2. **Detect** - Script finds keys that are:
   - Missing in target languages
   - Have "(MISSING: ...)" placeholders
   - Same as English (untranslated)
3. **Translate** - Batch translate using Google Cloud Translation API
4. **Update** - Write translations to all language files
5. **Done** - All languages synchronized!

### Smart Features

- **Batch Processing**: Translates 50 texts at a time for efficiency
- **Retry Logic**: 3 attempts with exponential backoff for reliability
- **Smart Filtering**:
  - Skips empty strings
  - Preserves ALL_CAPS acronyms (CTR, ROAS, CPC)
  - Maintains placeholders like `{count}`
- **Atomic Writes**: Uses temp files to prevent corruption
- **Language Mapping**: Handles Hebrew (he → iw for Google API)

## Supported Languages

| Language | Code | Direction | Google Code |
|----------|------|-----------|-------------|
| English  | en   | LTR       | en          |
| Arabic   | ar   | RTL       | ar          |
| German   | de   | LTR       | de          |
| French   | fr   | LTR       | fr          |
| Hebrew   | he   | RTL       | iw          |

## Costs

**Free Tier**: 500,000 characters/month

**Current Usage**: ~240 keys × 5 languages × 30 chars avg = ~36,000 chars/month

You're well within the free tier! 🎉

## Troubleshooting

### "API key not found" Error

Make sure `.env.local` exists with your API key:

```bash
cat meta-dashboard/.env.local
```

Should show:
```
GOOGLE_TRANSLATE_API_KEY=AIzaSy...
```

### "Requests are blocked" Error

Enable the Cloud Translation API:
1. Go to https://console.cloud.google.com/apis/library/translate.googleapis.com
2. Make sure you're in the correct project
3. Click "Enable"

### Translations Not Updating

1. Check if watch mode is running
2. Verify en.json has valid JSON syntax
3. Run `npm run i18n:sync` manually

### Poor Translation Quality

Edit the translated files manually - they're just JSON files:

```bash
# Open and edit
code meta-dashboard/messages/ar.json
```

Future syncs will preserve your manual changes unless the English source changes.

## Best Practices

### Adding New Keys

1. **Always add to English first**: Edit `messages/en.json`
2. **Use descriptive keys**: `common.status` not `s`
3. **Nest logically**: Group related keys under namespaces
4. **Run sync**: `npm run i18n:sync` to translate

### Key Naming Conventions

- **snake_case**: `campaign_status` not `campaignStatus`
- **Nested**: `reports.export_to_excel` not `reports_export_to_excel`
- **Descriptive**: `no_data` not `nd`
- **Contextual**: Group by feature/page

### Avoiding Issues

- ✅ **Do**: Keep placeholders like `{count}` in translations
- ✅ **Do**: Review auto-translations for quality
- ✅ **Do**: Use watch mode during development
- ❌ **Don't**: Edit language files directly (use en.json)
- ❌ **Don't**: Commit .env.local to git
- ❌ **Don't**: Delete keys from one language file only

## Examples

### Adding a New Feature

```bash
# 1. Start watch mode
npm run i18n:watch

# 2. Edit en.json - add new keys
{
  "dashboard": {
    "new_feature": "My New Feature"
  }
}

# 3. Watch mode auto-translates!
# ✅ ar.json: "ميزتي الجديدة"
# ✅ de.json: "Meine neue Funktion"
# ✅ fr.json: "Ma nouvelle fonctionnalité"
# ✅ he.json: "התכונה החדשה שלי"
```

### Using in Components

```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();

  return (
    <div>
      <h1>{t('dashboard.new_feature')}</h1>
    </div>
  );
}
```

## Architecture

### sync-translations.mjs

Main sync engine that:
- Loads English source file
- Compares with each target language
- Detects missing/untranslated keys
- Batches translations (50 per batch)
- Updates language files atomically

### translation-service.mjs

Google Cloud Translation API client:
- Initializes API with key
- Handles single & batch translations
- Implements retry logic
- Maps language codes (he → iw)

### watch-translations.mjs

File watcher using chokidar:
- Watches `messages/en.json`
- Debounces changes (500ms)
- Triggers sync automatically
- Shows colored output

### i18n-config.mjs

Central configuration:
- Source & target locales
- Language mappings
- RTL language flags
- File paths

## Support

For issues or questions:
- Check this README
- Review error messages (they're helpful!)
- Inspect `.env.local` configuration
- Verify Google Cloud API is enabled

---

**Built with**: Google Cloud Translation API, chokidar, chalk, dotenv

**License**: Project license

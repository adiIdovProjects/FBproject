import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { LLMTranslationService } from './services/llm-translation-service.mjs';
import { config } from './config/i18n-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
// Load environment variables from .env.local and .env
const envPaths = [
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    // console.log(chalk.gray(`Loading env from ${envPath}`));
    dotenv.config({ path: envPath });
  }
}

/**
 * Recursively flatten nested JSON object into dot-notation paths
 * Example: { common: { error: "text" } } => { "common.error": "text" }
 */
function flattenObject(obj, prefix = '') {
  const flattened = {};

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], fullKey));
    } else {
      flattened[fullKey] = obj[key];
    }
  }

  return flattened;
}

/**
 * Unflatten dot-notation paths back to nested object
 * Example: { "common.error": "text" } => { common: { error: "text" } }
 */
function unflattenObject(flattened) {
  const result = {};

  for (const key in flattened) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = flattened[key];
  }

  return result;
}

/**
 * Main sync function
 */
async function syncTranslations() {
  console.log(chalk.blue.bold('\n🌍 Translation Sync Started\n'));

  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('❌ Error: GEMINI_API_KEY not found in .env.local'));
    console.log(chalk.yellow('\nSetup instructions:'));
    console.log('1. Get an API key from https://aistudio.google.com/');
    console.log('2. Add it to meta-dashboard/.env.local:');
    console.log('   GEMINI_API_KEY=AIzaSy...\n');
    process.exit(1);
  }

  // Initialize translation service
  const translationService = new LLMTranslationService(apiKey);

  // Load source (English) translations
  const sourcePath = path.join(config.paths.messages, `${config.sourceLocale}.json`);
  if (!fs.existsSync(sourcePath)) {
    console.error(chalk.red(`❌ Source file not found: ${sourcePath}`));
    process.exit(1);
  }

  const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const sourceFlattened = flattenObject(sourceContent);
  const sourceKeys = Object.keys(sourceFlattened);

  console.log(chalk.gray(`📖 Loaded ${sourceKeys.length} keys from ${config.sourceLocale}.json\n`));

  // Process each target language
  const summary = {};

  for (const targetLang of config.targetLocales) {
    const targetPath = path.join(config.paths.messages, `${targetLang}.json`);
    const langName = config.languageNames[targetLang] || targetLang;

    console.log(chalk.cyan(`🌐 Processing ${langName} (${targetLang})...`));

    // Load existing target translations
    let targetContent = {};
    if (fs.existsSync(targetPath)) {
      targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    }

    const targetFlattened = flattenObject(targetContent);

    // Detect new and changed keys
    const keysToTranslate = [];
    const valuesToTranslate = [];

    for (const key of sourceKeys) {
      const sourceValue = sourceFlattened[key];
      const targetValue = targetFlattened[key];

      // Check if key is missing, has MISSING placeholder, or is same as source (untranslated)
      if (
        !targetValue ||
        targetValue.startsWith('(MISSING:') ||
        targetValue === sourceValue  // Not translated yet
      ) {
        keysToTranslate.push(key);
        valuesToTranslate.push(sourceValue);
      }
    }

    if (keysToTranslate.length === 0) {
      console.log(chalk.green(`  ✓ No new keys to translate\n`));
      summary[targetLang] = { new: 0, updated: 0 };
      continue;
    }

    console.log(chalk.yellow(`  📝 Translating ${keysToTranslate.length} keys...`));

    // Translate in batches of 50
    const batchSize = 50;
    const allTranslations = [];

    for (let i = 0; i < valuesToTranslate.length; i += batchSize) {
      const batch = valuesToTranslate.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(valuesToTranslate.length / batchSize);

      process.stdout.write(chalk.gray(`     Batch ${batchNum}/${totalBatches}... `));

      const translations = await translationService.batchTranslate(batch, targetLang);
      allTranslations.push(...translations);

      process.stdout.write(chalk.green('✓\n'));
    }

    // Update target with translations
    for (let i = 0; i < keysToTranslate.length; i++) {
      targetFlattened[keysToTranslate[i]] = allTranslations[i];
    }

    // Remove any keys that don't exist in source
    for (const key in targetFlattened) {
      if (!sourceFlattened[key]) {
        delete targetFlattened[key];
      }
    }

    // Unflatten and write to file
    const updatedContent = unflattenObject(targetFlattened);

    // Write atomically (temp file + rename)
    const tempPath = targetPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(updatedContent, null, 2) + '\n', 'utf8');
    fs.renameSync(tempPath, targetPath);

    console.log(chalk.green(`  ✅ ${langName}: ${keysToTranslate.length} new translations\n`));

    summary[targetLang] = {
      new: keysToTranslate.length,
      updated: 0
    };
  }

  // Print summary
  console.log(chalk.blue.bold('📊 Summary:\n'));

  for (const lang of config.targetLocales) {
    const langName = config.languageNames[lang] || lang;
    const stats = summary[lang];
    if (stats.new > 0 || stats.updated > 0) {
      console.log(chalk.green(`  ✅ ${langName} (${lang}): ${stats.new} new`));
    } else {
      console.log(chalk.gray(`  ✓ ${langName} (${lang}): up to date`));
    }
  }

  console.log(chalk.blue.bold('\n✨ Translation sync complete!\n'));
}

// Run sync
syncTranslations().catch(error => {
  console.error(chalk.red('\n❌ Sync failed:'), error.message);
  process.exit(1);
});

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MESSAGES_DIR = path.join(__dirname, '../messages');
const SOURCE_LOCALE = 'en';
const TARGET_LOCALES = ['he', 'ar', 'fr', 'de'];

/**
 * A simple placeholder for an AI translation service.
 * In a real-world scenario, you would integrate with Google Translate API,
 * OpenAI, or another translation service.
 */
async function translateText(text, targetLocale) {
    // Placeholder logic: appending the locale to the text to simulate translation.
    // In a real implementation, this would call an external API.
    console.log(`[Auto-Translate] Translating "${text}" to ${targetLocale}...`);

    // For now, we'll just return the original text with a suffix for demonstration.
    // If we had a real API key, we'd use it here.
    return `${text} [${targetLocale}]`;
}

async function autoTranslate() {
    const sourcePath = path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);

    if (!fs.existsSync(sourcePath)) {
        console.error(`Source locale file not found: ${sourcePath}`);
        return;
    }

    const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const sourceKeys = Object.keys(sourceContent);

    for (const locale of TARGET_LOCALES) {
        const targetPath = path.join(MESSAGES_DIR, `${locale}.json`);
        let targetContent = {};

        if (fs.existsSync(targetPath)) {
            targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        }

        let updated = false;
        for (const key of sourceKeys) {
            if (!targetContent[key]) {
                console.log(`Missing key "${key}" in ${locale}.json. Translating...`);
                targetContent[key] = await translateText(sourceContent[key], locale);
                updated = true;
            }
        }

        if (updated) {
            // Sort keys to maintain consistency
            const sortedContent = {};
            Object.keys(targetContent).sort().forEach(key => {
                sortedContent[key] = targetContent[key];
            });

            fs.writeFileSync(targetPath, JSON.stringify(sortedContent, null, 2), 'utf8');
            console.log(`✅ Updated ${locale}.json with new translations.`);
        } else {
            console.log(`No missing keys found for ${locale}.`);
        }
    }
}

autoTranslate().catch(console.error);

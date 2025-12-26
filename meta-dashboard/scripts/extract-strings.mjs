import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const EN_JSON_PATH = path.join(__dirname, '../messages/en.json');

// Regex to find strings in JSX like >Some Text< or "Some Text" in props
// This is a simplified regex for demonstration. A robust solution would use a parser like Babel.
const JSX_TEXT_REGEX = />([^<{}\n\r]+)</g;
const ATTRIBUTE_TEXT_REGEX = /(?:title|label|placeholder|description)="([^"]+)"/g;

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '_')
        .replace(/^-+|-+$/g, '');
}

async function extractStrings() {
    const enContent = JSON.parse(fs.readFileSync(EN_JSON_PATH, 'utf8'));
    let updatedEn = false;

    const files = [];
    function walk(dir) {
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file !== 'node_modules' && file !== '.next') walk(fullPath);
            } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
    }

    walk(SRC_DIR);

    for (const filePath of files) {
        let content = fs.readFileSync(filePath, 'utf8');
        let fileUpdated = false;

        // 1. Extract JSX Text
        content = content.replace(JSX_TEXT_REGEX, (match, text) => {
            const trimmedText = text.trim();
            if (trimmedText && trimmedText.length > 2 && !trimmedText.includes('{')) {
                const key = `extracted_${slugify(trimmedText)}`;
                if (!enContent[key]) {
                    enContent[key] = trimmedText;
                    updatedEn = true;
                }
                fileUpdated = true;
                return `>{t('${key}')}<`;
            }
            return match;
        });

        // 2. Extract Attribute Text
        content = content.replace(ATTRIBUTE_TEXT_REGEX, (match, text) => {
            const trimmedText = text.trim();
            if (trimmedText && trimmedText.length > 1) {
                const key = `extracted_${slugify(trimmedText)}`;
                if (!enContent[key]) {
                    enContent[key] = trimmedText;
                    updatedEn = true;
                }
                fileUpdated = true;
                return `${match.split('=')[0]}={t('${key}')}`;
            }
            return match;
        });

        if (fileUpdated) {
            // Ensure useTranslations is imported if we replaced something
            if (!content.includes('useTranslations')) {
                // This is a complex step normally - just logging for now
                console.log(`[Warning] Replaced strings in ${path.relative(process.cwd(), filePath)}, but 'useTranslations' may be missing.`);
            }
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Processed ${path.relative(process.cwd(), filePath)}`);
        }
    }

    if (updatedEn) {
        const sortedEn = {};
        Object.keys(enContent).sort().forEach(key => {
            sortedEn[key] = enContent[key];
        });
        fs.writeFileSync(EN_JSON_PATH, JSON.stringify(sortedEn, null, 2), 'utf8');
        console.log(`✅ Updated en.json with newly extracted keys.`);
    }
}

console.log('Starting string extraction (Simplified Regex Mode)...');
extractStrings().catch(console.error);

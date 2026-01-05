const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const MESSAGES_DIR = path.join(__dirname, '../messages');

// Recursively get all files in a directory
function getFiles(dir, extensions = ['.tsx', '.ts']) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file, extensions));
        } else {
            if (extensions.includes(path.extname(file))) {
                results.push(file);
            }
        }
    });
    return results;
}

// Extract t('key') or t("key") or t(`key`)
// Also handles variables in t(`${var}`) if they are simple, but mostly focused on literals.
function extractKeys(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Regex to match t('...') calls. Handles nested dots.
    const regex = /t\(['"`]([a-zA-Z0-9._-]+)['"`]\)/g;
    const keys = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.push(match[1]);
    }
    return keys;
}

// Check if a nested key exists in an object
function hasKey(obj, keyPath) {
    const parts = keyPath.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined || typeof current !== 'object' || !(part in current)) {
            return false;
        }
        current = current[part];
    }
    return true;
}

// Add a nested key to an object
function setKey(obj, keyPath, value) {
    const parts = keyPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

function audit() {
    console.log('--- Starting Translation Audit ---');

    const files = getFiles(SRC_DIR);
    const allUsedKeys = new Set();

    files.forEach(file => {
        const keys = extractKeys(file);
        keys.forEach(k => allUsedKeys.add(k));
    });

    console.log(`Found ${allUsedKeys.size} unique translation keys in source code.`);

    const localeFiles = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'));
    let totalMissing = 0;
    let autoFixed = 0;

    localeFiles.forEach(localeFile => {
        const filePath = path.join(MESSAGES_DIR, localeFile);
        const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const locale = localeFile.replace('.json', '');

        let missingCount = 0;
        allUsedKeys.forEach(key => {
            if (!hasKey(messages, key)) {
                console.warn(`[${locale}] Missing key: ${key}`);
                missingCount++;
                totalMissing++;

                // Auto-fix for all locales: Add the key with a placeholder
                // This prevents runtime errors, though it shows a placeholder to the user.
                setKey(messages, key, `(MISSING: ${key})`);
                autoFixed++;
            }
        });

        if (missingCount > 0) {
            console.log(`[${locale}] Found ${missingCount} missing keys. Auto-fixing...`);
            fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
        }
    });

    if (totalMissing === 0) {
        console.log('Success: No missing translation keys found!');
    } else {
        console.log(`Finished Audit: ${totalMissing} keys were missing. ${autoFixed} keys were auto-inserted with placeholders.`);
        console.log('Please review the JSON files and provide proper translations for the placeholders.');
    }
}

audit();

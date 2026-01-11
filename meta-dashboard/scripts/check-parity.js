const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '../messages');
const EN_PATH = path.join(MESSAGES_DIR, 'en.json');

function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(flattenKeys(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}

function checkParity() {
    console.log('--- Starting Translation Parity Check ---');

    if (!fs.existsSync(EN_PATH)) {
        console.error('Error: messages/en.json not found.');
        process.exit(1);
    }

    const enContent = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
    const enKeys = new Set(flattenKeys(enContent));
    console.log(`Reference (en) has ${enKeys.size} keys.`);

    const files = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json') && f !== 'en.json');
    let hasErrors = false;

    files.forEach(file => {
        const filePath = path.join(MESSAGES_DIR, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const keys = new Set(flattenKeys(content));
        const locale = file.replace('.json', '');

        const missing = [...enKeys].filter(k => !keys.has(k));

        if (missing.length > 0) {
            hasErrors = true;
            console.error(`\n[${locale}] Missing ${missing.length} keys:`);
            missing.forEach(k => console.error(`  - ${k}`));
        } else {
            console.log(`[${locale}] \u2713 All keys present.`);
        }
    });

    if (hasErrors) {
        console.error('\nParity check FAILED. Some languages are missing keys.');
        process.exit(1);
    } else {
        console.log('\nParity check PASSED.');
    }
}

checkParity();

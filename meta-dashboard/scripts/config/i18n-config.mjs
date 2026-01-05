import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  sourceLocale: 'en',
  targetLocales: ['ar', 'de', 'fr', 'he'],

  // Google Translate uses 'iw' for Hebrew, not 'he'
  languageMapping: {
    'en': 'en',
    'ar': 'ar',
    'de': 'de',
    'fr': 'fr',
    'he': 'iw'  // Google uses 'iw' for Hebrew
  },

  // RTL languages for future reference
  rtlLanguages: ['ar', 'he'],

  // Language names for display
  languageNames: {
    'en': 'English',
    'ar': 'Arabic',
    'de': 'German',
    'fr': 'French',
    'he': 'Hebrew'
  },

  paths: {
    messages: path.join(__dirname, '../../messages'),
    scripts: path.join(__dirname, '..')
  }
};

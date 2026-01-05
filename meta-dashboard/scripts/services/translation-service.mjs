import { Translate } from '@google-cloud/translate/build/src/v2/index.js';
import { config } from '../config/i18n-config.mjs';

export class TranslationService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Google Translate API key is required. Set GOOGLE_TRANSLATE_API_KEY in .env.local');
    }

    this.translate = new Translate({ key: apiKey });
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Translate a single text to target language
   */
  async translateText(text, targetLang) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // Don't translate empty strings
    if (text.trim() === '') {
      return text;
    }

    // Don't translate ALL_CAPS strings (likely acronyms like CTR, ROAS, CPC)
    if (text === text.toUpperCase() && text.length <= 10) {
      return text;
    }

    const googleLangCode = config.languageMapping[targetLang] || targetLang;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const [translation] = await this.translate.translate(text, googleLangCode);
        return translation;
      } catch (error) {
        if (attempt === this.maxRetries) {
          console.error(`Failed to translate "${text}" to ${targetLang}:`, error.message);
          return text; // Return original text on failure
        }
        // Wait before retry
        await this.sleep(this.retryDelay * attempt);
      }
    }

    return text;
  }

  /**
   * Translate multiple texts in batch
   */
  async batchTranslate(texts, targetLang) {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty strings and ALL_CAPS
    const textsToTranslate = texts.map(text => {
      if (!text || typeof text !== 'string' || text.trim() === '') {
        return null;
      }
      if (text === text.toUpperCase() && text.length <= 10) {
        return null;
      }
      return text;
    });

    const googleLangCode = config.languageMapping[targetLang] || targetLang;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const validTexts = textsToTranslate.filter(t => t !== null);

        if (validTexts.length === 0) {
          return texts;
        }

        const [translations] = await this.translate.translate(validTexts, googleLangCode);

        // Map translations back to original array
        let translationIndex = 0;
        return textsToTranslate.map((text, i) => {
          if (text === null) {
            return texts[i]; // Return original for skipped texts
          }
          return translations[translationIndex++];
        });
      } catch (error) {
        if (attempt === this.maxRetries) {
          console.error(`Batch translation failed for ${targetLang}:`, error.message);
          return texts; // Return original texts on failure
        }
        await this.sleep(this.retryDelay * attempt);
      }
    }

    return texts;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

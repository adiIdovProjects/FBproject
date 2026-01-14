import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export class LLMTranslationService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('Gemini API key is required. Set GEMINI_API_KEY in .env.local');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        // Separate model instance for simple text if needed, 
        // but for consistency we can use JSON mode for everything or just plain text for single items.
        // Actually, for single text, plain text is better.
        this.textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    /**
     * Translate a single text to target language
     */
    async translateText(text, targetLang) {
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return text;
        }

        try {
            const prompt = `You are a professional translator for a Facebook Ads Dashboard application. 
Translate the following text to ${targetLang}. 
Context: UI labels, buttons, and short text.
Rules:
1. Keep it concise.
2. Preserve capitalization for proper nouns (e.g. Facebook, Instagram).
3. Do not include quotes in the output unless they are in the source.
4. "Back" -> "Go Back" context (e.g. Retour, חזור).
5. "Breakdown" -> "Segmentation" context.
6. "Spend" -> "Monetary Cost" context.
7. Return ONLY the translation, no extra text.

Text to translate: "${text}"`;

            const result = await this.textModel.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error(`Gemini Translation failed for "${text}":`, error.message);
            return text;
        }
    }

    /**
     * Translate multiple texts in batch
     */
    async batchTranslate(texts, targetLang) {
        if (!texts || texts.length === 0) {
            return [];
        }

        // Gemini Flash has a large context window, so we can do bigger batches if needed.
        // But let's stick to 50 for safety and easier debugging.
        const chunks = [];
        const chunkSize = 50;

        for (let i = 0; i < texts.length; i += chunkSize) {
            chunks.push(texts.slice(i, i + chunkSize));
        }

        let allTranslations = [];

        for (const chunk of chunks) {
            try {
                const prompt = `You are a professional translator for a Facebook Ads Dashboard application.
Translate the following array of UI strings to ${targetLang}.
Return a raw JSON array of strings: string[].
Maintain the exact same order and length.

Rules:
1. "Back" -> "Go Back" context (e.g. Retour, חזור).
2. "Breakdown" -> "Segmentation" context.
3. "Spend" -> "Monetary Cost" context.
4. "Clear" -> "Reset/Empty" context.

Input Array:
${JSON.stringify(chunk)}`;

                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                let parsed = JSON.parse(text);

                if (Array.isArray(parsed)) {
                    allTranslations.push(...parsed);
                } else {
                    console.error("Unexpected JSON structure from Gemini:", parsed);
                    allTranslations.push(...chunk);
                }

            } catch (error) {
                console.error(`Batch Gemini Translation failed:`, error.message);
                allTranslations.push(...chunk); // Fallback to original
            }
        }

        return allTranslations;
    }
}

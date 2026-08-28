/**
 * OpenRouter AI Service
 * Calls the backend proxy (server/routes/ai.js) instead of OpenRouter directly,
 * so the OpenRouter API key never ships to the browser.
 */

import { api } from '../../api/client.js';

export const generateAIResponse = async (prompt, systemPrompt = "", featureType = "chat") => {
    try {
        const { content } = await api.post('/api/ai/generate', { prompt, systemPrompt, featureType });
        return content;
    } catch (error) {
        console.error(`[OpenRouter Service] Failed to generate response for ${featureType}:`, error);
        throw error;
    }
};

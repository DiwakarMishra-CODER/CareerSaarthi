/**
 * OpenRouter AI Service
 * Intelligent model routing based on feature type to optimize performance and cost.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export const generateAIResponse = async (prompt, systemPrompt = "", featureType = "chat") => {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key is missing. Please check your environment variables.');
    }

    // Determine Model & Format based on featureType
    let model = 'mistralai/mistral-nemo:free'; // Default for chat and fallback
    let responseFormat = null;

    if (featureType === 'interview') {
        model = 'meta-llama/llama-3-70b-instruct';
    } else if (featureType === 'resume' || featureType === 'linkedin' || featureType === 'explorer') {
        model = 'openai/gpt-4o-mini';
        responseFormat = { type: 'json_object' };
    } else if (featureType === 'chat') {
        model = 'mistralai/mistral-nemo:free';
    }

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
        model: model,
        messages: messages,
    };

    if (responseFormat) {
        payload.response_format = responseFormat;
    }

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                // Required OpenRouter headers
                'HTTP-Referer': window.location.origin, // Pass the site URL
                'X-Title': 'CareerSaarthi',             // Pass the site name
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            throw new Error('Unexpected response structure from OpenRouter');
        }

    } catch (error) {
        console.error(`[OpenRouter Service] Failed to generate response for ${featureType}:`, error);
        throw error;
    }
};

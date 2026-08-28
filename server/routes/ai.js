const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/ai/generate — server-side OpenRouter proxy for all chat/completion features.
// Mirrors the model-selection logic that used to live in src/services/ai/openRouterService.js,
// but keeps OPENROUTER_API_KEY on the server instead of shipping it to the browser.
router.post('/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt = '', featureType = 'chat' } = req.body;
    // An empty string is intentional (e.g. the interview's first turn relies on
    // systemPrompt alone) — only reject when prompt is missing entirely.
    if (typeof prompt !== 'string') return res.status(400).json({ error: 'prompt is required' });

    // Free OpenRouter models get congested independently of each other, so a
    // single hardcoded model is a single point of failure. Try each candidate
    // in turn (with a short backoff retry per model) before giving up. The paid
    // gpt-4o-mini has been fully reliable in practice, so it's the last-resort
    // fallback once every free option is exhausted — costs a fraction of a cent
    // per call and only gets used when the free tier is genuinely down.
    let modelChain = ['minimax/minimax-m3:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'google/gemma-4-31b-it:free', 'openai/gpt-4o-mini'];
    let responseFormat = null;

    if (featureType === 'resume' || featureType === 'linkedin' || featureType === 'explorer') {
      modelChain = ['openai/gpt-4o-mini']; // paid, reliable — no fallback needed
      responseFormat = { type: 'json_object' };
    }

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    let lastErr = null;
    for (const model of modelChain) {
      const payload = { model, messages };
      if (responseFormat) payload.response_format = responseFormat;

      let delay = 1000;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            payload,
            {
              headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'https://careersaarthi.vercel.app',
                'X-Title': 'CareerSaarthi',
              },
            }
          );
          const content = response.data?.choices?.[0]?.message?.content;
          if (!content) return res.status(502).json({ error: 'Unexpected response structure from OpenRouter' });
          return res.json({ content });
        } catch (err) {
          lastErr = err;
          if (err.response?.status !== 429) break; // non-429: this model won't recover, try the next one
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }
      // Exhausted retries (or hit a non-429 error) for this model — move to the next candidate.
    }
    console.error('AI generate error (all models exhausted):', lastErr?.response?.data || lastErr?.message);
    return res.status(lastErr?.response?.status || 500).json({ error: 'Failed to generate AI response' });
  } catch (err) {
    console.error('AI generate error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// POST /api/ai/gemini — server-side Gemini proxy with a rotating key pool and 429 backoff,
// so no GEMINI_API_KEY_* ever reaches the client bundle.
router.post('/gemini', async (req, res) => {
  try {
    const { model = 'gemini-2.5-flash', body } = req.body;
    if (!body) return res.status(400).json({ error: 'body is required' });

    const keys = Object.keys(process.env)
      .filter((k) => k.startsWith('GEMINI_API_KEY_'))
      .map((k) => process.env[k])
      .filter(Boolean);
    if (keys.length === 0) return res.status(500).json({ error: 'No Gemini API keys configured' });

    let delay = 1000;
    let lastResponse = null;
    for (let i = 0; i < 3; i++) {
      const apiKey = keys[Math.floor(Math.random() * keys.length)];
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        body,
        { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true }
      );
      if (response.status !== 429) return res.status(response.status).json(response.data);
      lastResponse = response;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
    return res.status(429).json(lastResponse?.data || { error: 'Rate limit exceeded after retries' });
  } catch (err) {
    console.error('Gemini proxy error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to call Gemini' });
  }
});

module.exports = router;

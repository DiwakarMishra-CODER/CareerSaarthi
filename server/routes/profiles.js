const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');
const axios = require('axios');
const supabase = require('../lib/supabase');

const upload = multer({ storage: multer.memoryStorage() });

function mapProfile(row) {
  if (!row) return null;
  return { ...row, _id: row.id, userId: row.user_id };
}

// GET /api/profiles/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.params.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json(mapProfile(profile));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/profiles — upsert
router.post('/', async (req, res) => {
  try {
    const { userId, _id, __v, id, user_id, created_at, updated_at, ...profileFields } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, ...profileFields }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return res.json(mapProfile(profile));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/profiles/analyze-linkedin  — AI logic UNCHANGED
router.post('/analyze-linkedin', upload.single('linkedinPdf'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!req.file) return res.status(400).json({ error: 'LinkedIn PDF is required' });

    const data = await pdf(req.file.buffer);
    const profileText = data.text;

    // Cross-reference with the user's stated skills, same as resumes.js's /analyze route.
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('skills')
      .eq('user_id', userId)
      .maybeSingle();
    const userSkills = userProfile?.skills?.join(', ') || 'Not specified';

    const prompt = `You are an expert LinkedIn Profile Strategist and Career Coach.
    Analyze the following LinkedIn profile extracted text and provide a comprehensive, actionable optimization report.
    Rules:
    1. Return ONLY a valid JSON object.
    2. Be critical but constructive.
    3. For 'improved' experience points, use strong action verbs and quantifiable results.
    4. identify matching and missing skills based on high-demand roles, cross-referencing the user's stated profile skills below.
    Profile Context:
    """${profileText}"""
    User's Stated Profile Skills: ${userSkills}
    Required JSON Structure:
    {
      "overallScore": number (1-100),
      "stats": { "keywords": number, "actionVerbs": number, "missingSections": number },
      "sections": {
        "headline": { "score": number, "current": "string", "analysis": "string", "suggestions": ["string"] },
        "about": { "score": number, "current": "string", "analysis": "string", "buzzwords": ["string"], "suggestion": "string" },
        "experience": { "score": number, "items": [{ "role": "string", "original": "string", "improved": "string", "impact": "High" }] },
        "skills": { "gapAnalysis": ["string"], "topSkills": ["string"] }
      }
    }`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const result = JSON.parse(response.data.choices[0].message.content);
    return res.json(result);
  } catch (err) {
    console.error('LinkedIn Analysis error:', err);
    return res.status(500).json({ error: 'Failed to analyze LinkedIn profile' });
  }
});

module.exports = router;

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Mic, MicOff, Send, Square, Loader2, Volume2, VolumeX,
    ChevronLeft, Sparkles, User, Bot
} from 'lucide-react';
import { generateAIResponse } from '../../services/ai/openRouterService';
import {
    unlockAudio,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    isSpeechRecognitionSupported,
} from '../../services/ai/speechService';
import { api, getUserId } from '../../api/client';
import InterviewResults from './InterviewResults';

// ─── Status enum ─────────────────────────────────────────────────────────────
const STATUS = {
    IDLE: 'idle',           // Before "Start Interview" is clicked
    LOADING: 'loading',     // Waiting for AI response
    SPEAKING: 'speaking',   // AI is speaking via TTS
    LISTENING: 'listening', // Mic is open, STT active
    READY: 'ready',         // Mic off, user can type / click
};

// ─── Build the system prompt from the setup config ───────────────────────────
function buildSystemPrompt({ jobTitle, company, experienceLevel, jobDescription }, profile) {
    const profileContext = profile?.skills?.length || profile?.current_role || profile?.career_goals
        ? `
Candidate's profile (use this to tailor question difficulty and relevance, don't just recite it back):
${profile?.current_role ? `- Current role: ${profile.current_role}` : ''}
${profile?.skills?.length ? `- Stated skills: ${profile.skills.join(', ')}` : ''}
${profile?.career_goals ? `- Career goals: ${profile.career_goals}` : ''}
`
        : '';

    return `You are an expert technical and behavioral interviewer conducting a real mock interview.

Role being interviewed for: ${jobTitle}
Company: ${company}
Candidate experience level: ${experienceLevel}
Job description:
"""
${jobDescription}
"""
${profileContext}
Instructions:
- Ask ONE focused interview question at a time. Never ask multiple questions in the same message.
- Start with a warm, brief greeting and then ask your first question directly.
- After the candidate answers, acknowledge briefly (1 sentence max), then ask the next question.
- Mix behavioral (STAR-method) and role-specific technical questions relevant to the JD above.
- Keep your messages concise and conversational — this is a voice interview.
- Do NOT use markdown headers, bullet points, or formatting. Plain text only.
- After roughly 8–10 questions, conclude the interview warmly and provide 2–3 sentences of constructive feedback.`;
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function ChatBubble({ message }) {
    const isAI = message.role === 'ai';
    return (
        <div className={`flex items-end gap-3 ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-3 duration-400`}>
            {isAI && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
                    <Bot className="w-4 h-4 text-white" />
                </div>
            )}
            <div
                className={[
                    'max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    isAI
                        ? 'bg-white/8 border border-white/10 text-slate-100 rounded-bl-sm'
                        : 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-br-sm shadow-lg shadow-cyan-500/10',
                ].join(' ')}
            >
                {message.content}
            </div>
            {!isAI && (
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-300" />
                </div>
            )}
        </div>
    );
}

// ─── Animated mic orb ────────────────────────────────────────────────────────
function MicOrb() {
    return (
        <div className="relative flex items-center justify-center w-6 h-6">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60 animate-ping" />
            <Mic className="relative w-4 h-4 text-white" />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InterviewSession({ config, profile, onEnd }) {
    const systemPrompt = buildSystemPrompt(config, profile);

    const [status, setStatus] = useState(STATUS.IDLE);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [results, setResults] = useState(null);
    const [isGeneratingResults, setIsGeneratingResults] = useState(false);

    // conversationHistory holds the raw [{role, content}] array we send to AI.
    const conversationHistory = useRef([]);
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    // ── Auto-scroll chat ──────────────────────────────────────────────────────
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stopSpeaking();
            stopListening();
        };
    }, []);

    // ── Append a message to chat ──────────────────────────────────────────────
    const addMessage = useCallback((role, content) => {
        setMessages((prev) => [...prev, { role, content, id: Date.now() + Math.random() }]);
    }, []);

    // ── Speak AI text then transition to READY ────────────────────────────────
    const speakAIMessage = useCallback(
        (text) => {
            if (isMuted) {
                setStatus(STATUS.READY);
                return;
            }
            setStatus(STATUS.SPEAKING);
            speak(text, () => {
                setStatus(STATUS.READY);
            });
        },
        [isMuted]
    );

    // ── Fetch AI response and handle the reply ────────────────────────────────
    const fetchAIResponse = useCallback(
        async (userMessageContent) => {
            setStatus(STATUS.LOADING);

            // Build the user turn for history (if there is one)
            if (userMessageContent) {
                conversationHistory.current.push({ role: 'user', content: userMessageContent });
            }

            // Build a single prompt from the full history for openRouterService
            const conversationPrompt = conversationHistory.current
                .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
                .join('\n\n');

            // One silent retry before surfacing an error — free-tier model
            // congestion is transient and often clears within a couple seconds,
            // and this call (especially the opening greeting) is high-visibility.
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const aiText = await generateAIResponse(conversationPrompt, systemPrompt, 'interview');
                    conversationHistory.current.push({ role: 'assistant', content: aiText });
                    addMessage('ai', aiText);
                    speakAIMessage(aiText);
                    return;
                } catch (err) {
                    if (attempt === 0) {
                        console.warn('[InterviewSession] AI call failed, retrying once:', err);
                        await new Promise((r) => setTimeout(r, 2000));
                        continue;
                    }
                    console.error('[InterviewSession] AI error:', err);
                    const errorMsg = 'I encountered a connection issue. Please check your API key and try again.';
                    addMessage('ai', errorMsg);
                    speakAIMessage(errorMsg);
                }
            }
        },
        [systemPrompt, addMessage, speakAIMessage]
    );

    // ── "Start Interview" button handler ──────────────────────────────────────
    const handleStart = () => {
        // THIS MUST be called synchronously in the click handler to unlock audio.
        unlockAudio();
        fetchAIResponse(null); // First turn – no user message yet
    };

    // ── Submit a user answer ──────────────────────────────────────────────────
    const handleSubmit = useCallback(
        (text) => {
            const trimmed = (text || inputText).trim();
            if (!trimmed || status === STATUS.LOADING || status === STATUS.SPEAKING) return;

            stopListening();
            addMessage('user', trimmed);
            setInputText('');
            fetchAIResponse(trimmed);
        },
        [inputText, status, addMessage, fetchAIResponse]
    );

    const endInterviewAndGetFeedback = async () => {
        stopSpeaking();
        stopListening();

        const hasUserResponses = messages.some(m => m.role === 'user');
        if (!hasUserResponses) {
            alert("Please answer at least one question before ending the session to generate feedback.");
            return;
        }

        setIsGeneratingResults(true);

        try {
            const transcriptText = messages
                .map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
                .join('\n\n');

            const prompt = `You are an expert HR manager and technical interview coach.
Analyze the following interview transcript for a "${config.jobTitle}" position at "${config.company}".
Provide a detailed performance report.

TRANSCRIPT:
"""
${transcriptText}
"""

Score these three dimensions specifically:
- clarity: how clearly and concisely the candidate communicated their ideas.
- starStructure: how well behavioral answers followed the Situation/Task/Action/Result structure.
- keywordDensity: how well the candidate used role- and domain-relevant technical terms and keywords for "${config.jobTitle}".

Return ONLY a valid JSON object matching this schema. Do not include any markdown formatting, headers, backticks, or text outside the JSON:
{
  "overallScore": number (1-100),
  "scores": {
    "clarity": number (1-100),
    "starStructure": number (1-100),
    "keywordDensity": number (1-100)
  },
  "strengths": ["string", "string", "string"],
  "weakPoints": ["string", "string", "string"],
  "suggestions": ["string", "string", "string"],
  "weakTopics": ["string", "string"]
}`;

            const responseText = await generateAIResponse(prompt, "", "resume");
            const cleanText = responseText.replace(/```json|```/g, '').trim();
            const result = JSON.parse(cleanText);

            await saveSession(result, "Session ended early by candidate.");
            setResults(result);
        } catch (error) {
            console.error("Feedback generation error:", error);
            // Fallback so "End Interview" always produces a report, even if the AI call fails.
            const fallback = buildFallbackReport(messages);
            await saveSession(fallback, "AI feedback generation failed; showing a fallback summary based on the transcript.");
            setResults(fallback);
        } finally {
            setIsGeneratingResults(false);
        }
    };

    // ── Persist a completed session (real or fallback report) to Supabase ─────
    const saveSession = async (result, feedbackNote) => {
        try {
            const userId = getUserId();
            if (!userId) return;
            await api.post('/api/interviews', {
                userId,
                interviewType: 'custom',
                customRole: config.jobTitle,
                config: config,
                overallScore: result.overallScore,
                scores: result.scores,
                transcript: messages.map(m => ({ speaker: m.role === 'user' ? 'USER' : 'INTERVIEWER', content: m.content })),
                feedback: { overall_feedback: feedbackNote },
                strengths: result.strengths,
                weakPoints: result.weakPoints,
                suggestions: result.suggestions,
                weakTopics: result.weakTopics,
                questionsAttempted: messages.filter(m => m.role === 'user').length,
                questionsTotal: messages.filter(m => m.role === 'ai').length,
                timeTaken: 120, // default time
                status: 'completed'
            });
        } catch (saveErr) {
            console.error("Failed to save session to DB:", saveErr);
        }
    };

    // ── Basic transcript-derived report used when AI feedback generation fails ─
    const buildFallbackReport = (msgs) => {
        const questionsAttempted = msgs.filter(m => m.role === 'user').length;
        const overallScore = questionsAttempted > 0 ? Math.min(70, 40 + questionsAttempted * 5) : 40;
        return {
            overallScore,
            scores: { clarity: overallScore, starStructure: overallScore, keywordDensity: overallScore },
            strengths: ["You completed the session and engaged with the interviewer's questions."],
            weakPoints: ["Detailed AI feedback wasn't available this time."],
            suggestions: ["Retry the interview once the AI service is back to get a full performance report."],
            weakTopics: [],
        };
    };

    // ── Mic toggle ────────────────────────────────────────────────────────────
    const handleMicToggle = useCallback(() => {
        if (status === STATUS.LISTENING) {
            stopListening();
            const current = inputText.trim();
            if (current) {
                handleSubmit(current);
            } else {
                setStatus(STATUS.READY);
            }
            return;
        }

        if (status !== STATUS.READY) return;

        setInputText('');
        const supported = startListening(
            // onResult – update input live
            (transcript) => {
                setInputText(transcript);
            },
            // onSilence – auto-submit
            (finalTranscript) => {
                setStatus(STATUS.READY); // silence cb fires after stopListening inside service
                if (finalTranscript.trim()) {
                    addMessage('user', finalTranscript.trim());
                    setInputText('');
                    fetchAIResponse(finalTranscript.trim());
                } else {
                    setStatus(STATUS.READY);
                }
            }
        );

        if (supported) setStatus(STATUS.LISTENING);
    }, [status, inputText, handleSubmit, addMessage, fetchAIResponse]);

    // ── Mute / unmute ─────────────────────────────────────────────────────────
    const handleMuteToggle = () => {
        if (!isMuted) {
            stopSpeaking();
            setIsMuted(true);
            if (status === STATUS.SPEAKING) setStatus(STATUS.READY);
        } else {
            setIsMuted(false);
        }
    };

    // ── Keyboard send ─────────────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // ── Derived booleans ──────────────────────────────────────────────────────
    const isInputDisabled = status === STATUS.IDLE || status === STATUS.LOADING || status === STATUS.SPEAKING;
    const isMicDisabled = status === STATUS.IDLE || status === STATUS.LOADING || status === STATUS.SPEAKING;
    const micSupported = isSpeechRecognitionSupported();

    if (isGeneratingResults) {
        return (
            <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col items-center justify-center text-center p-6 z-[110]">
                <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4 animate-bounce" />
                <h2 className="text-xl font-bold text-white mb-2">Analyzing your performance...</h2>
                <p className="text-slate-400 text-sm max-w-sm">
                    Our AI is evaluating your communication, accuracy, and technical confidence to build your custom growth path.
                </p>
            </div>
        );
    }

    if (results) {
        return (
            <div className="fixed inset-0 overflow-y-auto z-[100] bg-[#0a0a0f] text-white">
                <InterviewResults
                    results={results}
                    interviewType={config.jobTitle}
                    onRetry={() => {
                        setResults(null);
                        setMessages([]);
                        conversationHistory.current = [];
                        setStatus(STATUS.IDLE);
                    }}
                    onClose={() => {
                        onEnd();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-slate-950/95 backdrop-blur-3xl text-white z-[100]">
            {/* ── TOP BAR ──────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/8 bg-black/30 backdrop-blur-xl flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        id="interview-session-back"
                        onClick={() => {
                            stopSpeaking();
                            stopListening();
                            onEnd();
                        }}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-xs font-bold"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Exit
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white leading-none">{config.jobTitle}</p>
                            <p className="text-[10px] text-slate-500 leading-none mt-0.5">{config.company}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* End Interview Button */}
                    {status !== STATUS.IDLE && (
                        <button
                            id="interview-end-btn"
                            onClick={endInterviewAndGetFeedback}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-all shadow-md hover:shadow-red-500/20 active:scale-95 flex items-center gap-1.5"
                        >
                            <Square className="w-3 h-3 fill-current" />
                            End Interview
                        </button>
                    )}

                    {/* Status pill */}
                    <div className={[
                        'flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300',
                        status === STATUS.IDLE && 'bg-white/5 border-white/10 text-slate-500',
                        status === STATUS.LOADING && 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                        status === STATUS.SPEAKING && 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                        status === STATUS.LISTENING && 'bg-red-500/10 border-red-500/20 text-red-400',
                        status === STATUS.READY && 'bg-green-500/10 border-green-500/20 text-green-400',
                    ].filter(Boolean).join(' ')}>
                        <span className={[
                            'w-1.5 h-1.5 rounded-full',
                            status === STATUS.LOADING && 'bg-amber-400 animate-pulse',
                            status === STATUS.SPEAKING && 'bg-blue-400 animate-pulse',
                            status === STATUS.LISTENING && 'bg-red-400 animate-ping',
                            status === STATUS.READY && 'bg-green-400',
                            status === STATUS.IDLE && 'bg-slate-600',
                        ].filter(Boolean).join(' ')} />
                        {status === STATUS.IDLE && 'Ready'}
                        {status === STATUS.LOADING && 'Thinking…'}
                        {status === STATUS.SPEAKING && 'Speaking'}
                        {status === STATUS.LISTENING && 'Listening'}
                        {status === STATUS.READY && 'Your Turn'}
                    </div>

                    {/* Mute toggle */}
                    <button
                        id="interview-mute-toggle"
                        onClick={handleMuteToggle}
                        title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        {isMuted
                            ? <VolumeX className="w-4 h-4 text-slate-500" />
                            : <Volume2 className="w-4 h-4 text-cyan-400" />}
                    </button>
                </div>
            </header>

            {/* ── CHAT AREA ─────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                {/* START screen */}
                {status === STATUS.IDLE && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-6 animate-in fade-in duration-700">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl scale-150" />
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
                                <Bot className="w-10 h-10 text-white" />
                            </div>
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-white mb-2">Ready when you are</h2>
                            <p className="text-slate-400 text-sm max-w-sm">
                                Your AI interviewer is prepared. Click the button below — it unlocks audio and begins your session instantly.
                            </p>
                        </div>
                        <button
                            id="interview-start-btn"
                            onClick={handleStart}
                            className="group flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                            <Sparkles className="w-4 h-4" />
                            Start Interview
                        </button>
                    </div>
                )}

                {/* Chat messages */}
                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg} />
                ))}

                {/* Loading indicator */}
                {status === STATUS.LOADING && (
                    <div className="flex items-end gap-3 justify-start animate-in fade-in duration-300">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white/8 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </main>

            {/* ── BOTTOM INPUT AREA ─────────────────────────────────────────── */}
            <footer className="flex-shrink-0 border-t border-white/8 bg-black/40 backdrop-blur-xl px-4 md:px-6 py-4">
                {/* Listening indicator banner */}
                {status === STATUS.LISTENING && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in duration-300">
                        <MicOrb />
                        <span className="text-xs text-red-300 font-bold">
                            Listening… speak your answer. Auto-sends after 2.5 s of silence.
                        </span>
                    </div>
                )}

                <div className="flex items-end gap-3">
                    {/* Text input */}
                    <div className="flex-1 relative">
                        <textarea
                            id="interview-text-input"
                            ref={inputRef}
                            rows={1}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isInputDisabled}
                            placeholder={
                                status === STATUS.IDLE
                                    ? 'Click "Start Interview" above…'
                                    : status === STATUS.SPEAKING
                                    ? 'AI is speaking…'
                                    : status === STATUS.LOADING
                                    ? 'AI is thinking…'
                                    : status === STATUS.LISTENING
                                    ? 'Speak or type your answer…'
                                    : 'Type your answer or use the mic…'
                            }
                            className={[
                                'w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600',
                                'focus:outline-none transition-all duration-300 resize-none leading-relaxed',
                                isInputDisabled
                                    ? 'border-white/5 opacity-50 cursor-not-allowed'
                                    : 'border-white/15 hover:border-white/25 focus:border-cyan-500/50 focus:bg-white/8',
                                status === STATUS.LISTENING && 'border-red-500/40 bg-red-500/5',
                            ].filter(Boolean).join(' ')}
                            style={{ minHeight: '46px', maxHeight: '140px', overflowY: 'auto' }}
                        />
                    </div>

                    {/* Mic button */}
                    {micSupported && (
                        <button
                            id="interview-mic-btn"
                            onClick={handleMicToggle}
                            disabled={isMicDisabled}
                            title={status === STATUS.LISTENING ? 'Stop & send' : 'Start speaking'}
                            className={[
                                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 border',
                                isMicDisabled
                                    ? 'bg-white/3 border-white/5 text-slate-700 cursor-not-allowed'
                                    : status === STATUS.LISTENING
                                    ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/30 hover:bg-red-400 scale-105'
                                    : 'bg-white/8 border-white/15 text-slate-300 hover:bg-white/15 hover:text-white hover:border-white/30',
                            ].filter(Boolean).join(' ')}
                        >
                            {status === STATUS.LISTENING
                                ? <Square className="w-4 h-4 fill-white" />
                                : <Mic className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Send button */}
                    <button
                        id="interview-send-btn"
                        onClick={() => handleSubmit()}
                        disabled={isInputDisabled || !inputText.trim()}
                        className={[
                            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 border',
                            isInputDisabled || !inputText.trim()
                                ? 'bg-white/3 border-white/5 text-slate-700 cursor-not-allowed'
                                : 'bg-gradient-to-br from-cyan-500 to-blue-600 border-transparent text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95',
                        ].filter(Boolean).join(' ')}
                    >
                        {status === STATUS.LOADING
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4" />}
                    </button>
                </div>

                <p className="mt-2 text-center text-[10px] text-slate-600">
                    Press <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">Enter</kbd> to send &nbsp;·&nbsp; <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5 font-mono">Shift+Enter</kbd> for new line
                </p>
            </footer>
        </div>
    );
}

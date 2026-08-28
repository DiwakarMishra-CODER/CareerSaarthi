import { Trophy, Target, AlertTriangle, CheckCircle, ArrowRight, RotateCcw, Home, TrendingUp, Sparkles, Brain, Award, BarChart3, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mapWeakAreasToResources } from '../../data/interviewData';

export default function InterviewResults({
    results,
    interviewType,
    onRetry,
    onClose
}) {
    if (!results) return null;

    const {
        overallScore = 0,
        scores = {},
        problems = [],
        patternsAsked = [],
        strengths = [],
        weakPoints = [],
        suggestions = [],
        weakTopics = [],
        timeTaken = 0,
        questionsAttempted = 0,
        questionsTotal = 0
    } = results;

    const suggestedResources = mapWeakAreasToResources([...weakTopics, ...weakPoints]);

    const sectionScores = {
        clarity: scores.clarity || overallScore,
        starStructure: scores.starStructure || overallScore,
        keywordDensity: scores.keywordDensity || overallScore
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-cyan-400';
        if (score >= 60) return 'text-emerald-400';
        if (score >= 40) return 'text-amber-400';
        return 'text-red-400';
    };

    const getScoreMessage = (score) => {
        if (score >= 80) return { emoji: '🌟', text: 'Excellent! You\'re interview ready!' };
        if (score >= 60) return { emoji: '👍', text: 'Good effort! Keep practicing!' };
        if (score >= 40) return { emoji: '📚', text: 'Needs improvement. Don\'t give up!' };
        return { emoji: '📈', text: 'Keep learning! Practice makes perfect!' };
    };

    const scoreInfo = getScoreMessage(overallScore);

    return (
        <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden p-6 flex flex-col items-center">
            <div className="max-w-4xl w-full relative z-10">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/5 border border-white/10 rounded-full text-cyan-400 text-xs font-black uppercase tracking-widest mb-6">
                        <Trophy className="w-4 h-4" />
                        Interview Complete
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Performance <span className="text-cyan-400">Report</span></h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">{interviewType} Round</p>
                </div>

                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 text-center mb-12">
                    <div className="text-6xl mb-6">{scoreInfo.emoji}</div>
                    <div className="relative inline-block">
                        <div className={`text-5xl font-black ${getScoreColor(overallScore)} mb-1`}>
                            {overallScore}
                            <span className="text-xl text-slate-500 font-bold ml-1">/100</span>
                        </div>
                    </div>
                    <p className="text-lg text-white font-black mb-6">{scoreInfo.text}</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="text-slate-500 text-[10px] font-black uppercase mb-1">Attempted</div>
                            <div className="text-white font-black text-xl">{questionsAttempted}/{questionsTotal}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="text-slate-500 text-[10px] font-black uppercase mb-1">Time Taken</div>
                            <div className="text-white font-black text-xl">{Math.floor(timeTaken / 60)}m</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <div className="text-slate-500 text-[10px] font-black uppercase mb-1">Accuracy</div>
                            <div className="text-white font-black text-xl">{overallScore}%</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 mb-12">
                    <h3 className="text-base font-black text-cyan-400 mb-6 flex items-center gap-2 uppercase">
                        <BarChart3 className="w-4 h-4" /> Score Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                            <div className="text-slate-500 text-[10px] font-black uppercase mb-1">Clarity</div>
                            <div className={`font-black text-2xl ${getScoreColor(sectionScores.clarity)}`}>{sectionScores.clarity}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                            <div className="text-slate-500 text-[10px] font-black uppercase mb-1">STAR Structure</div>
                            <div className={`font-black text-2xl ${getScoreColor(sectionScores.starStructure)}`}>{sectionScores.starStructure}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                            <div className="text-slate-500 text-[10px] font-black uppercase mb-1">Keyword Density</div>
                            <div className={`font-black text-2xl ${getScoreColor(sectionScores.keywordDensity)}`}>{sectionScores.keywordDensity}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                        <h3 className="text-base font-black text-emerald-400 mb-4 flex items-center gap-2 uppercase">
                            <Award className="w-4 h-4" /> Key Strengths
                        </h3>
                        <div className="space-y-4">
                            {strengths.map((s, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                                    <CheckCircle className="w-5 h-5 text-emerald-400 mt-1" />
                                    <p className="text-slate-300 font-medium">{s}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                        <h3 className="text-base font-black text-amber-400 mb-4 flex items-center gap-2 uppercase">
                            <Brain className="w-4 h-4" /> Growth Areas
                        </h3>
                        <div className="space-y-4">
                            {weakPoints.map((w, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-1" />
                                    <p className="text-slate-300 font-medium">{w}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 mb-12">
                    <h3 className="text-lg font-black text-cyan-400 mb-8 flex items-center gap-3 uppercase">
                        <GraduationCap className="w-5 h-5" /> Roadmap to Success
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestions.map((s, i) => (
                            <div key={i} className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl">
                                <ArrowRight className="w-5 h-5 text-cyan-400" />
                                <p className="text-slate-200 font-bold">{s}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
                    <button
                        onClick={onRetry}
                        className="w-full sm:w-auto px-10 py-5 bg-cyan-500 text-white font-black uppercase rounded-full hover:scale-105 transition-all shadow-lg shadow-cyan-500/25"
                    >
                        Retry Interview
                    </button>
                    <Link
                        to="/dashboard"
                        onClick={onClose}
                        className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 text-white font-black uppercase rounded-full hover:bg-white/10 transition-all"
                    >
                        Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, Suspense, lazy } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api/client.js";
import Footer from "../components/UI/Footer.jsx";
import { motion } from "framer-motion";
import {
  Sparkles,
  Target,
  X,
  Loader2,
  FileText,
  Map,
  Brain,
  Award,
  Zap,
  ArrowRight,
  Activity,
  History
} from "lucide-react";
import careerForgeLogo from "../assets/logo.png";
import StatCard from "../components/UI/StatCard.jsx";
import SkillGapWidget from "../components/UI/SkillGapWidget.jsx";

const TrendingJobs = lazy(() => import("../components/UI/TrendingJobs.jsx"));

// --- Icon Map for Safe Caching ---
const iconMap = {
  FileText: FileText,
  Map: Map,
  Brain: Brain,
};

export default function Dashboard() {
  const { user, profile } = useOutletContext();
  const [dataLoading, setDataLoading] = useState(true);

  const [latestRoadmap, setLatestRoadmap] = useState(null);
  const [stats, setStats] = useState({ resumes: 0, roadmaps: 0, interviews: 0 });
  const [showProfileReminder, setShowProfileReminder] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      if (user) {
        if (!profile || !profile.full_name) {
          setShowProfileReminder(true);
        }

        try {
          const userId = user.id;
          const [
            resumeCountRes,
            roadmapCountRes,
            interviewsCountRes,
            recentRoadmaps,
            recentResumes,
            recentInterviews
          ] = await Promise.all([
            api.get(`/api/resumes/count?userId=${userId}`),
            api.get(`/api/roadmaps/count?userId=${userId}`),
            api.get(`/api/interviews/count?userId=${userId}`),
            api.get(`/api/roadmaps/recent?userId=${userId}&limit=1`),
            api.get(`/api/resumes/recent?userId=${userId}&limit=3`),
            api.get(`/api/interviews/recent?userId=${userId}&limit=3`),
          ]);

          const newLatestRoadmap = recentRoadmaps[0] || null;
          setLatestRoadmap(newLatestRoadmap);

          const newStats = {
            resumes: resumeCountRes.count || 0,
            roadmaps: roadmapCountRes.count || 0,
            interviews: interviewsCountRes.count || 0,
          };
          setStats(newStats);

          const activities = [];
          if (recentResumes) activities.push(...recentResumes.map(i => ({ type: "Resume created", title: i.title, date: i.createdAt, link: "/resume-builder", icon: 'FileText' })));
          if (recentRoadmaps) activities.push(...recentRoadmaps.map(i => ({ type: "Roadmap generated", title: i.title, date: i.createdAt, link: "/career-explorer", icon: 'Map' })));
          if (recentInterviews) activities.push(...recentInterviews.map(i => ({ type: "Interview practiced", title: i.job_title, date: i.createdAt, link: "/interview-prep", icon: 'Brain' })));

          const newRecentActivity = activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
          setRecentActivity(newRecentActivity);

          let newAiSuggestion = null;
          if (profile && profile.current_role && profile.career_goals) {
            try {
              const data = await api.post('/api/ai/gemini', {
                model: 'gemini-2.5-flash',
                body: { contents: [{ parts: [{ text: `Based on this user's profile (Role: ${profile.current_role}, Goal: ${profile.career_goals}), provide one single, short, and actionable suggestion for their next career step. Be encouraging.` }] }] },
              });
              newAiSuggestion = data.candidates[0].content.parts[0].text.trim();
              setAiSuggestion(newAiSuggestion);
            } catch (e) { console.error("AI suggestion fetch failed:", e); }
          }
        } catch (error) {
          console.error("Dashboard data load error:", error);
        }
      }
      setDataLoading(false);
    };
    loadData();
  }, [user, profile]);

  const actionItems = [
    { title: "Resume Tools", link: "/resume-builder", icon: <FileText size={18}/> },
    { title: "Career Explorer", link: "/career-explorer", icon: <Map size={18}/> },
    { title: "Interview Prep", link: "/interview-prep", icon: <Brain size={18}/> },
  ];

  const statItems = [
    { icon: "FileText", label: "Resumes Created", value: stats.resumes, color: "emerald", link: "/resume-builder" },
    { icon: "Map", label: "Career Roadmaps", value: stats.roadmaps, color: "blue", link: "/career-explorer" },
    { icon: "Brain", label: "Interviews Practiced", value: stats.interviews, color: "purple", link: "/interview-history" },
  ];

  if (dataLoading) {
    return (
      <div className="p-8 flex justify-center min-h-screen items-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen text-white relative flex flex-col pt-0">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 relative z-10"
      >
        <main className="max-w-7xl mx-auto px-4 md:px-8 pt-36 pb-16 space-y-12">
        {showProfileReminder && (
          <motion.div
            variants={itemVariants}
            className="bg-yellow-500/10 backdrop-blur-2xl rounded-2xl border border-yellow-400/20 p-5 mb-8 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-1">
              <button onClick={() => setShowProfileReminder(false)} className="text-yellow-200/50 hover:text-yellow-200 p-2 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                <Target className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tighter">Scale Your Career</h3>
                <p className="text-yellow-200/70 text-sm mb-4">Complete your profile to unlock hyper-personalized AI career paths and skill recommendations.</p>
                <Link to="/profile">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black rounded-xl text-xs px-5 py-2.5 transition-colors shadow-lg shadow-yellow-500/20"
                  >
                    Complete Profile
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- Hero Section --- */}
        <section className="grid lg:grid-cols-[1fr_400px] gap-12 items-center pt-8">
          <motion.div variants={itemVariants} className="space-y-8">

            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter">
              Discover Your <br /> <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent pr-2">Future, {firstName}</span>.
            </h1>

            <div className="relative">
               <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500/50 to-transparent rounded-full" />
               {aiSuggestion ? (
                <div className="space-y-2">
                  <p className="text-xl text-gray-400 max-w-xl leading-relaxed font-medium italic">
                    "{aiSuggestion}"
                  </p>
                  <p className="text-xs font-black text-emerald-500/50 uppercase tracking-[.3em]">AI Daily Insight</p>
                </div>
              ) : (
                <p className="text-xl text-gray-400 max-w-xl leading-relaxed font-medium">
                  Forge your path to success. We've mapped out the tools and data you need to reach your professional peaks.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              {actionItems.map((item, index) => (
                <Link to={item.link} key={index}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 px-6 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl font-black text-sm hover:bg-emerald-500 hover:text-slate-900 transition-all group lg:min-w-[200px]"
                  >
                    <span className="text-emerald-400 group-hover:text-slate-900 transition-colors">{item.icon}</span>
                    {item.title}
                    <ArrowRight size={16} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all"/>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="hidden lg:flex items-center justify-center relative"
          >
            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse" />
            <img src={careerForgeLogo} alt="CareerSaarthi" className="w-full h-full object-cover" />
          </motion.div>
        </section>

        {/* --- Stats Grid --- */}
        <motion.section variants={itemVariants} className="pt-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {statItems.map((item, idx) => (
              <StatCard key={item.label} {...item} index={idx} />
            ))}
          </div>
        </motion.section>

        {/* --- Widgets & Activity --- */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <motion.div variants={itemVariants} className="space-y-8">
            <SkillGapWidget profile={profile} roadmap={latestRoadmap} />

            <Suspense fallback={
              <div className="flex justify-center items-center h-48 bg-white/5 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
            }>
              <TrendingJobs profile={profile} />
            </Suspense>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sticky top-28">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black italic tracking-tighter uppercase">Activity Stream</h3>
                <History className="w-5 h-5 text-blue-400" />
              </div>

              {recentActivity.length > 0 ? (
                <div className="space-y-6">
                  {recentActivity.map((activity, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="relative">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 transition-colors group-hover:border-blue-500/30">
                          {activity.icon && iconMap[activity.icon] ? (
                            React.createElement(iconMap[activity.icon], { className: "w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" })
                          ) : (
                            <Activity className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                          )}
                        </div>
                        {i !== recentActivity.length - 1 && (
                          <div className="absolute top-10 bottom-[-24px] left-1/2 -translate-x-1/2 w-px bg-white/5" />
                        )}
                      </div>
                      <div className="flex-1 pb-6 border-b border-white/5 group-last:border-0 group-last:pb-0">
                        <p className="text-sm font-bold text-gray-200">{activity.type} - {activity.title}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Your activity stream is empty.<br/>Start building today!</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        </main>
      </motion.div>
      <Footer />
    </div>
  );
}

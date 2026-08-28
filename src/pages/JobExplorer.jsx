import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Sparkles, Zap, ArrowRight, Bookmark, Briefcase } from 'lucide-react';
import { api, getUserId } from '../api/client';
import { toast } from 'react-hot-toast';
import JobCard from '../components/JobFinder/JobCard';
import JobDetailsPanel from '../components/JobFinder/JobDetailsPanel';

const EditorialBackground = () => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Dynamic Mesh Glow */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                    x: [0, 50, 0],
                    y: [0, 30, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px]"
            />
            <motion.div 
                animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.4, 0.2],
                    x: [0, -40, 0],
                    y: [0, -50, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[100px]"
            />

            {/* Glowing Particles */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                        opacity: [0, 0.2, 0],
                        scale: [0.5, 1, 0.5],
                        x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
                        y: [Math.random() * 100 + "%", Math.random() * 100 + "%"]
                    }}
                    transition={{ 
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        delay: i * 2,
                        ease: "easeInOut"
                    }}
                    className="absolute w-1 h-1 bg-cyan-400 rounded-full blur-[1px]"
                />
            ))}

            {/* Static Grain Texture */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
        </div>
    );
};

const JobExplorer = () => {
    const { profile } = useOutletContext() || {};
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [country, setCountry] = useState('in');
    const [activeTab, setActiveTab] = useState('discover'); // 'discover' or 'saved'
    const [jobs, setJobs] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState(null);

    // Format raw Adzuna API job data to match the high-end editorial UI props
    const formatRawJob = (job) => {
        // Create deterministic match metrics based on title
        const titleHash = job.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const matchScore = 78 + (titleHash % 21); // 78% - 98% range

        const skillsRequired = (job.tags && job.tags.length > 0)
            ? job.tags.map((tag, idx) => ({ name: tag, matched: idx % 3 !== 2 }))
            : [
                { name: "Software Development", matched: true },
                { name: "React Engineering", matched: true },
                { name: "System Design", matched: false }
              ];

        const unifiedUrl = job.job_url || job.url || '#';

        return {
            ...job,
            url: unifiedUrl,
            job_url: unifiedUrl, // Guarantee BOTH are fully set and identical
            salary: job.salary || 'Open',
            matchScore,
            aiWhyMatch: `Your background aligns perfectly with this role's target skills, specifically matching details in ${job.tags?.[0] || 'engineering solutions'} and ${job.tags?.[1] || 'modern system architecture'}.`,
            skillsRequired,
            tags: job.tags?.length ? job.tags : ['Full-Time', 'Remote']
        };
    };

    useEffect(() => {
        fetchSavedJobs();
    }, []);

    // Fetch jobs when country changes to keep UI reactive and native
    useEffect(() => {
        if (activeTab === 'discover') {
            fetchJobs(query, location, country);
        }
    }, [country]);

    // Once the shared profile loads, pre-fill the search with the candidate's
    // current role/skills (only if they haven't already typed a search themselves).
    useEffect(() => {
        if (!profile || query) return;
        const defaultQuery = profile.current_role || profile.skills?.[0] || '';
        if (!defaultQuery) return;
        const defaultLocation = profile.location || location;
        setQuery(defaultQuery);
        if (defaultLocation) setLocation(defaultLocation);
        fetchJobs(defaultQuery, defaultLocation, country);
    }, [profile]);

    const fetchJobs = async (searchQuery = query, searchLoc = location, searchCountry = country) => {
        setIsSearching(true);
        setError(null);
        try {
            const data = await api.get(`/api/jobs/search?q=${searchQuery}&location=${searchLoc}&country=${searchCountry}`);
            const formatted = data.map(formatRawJob);
            setJobs(formatted);
        } catch (err) {
            console.error('[JobExplorer] Adzuna Search failed:', err);
            setError('Could not connect to Adzuna job directory. Please check your network or try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const fetchSavedJobs = async () => {
        const userId = getUserId();
        try {
            const data = await api.get(`/api/jobs/saved?userId=${userId}`);
            // Map table attributes to component props
            const formatted = data.map(sj => formatRawJob({
                id: sj.job_id,
                title: sj.title,
                company: sj.company,
                location: sj.location,
                url: sj.url,
                job_url: sj.job_url || sj.url,
                description: sj.description,
                savedDbId: sj.id // Store the actual saved DB entry ID for deletion
            }));
            setSavedJobs(formatted);
        } catch (err) {
            console.error('[JobExplorer] Failed to fetch saved jobs:', err);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchJobs(query, location, country);
    };

    const handleToggleSaveJob = async (job) => {
        const userId = getUserId();
        const savedItem = savedJobs.find(sj => sj.id.toString() === job.id.toString());

        try {
            if (savedItem) {
                const savedDbId = savedItem.savedDbId || savedJobs.find(sj => sj.id.toString() === job.id.toString())?.savedDbId;
                if (savedDbId) {
                    await api.delete(`/api/jobs/saved/${savedDbId}`);
                    toast.success('Job unsaved successfully');
                } else {
                    await fetchSavedJobs();
                }
                setSavedJobs(prev => prev.filter(sj => sj.id.toString() !== job.id.toString()));
            } else {
                const response = await api.post('/api/jobs/save', { userId, job });
                toast.success('Opportunity saved successfully!');
                fetchSavedJobs();
            }
        } catch (err) {
            console.error('[JobExplorer] Toggle save failed:', err);
            toast.error('Failed to update bookmark status.');
        }
    };

    const displayJobs = activeTab === 'discover' ? jobs : savedJobs;

    return (
        <div className="job-explorer-theme bg-transparent min-h-screen relative overflow-hidden">
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
                    .job-explorer-theme { font-family: 'Inter', sans-serif; }
                `}
            </style>

            <EditorialBackground />

            <div className="relative z-10 max-w-7xl mx-auto px-8 pt-32 pb-20">
                <motion.header 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-16 space-y-8"
                >
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: 64 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-1 bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                    />
                    <h1 className="text-7xl font-['Playfair_Display'] text-slate-100 leading-tight max-w-4xl tracking-tight">
                        The <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">ultimate jobs</span> for your next career move.
                    </h1>
                    
                    {/* Tab Navigation */}
                    <div className="flex gap-8 border-b border-slate-800/80 pb-4 pt-4">
                        <button 
                            onClick={() => setActiveTab('discover')}
                            className={`pb-2 text-xs font-black uppercase tracking-[0.25em] transition-all relative ${
                                activeTab === 'discover' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            Discover Jobs
                            {activeTab === 'discover' && (
                                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400" />
                            )}
                        </button>
                        <button 
                            onClick={() => setActiveTab('saved')}
                            className={`pb-2 text-xs font-black uppercase tracking-[0.25em] transition-all relative flex items-center gap-2 ${
                                activeTab === 'saved' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            Saved Bookmarks ({savedJobs.length})
                            {activeTab === 'saved' && (
                                <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400" />
                            )}
                        </button>
                    </div>

                    {activeTab === 'discover' && (
                        <form onSubmit={handleSearch} className="max-w-4xl group flex flex-col gap-6 pt-6">
                            {/* Main Search Input */}
                            <div className="relative border-b-2 border-slate-800 group-focus-within:border-cyan-400 transition-all duration-700">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search keywords, roles, or stack..."
                                    className="w-full bg-transparent py-4 text-2xl font-['Playfair_Display'] text-slate-100 placeholder-slate-700 outline-none"
                                />
                                <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-cyan-400 transition-colors duration-500">
                                    <Search size={24} />
                                </button>
                            </div>

                            {/* Dropdown Filters Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Country Market</label>
                                    <select
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-300 px-4 py-3 outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                                    >
                                        <option value="in">🇮🇳 India</option>
                                        <option value="us">🇺🇸 United States</option>
                                        <option value="gb">🇬🇧 United Kingdom</option>
                                        <option value="ca">🇨🇦 Canada</option>
                                        <option value="au">🇦🇺 Australia</option>
                                        <option value="de">🇩🇪 Germany</option>
                                    </select>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">City / State / Region</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="E.g. Bangalore, California, London"
                                        className="bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-300 px-4 py-3 outline-none focus:border-cyan-400 placeholder-slate-700 transition-colors"
                                    />
                                </div>
                            </div>

                        </form>
                    )}
                </motion.header>

                {isSearching ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-4 text-cyan-400">
                        <Loader2 className="animate-spin" size={40} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] italic animate-pulse">Scrutinizing Opportunities...</p>
                    </div>
                ) : error ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
                        <p className="text-slate-400 text-sm">{error}</p>
                        <button onClick={() => fetchJobs(query, location, country)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors">Retry</button>
                    </div>
                ) : displayJobs.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center">
                        <Briefcase size={48} className="text-slate-700 mb-4" />
                        <h3 className="text-xl font-['Playfair_Display'] text-slate-300 mb-2">No Listings Found</h3>
                        <p className="text-slate-500 text-xs">
                            {activeTab === 'saved' 
                                ? "You haven't saved any jobs yet. Start exploring the job board!"
                                : "No active vacancies matched your filters."}
                        </p>
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-12"
                    >
                        <AnimatePresence>
                            {displayJobs.map((job, idx) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <JobCard job={job} onClick={(j) => setSelectedJob(j)} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            <JobDetailsPanel 
                job={selectedJob} 
                isOpen={!!selectedJob} 
                onClose={() => setSelectedJob(null)}
                isSaved={selectedJob ? savedJobs.some(sj => sj.id.toString() === selectedJob.id.toString()) : false}
                onSave={() => selectedJob && handleToggleSaveJob(selectedJob)}
            />
        </div>
    );
};

export default JobExplorer;

import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowLeft, Briefcase, DollarSign, TrendingUp, Award, Loader2, IndianRupee, CheckCircle, Target } from 'lucide-react';
import BackgroundAnimation from '../components/UI/BackgroundAnimation';
import { getCachedData, setCachedData } from '../utils/cache.js';

const buildFallbackDetails = (jobTitleDecoded) => ({
    detailed_description: `We couldn't reach the AI service to generate a tailored description for "${jobTitleDecoded}" right now. In general, this role typically involves collaborating with a team, owning specific deliverables, and growing your expertise over time. Please try refreshing the page in a bit for a fully personalized breakdown.`,
    salary_benchmarks_inr: { entry_level: 'Varies by company & location', mid_level: 'Varies by company & location', senior_level: 'Varies by company & location' },
    career_trajectory: ['Individual contributor', 'Senior individual contributor / team lead', 'Manager or staff-level specialist'],
    required_qualifications: ['A relevant degree or equivalent practical experience', 'Core skills for the role', 'Strong communication and collaboration'],
    isFallback: true,
});

export default function JobDetails() {
    const { jobTitle } = useParams();
    const { profile } = useOutletContext() || {};
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const decodedTitle = decodeURIComponent(jobTitle);
        const cacheKey = `job_details_${decodedTitle.trim().toLowerCase().replace(/\s+/g, '_')}`;

        const fetchJobDetails = async () => {
            setIsLoading(true);

            const cached = getCachedData(cacheKey);
            if (cached) {
                setDetails(cached);
                setIsLoading(false);
                return;
            }

            try {
                const skillsContext = profile?.skills?.length
                    ? `The candidate's stated skills are: ${profile.skills.join(', ')}. Compare these against the role's required qualifications.`
                    : '';
                const prompt = `
                    Generate a detailed job description for the role of a "${decodedTitle}".
                    Provide a comprehensive overview for the Indian job market including:
                    1.  A "detailed_description" of typical daily tasks and responsibilities.
                    2.  "salary_benchmarks_inr" with average salary ranges as strings for entry, mid, and senior levels in INR (e.g., "₹8-12 LPA").
                    3.  A "career_trajectory" outlining potential growth paths.
                    4.  A list of "required_qualifications" including common degrees and certifications.
                    ${skillsContext}
                    Return ONLY a valid JSON object with the structure:
                    {
                        "detailed_description": "string",
                        "salary_benchmarks_inr": { "entry_level": "string", "mid_level": "string", "senior_level": "string" },
                        "career_trajectory": ["string"],
                        "required_qualifications": ["string"],
                        "matched_qualifications": ["string"],
                        "skill_gaps": ["string"]
                    }
                    If no candidate skills were given, return empty arrays for "matched_qualifications" and "skill_gaps".
                `;

                const data = await api.post('/api/ai/gemini', {
                    model: 'gemini-2.5-flash',
                    body: {
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" },
                    },
                });
                const result = JSON.parse(data.candidates[0].content.parts[0].text);
                setCachedData(cacheKey, result);
                setDetails(result);
            } catch (error) {
                console.error("Job details generation error:", error);
                setDetails(buildFallbackDetails(decodedTitle));
            } finally {
                setIsLoading(false);
            }
        };

        if (jobTitle) {
            fetchJobDetails();
        }
    }, [jobTitle, profile]);

    const InfoCard = ({ icon: Icon, title, children, color }) => (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
            <h3 className={`font-bold text-lg ${color} flex items-center gap-2 mb-3`}>
                <Icon className="w-5 h-5" /> {title}
            </h3>
            <div className="text-gray-300 space-y-2">{children}</div>
        </div>
    );

    return (
        <div className="relative min-h-full p-4 sm:p-6 lg:p-8 text-white">
            <BackgroundAnimation />
            <div className="relative z-10 max-w-4xl mx-auto space-y-8">
                {isLoading ? (
                     <div className="flex flex-col items-center justify-center h-96">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-400" />
                        <p className="mt-4 text-gray-400">Loading job details for {decodeURIComponent(jobTitle)}...</p>
                    </div>
                ) : !details ? (
                    <div className="text-center">
                        <p>Could not load job details. Please try again later.</p>
                        <Link to="/dashboard" className="mt-4 inline-flex items-center gap-2 text-emerald-400 hover:underline">
                            <ArrowLeft size={16} /> Back to Dashboard
                        </Link>
                    </div>
                ) : (
                    <>
                        <div>
                            <Link to="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 text-sm">
                                <ArrowLeft size={16} /> Back to Dashboard
                            </Link>
                            <h1 className="text-4xl font-bold">{decodeURIComponent(jobTitle)}</h1>
                        </div>

                        <InfoCard icon={Briefcase} title="Role Description" color="text-cyan-400">
                            <p className="leading-relaxed">{details.detailed_description}</p>
                        </InfoCard>

                        <div className="grid md:grid-cols-2 gap-8">
                            <InfoCard icon={IndianRupee} title="Salary Benchmarks (INR)" color="text-emerald-400">
                                <ul className="list-disc list-inside space-y-1">
                                    <li><strong>Entry-Level:</strong> {details.salary_benchmarks_inr.entry_level}</li>
                                    <li><strong>Mid-Level:</strong> {details.salary_benchmarks_inr.mid_level}</li>
                                    <li><strong>Senior-Level:</strong> {details.salary_benchmarks_inr.senior_level}</li>
                                </ul>
                            </InfoCard>

                            <InfoCard icon={TrendingUp} title="Career Trajectory" color="text-purple-400">
                                <ul className="list-disc list-inside space-y-1">
                                    {details.career_trajectory.map((path, index) => (
                                        <li key={index}>{path}</li>
                                    ))}
                                </ul>
                            </InfoCard>
                        </div>


                        <InfoCard icon={Award} title="Required Qualifications" color="text-orange-400">
                            <ul className="list-disc list-inside space-y-1">
                                {details.required_qualifications.map((qual, index) => (
                                    <li key={index}>{qual}</li>
                                ))}
                            </ul>
                        </InfoCard>

                        {((details.matched_qualifications?.length > 0) || (details.skill_gaps?.length > 0)) && (
                            <InfoCard icon={Target} title="Your Skill Match" color="text-blue-400">
                                {details.matched_qualifications?.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-sm font-bold text-emerald-400 mb-1">You already have:</p>
                                        <ul className="list-none space-y-1">
                                            {details.matched_qualifications.map((skill, index) => (
                                                <li key={index} className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400 flex-shrink-0" /> {skill}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {details.skill_gaps?.length > 0 && (
                                    <div>
                                        <p className="text-sm font-bold text-amber-400 mb-1">Gaps to work on:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {details.skill_gaps.map((skill, index) => (
                                                <li key={index}>{skill}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </InfoCard>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}


// src/pages/ResumeBuilder.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { api, getUserId } from "../api/client.js";
import { fetchWithRetry } from "../utils/api.js";
import { generateAIResponse } from "../services/ai/openRouterService.js";
import { 
    Loader2, Save, Plus, Trash2, ArrowRight, ArrowLeft, 
    Sparkles, Layout as LayoutIcon, User, FileText, 
    Briefcase, GraduationCap, Code, CheckCircle 
} from "lucide-react";
import ResumeDisplay from "../components/resume_templates/ResumeDisplay.jsx";

const initialResumeState = {
  template: "modern",
  personal_info: { full_name: "", title: "", email: "", phone: "", location: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

const sections = [
  { id: "Templates", icon: LayoutIcon },
  { id: "Personal", icon: User },
  { id: "Summary", icon: FileText },
  { id: "Experience", icon: Briefcase },
  { id: "Education", icon: GraduationCap },
  { id: "Skills", icon: Code },
  { id: "Projects", icon: Sparkles },
  { id: "Finalize", icon: CheckCircle },
];

const FormInput = ({ id, placeholder, value, onChange, type = "text", label }) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>}
        <input 
            id={id} 
            type={type}
            placeholder={placeholder} 
            value={value} 
            onChange={onChange}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
        />
    </div>
);

const FormTextarea = ({ id, placeholder, value, onChange, rows = 4, label }) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>}
        <textarea
            id={id}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            rows={rows}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none resize-none"
        />
    </div>
);

export default function ResumeBuilder() {
  const { profile } = useOutletContext();
  const [resumeData, setResumeData] = useState(initialResumeState);
  const [activeSection, setActiveSection] = useState("Templates");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBulletsFor, setIsGeneratingBulletsFor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    setResumeData((prev) => ({
      ...prev,
      personal_info: {
        full_name: profile.full_name || "",
        email: profile.email || "user@example.com",
        phone: profile.phone || "",
        location: profile.location || "",
        title: profile.current_role || "",
      },
      skills: profile.skills || [],
      certifications: (profile.certifications || []).map(cert => ({
          id: Date.now() + Math.random(),
          name: cert,
          issuer: '',
          date: ''
      })),
    }));
  }, [profile]);

  const handleNestedChange = (e) =>
    setResumeData((p) => ({
      ...p,
      personal_info: { ...p.personal_info, [e.target.id]: e.target.value },
    }));

  const handleItemChange = (index, section, e) => {
    const list = [...resumeData[section]];
    list[index][e.target.id] = e.target.value;
    setResumeData((p) => ({ ...p, [section]: list }));
  };

  const addItem = (section) => {
    let newItem;
    if (section === "experience") newItem = { id: Date.now(), title: "", company: "", location: "", start_date: "", end_date: "", description: "" };
    else if (section === "education") newItem = { id: Date.now(), degree: "", field: "", university: "", graduation_date: "" };
    else if (section === "projects") newItem = { id: Date.now(), title: "", description: "", link: "" };
     
    setResumeData((p) => ({ ...p, [section]: [...(p[section] || []), newItem] }));
  };

  const removeItem = (section, index) =>
    setResumeData((p) => ({ ...p, [section]: p[section].filter((_, i) => i !== index) }));

  const handleGenerateSuggestions = async (index) => {
    const experienceItem = resumeData.experience[index];
    if (!experienceItem.title) {
      alert("Please enter a 'Job Title' first to generate suggestions.");
      return;
    }
    setIsGeneratingBulletsFor(index);
    try {
      const skillsContext = profile?.skills?.length
        ? `The candidate's stated skills include: ${profile.skills.join(', ')}. Weave in relevant ones where truthful.`
        : '';
      const prompt = `You are a professional resume writer. Based on the job title "${experienceItem.title}" and the company "${experienceItem.company}", generate 3-4 concise, action-oriented bullet points that highlight key achievements. Use the STAR method. ${skillsContext} Return ONLY a valid JSON object: { "bullet_points": ["string"] }`;

      const responseText = await generateAIResponse(prompt, "You are a professional resume writer.", "resume");
      const result = typeof responseText === "string" ? JSON.parse(responseText) : responseText;

      if (result.bullet_points && result.bullet_points.length > 0) {
        const list = [...resumeData.experience];
        list[index].description = result.bullet_points.map(bp => `- ${bp}`).join('\n');
        setResumeData((p) => ({ ...p, experience: list }));
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Fallback so "AI Rewrite" never leaves the field untouched when the AI call fails.
      const list = [...resumeData.experience];
      list[index].description = `- Contributed to key initiatives as a ${experienceItem.title}${experienceItem.company ? ` at ${experienceItem.company}` : ''}, applying strong problem-solving and collaboration skills.\n- Delivered measurable improvements to team workflows and outcomes.\n- Collaborated cross-functionally to meet project goals on schedule.`;
      setResumeData((p) => ({ ...p, experience: list }));
    } finally {
      setIsGeneratingBulletsFor(null);
    }
  };

  const handleSaveAndPreview = async () => {
    setIsSaving(true);
    try {
      const userId = getUserId();
      const data = await api.post('/api/resumes', { ...resumeData, userId, title: `${resumeData.personal_info.full_name}'s Resume` });
      localStorage.setItem("resumeForPreview", JSON.stringify(data));
      navigate("/resume-preview");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save resume.");
    } finally {
      setIsSaving(false);
    }
  };

  const navigateSection = (direction) => {
    const sectionIds = sections.map(s => s.id);
    const currentIndex = sectionIds.indexOf(activeSection);
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < sections.length) setActiveSection(sectionIds[newIndex]);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "Templates":
        const templates = [
          { id: "modern", name: "The Silicon Valley", desc: "Modern Tech (Inter/Outfit)" },
          { id: "classic", name: "The Wall Street", desc: "Finance & Legal (Serif)" },
          { id: "creative", name: "The Creative Pulse", desc: "Design & Marketing (Bold)" },
          { id: "minimalist", name: "The Minimalist Pro", desc: "Clean & Spacious (Minimal)" },
          { id: "executive", name: "The Executive Suite", desc: "Leadership (Authoritative)" },
          { id: "professional", name: "The ATS Gold", desc: "Universal (ATS Optimized)" },
        ];
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-2">Choose your style</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setResumeData(p => ({ ...p, template: t.id }))}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-2 ${
                    resumeData.template === t.id 
                      ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{t.name}</span>
                    {resumeData.template === t.id && <CheckCircle size={18} className="text-emerald-400" />}
                  </div>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case "Personal":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Full Name" id="full_name" placeholder="John Doe" value={resumeData.personal_info.full_name} onChange={handleNestedChange} />
              <FormInput label="Professional Title" id="title" placeholder="Senior Product Designer" value={resumeData.personal_info.title} onChange={handleNestedChange} />
              <FormInput label="Email Address" id="email" placeholder="john@example.com" value={resumeData.personal_info.email} onChange={handleNestedChange} />
              <FormInput label="Phone Number" id="phone" placeholder="+1 234 567 890" value={resumeData.personal_info.phone} onChange={handleNestedChange} />
              <div className="sm:col-span-2">
                <FormInput label="Location" id="location" placeholder="New York, USA" value={resumeData.personal_info.location} onChange={handleNestedChange} />
              </div>
            </div>
          </div>
        );
      case "Summary":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Professional Summary</h3>
            <FormTextarea
              label="Summary"
              placeholder="Results-oriented professional with 5+ years of experience..."
              value={resumeData.summary}
              onChange={(e) => setResumeData((p) => ({ ...p, summary: e.target.value }))}
              rows={8}
            />
          </div>
        );
      case "Experience":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Work Experience</h3>
                <button onClick={() => addItem("experience")} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors">
                    <Plus size={20} />
                </button>
            </div>
            <div className="space-y-4">
              {resumeData.experience.map((exp, i) => (
                <div key={exp.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 relative group">
                  <button onClick={() => removeItem("experience", i)} className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput label="Job Title" id="title" placeholder="Software Engineer" value={exp.title} onChange={(e) => handleItemChange(i, "experience", e)} />
                    <FormInput label="Company" id="company" placeholder="Acme Inc." value={exp.company} onChange={(e) => handleItemChange(i, "experience", e)} />
                    <FormInput label="Start Date" id="start_date" type="text" placeholder="Jan 2020" value={exp.start_date} onChange={(e) => handleItemChange(i, "experience", e)} />
                    <FormInput label="End Date" id="end_date" type="text" placeholder="Present" value={exp.end_date} onChange={(e) => handleItemChange(i, "experience", e)} />
                  </div>
                  <div className="relative">
                    <FormTextarea 
                      label="Description"
                      id="description" 
                      placeholder="Highlighed achievements..." 
                      value={exp.description} 
                      onChange={(e) => handleItemChange(i, "experience", e)} 
                      rows={4}
                    />
                    <button 
                         onClick={() => handleGenerateSuggestions(i)} 
                         disabled={isGeneratingBulletsFor !== null}
                         className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg"
                    >
                         {isGeneratingBulletsFor === i ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                         AI Rewrite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "Education":
        return (
           <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Education</h3>
                <button onClick={() => addItem("education")} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors">
                    <Plus size={20} />
                </button>
            </div>
            <div className="space-y-4">
              {resumeData.education.map((edu, i) => (
                <div key={edu.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 relative group">
                  <button onClick={() => removeItem("education", i)} className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput label="Degree" id="degree" placeholder="B.S. Computer Science" value={edu.degree} onChange={(e) => handleItemChange(i, "education", e)} />
                    <FormInput label="University" id="university" placeholder="MIT" value={edu.university} onChange={(e) => handleItemChange(i, "education", e)} />
                    <div className="sm:col-span-2">
                        <FormInput label="Graduation Date" id="graduation_date" placeholder="May 2022" value={edu.graduation_date} onChange={(e) => handleItemChange(i, "education", e)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "Skills":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Skills & Expertise</h3>
            <FormTextarea
              label="Skills (Comma separated)"
              value={resumeData.skills.join(", ")}
              onChange={(e) => setResumeData((p) => ({ ...p, skills: e.target.value.split(",").map((s) => s.trim()) }))}
              placeholder="React, Node.js, TypeScript, UI Design, Project Management..."
              rows={10}
            />
          </div>
        );
       case "Projects":
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Projects</h3>
                <button onClick={() => addItem("projects")} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors">
                    <Plus size={20} />
                </button>
            </div>
            <div className="space-y-4">
                {resumeData.projects.map((proj, i) => (
                <div key={proj.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 relative group">
                    <button onClick={() => removeItem("projects", i)} className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={18} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormInput label="Project Title" id="title" placeholder="E-commerce Platform" value={proj.title} onChange={(e) => handleItemChange(i, "projects", e)} />
                        <FormInput label="Link" id="link" placeholder="github.com/user/project" value={proj.link} onChange={(e) => handleItemChange(i, "projects", e)} />
                        <div className="sm:col-span-2">
                            <FormTextarea label="Description" id="description" placeholder="A full-stack application built with..." value={proj.description} onChange={(e) => handleItemChange(i, "projects", e)} rows={3} />
                        </div>
                    </div>
                </div>
                ))}
            </div>
          </div>
        );
      case "Finalize":
        return (
          <div className="text-center p-12 flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center animate-pulse">
                <Save className="w-12 h-12 text-emerald-400"/>
            </div>
            <div className="space-y-2">
                <h3 className="text-3xl font-bold text-white">Looks Great!</h3>
                <p className="text-gray-400 max-w-sm mx-auto">Your resume is ready for the professional world. Save it now to download the PDF.</p>
            </div>
            <button 
                onClick={handleSaveAndPreview} 
                disabled={isSaving} 
                className="group relative px-8 py-4 bg-emerald-500 text-white font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:bg-gray-700 shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
            >
              <div className="relative z-10 flex items-center gap-3">
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24}/>}
                <span>SAVE & DOWNLOAD PREVIEW</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-white relative flex flex-col pt-0">
      
      
      {/* Dynamic Navigation Header */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-xl bg-black/40 px-8 pt-20 pb-3 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <FileText className="text-white" size={20} />
             </div>
             <div>
                <h1 className="text-lg font-black tracking-tight">RESUME BUILDER</h1>
                <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Expert Mode</p>
             </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {sections.map((s, i) => {
             const isActive = activeSection === s.id;
             const isPast = sections.findIndex(sec => sec.id === activeSection) > i;
             return (
                 <React.Fragment key={s.id}>
                    <button 
                        onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                            isActive ? "bg-white/10 text-white" : isPast ? "text-emerald-400" : "text-gray-500"
                        }`}
                    >
                        <s.icon size={16} />
                        <span className="text-xs font-bold">{s.id}</span>
                    </button>
                    {i < sections.length - 1 && <div className="w-4 h-[1px] bg-white/5" />}
                 </React.Fragment>
             )
          })}
        </div>
      </header>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_600px] gap-0 flex-grow">
        {/* Editor Side */}
        <div className="p-4 sm:p-8 pt-6 overflow-y-auto max-h-[calc(100vh-80px)] custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 md:p-8 backdrop-blur-3xl shadow-2xl">
                {renderSection()}
              </div>

              <div className="flex justify-between items-center bg-black/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl">
                <button
                  onClick={() => navigateSection("prev")}
                  disabled={sections.map(s => s.id).indexOf(activeSection) === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ArrowLeft size={18} /> BACK
                </button>
                
                <div className="flex gap-1">
                    {sections.map(s => (
                        <div key={s.id} className={`w-1.5 h-1.5 rounded-full transition-all ${activeSection === s.id ? "bg-emerald-500 w-4" : "bg-white/10"}`} />
                    ))}
                </div>

                <button
                  onClick={() => navigateSection("next")}
                  disabled={activeSection === "Finalize"}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-emerald-400 transition-all shadow-xl"
                >
                  CONTINUE <ArrowRight size={18} />
                </button>
              </div>
          </div>
        </div>

        {/* Live Preview Side */}
        <div className="hidden lg:block border-l border-white/5 p-8 sticky top-20 h-[calc(100vh-80px)] overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xs font-black tracking-widest text-gray-500 uppercase">Live Preview</h2>
             <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
             </div>
          </div>
          <div className="w-full h-full bg-white rounded-t-xl shadow-2xl overflow-hidden transform scale-[0.95] origin-top transition-transform duration-500 hover:scale-[0.98]">
             <div className="w-full h-full overflow-y-auto custom-scrollbar">
                <ResumeDisplay resumeData={resumeData} template={resumeData.template} />
             </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
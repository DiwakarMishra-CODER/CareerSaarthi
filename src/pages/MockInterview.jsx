import { useState } from 'react';
import { History } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import InterviewSetup from '../components/Interview/InterviewSetup';
import InterviewSession from '../components/Interview/InterviewSession';
// Removed InterviewBackground to inherit global background

/**
 * MockInterview
 * Two-stage flow: setup form → voice-first session.
 * The intermediate selection/category screen has been removed.
 */
export default function MockInterview() {
    const navigate = useNavigate();
    const { profile } = useOutletContext();
    const [interviewConfig, setInterviewConfig] = useState(null);

    // Called by InterviewSetup when the form is submitted
    const handleSetupComplete = (config) => {
        setInterviewConfig(config);
    };

    // Called by InterviewSession when the user clicks "Exit"
    const handleSessionEnd = () => {
        setInterviewConfig(null);
    };

    // ── Session fills the full viewport – render without the shared layout ──
    if (interviewConfig) {
        return (
            <InterviewSession
                config={interviewConfig}
                profile={profile}
                onEnd={handleSessionEnd}
            />
        );
    }

    return (
        <div className="relative flex-1 text-white flex flex-col pt-24 pb-12">

            {/* InterviewSetup is shown directly – no intermediate selection screen */}
            <InterviewSetup onStart={handleSetupComplete} />

            {/* History link sits below the form */}
            <div className="relative z-10 flex justify-center pb-10 -mt-4">
                <button
                    id="mock-interview-history-btn"
                    onClick={() => navigate('/interview-history')}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors font-semibold"
                >
                    <History className="w-4 h-4" />
                    View Interview History
                </button>
            </div>
        </div>
    );
}

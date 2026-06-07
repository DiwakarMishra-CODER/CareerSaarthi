<div align="center">

<br />

# 🚀 CareerSaarthi — *Decode Your Future.*

### An AI-powered career acceleration platform for high-ambition students

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-careersaarthi.vercel.app-4F46E5?style=for-the-badge)](https://careersaarthi.vercel.app)

<br />

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Three.js](https://img.shields.io/badge/Three.js-3D-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-Animations-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion)

<br />

> *"The gap between who you are and who you want to be is called **Saarthi**."*

</div>

---

## 📖 What is CareerSaarthi?

**CareerSaarthi** (formerly CareerForge) is a full-stack, AI-powered career mentorship ecosystem built for students navigating the competitive tech industry. It consolidates every tool a job-seeker needs — resume building, AI analysis, mock interviews, LinkedIn optimization, and job discovery — into one beautifully crafted platform.

The platform features a **cinematic 3D landing experience** built with Three.js and React Three Fiber, smooth GPU-accelerated animations via GSAP + Framer Motion, and a robust Node.js/Supabase backend powering real AI integrations through OpenRouter LLMs.

---

## ✨ Core Features

### 📄 ATS Resume Builder
Build job-winning resumes with precision-crafted templates. The editor supports live preview, multiple professionally designed layouts, and exports to PDF — all ATS-optimized out of the box.

### 🔍 AI Resume Analyzer
Upload any resume PDF and receive instant, structured AI feedback: ATS compatibility scores, keyword gap analysis, impact rating, and actionable improvement suggestions powered by large language models.

### 🎤 AI Mock Interview Simulator
Realistic, role-specific interview sessions driven by advanced LLMs. The system generates contextual questions, evaluates responses in real-time, and stores a full session history with performance analytics.

### 💼 LinkedIn Optimizer
AI-driven analysis of your LinkedIn profile to identify gaps, suggest headline improvements, and provide data-driven strategies to attract recruiters — directly from a PDF export of your profile.

### 🗺️ Career Explorer & Job Finder
Discover curated career roadmaps with skill trees, learning paths, and salary benchmarks for roles across the industry. The integrated Job Explorer surfaces real job listings with detailed descriptions and match scores.

### 📊 Personal Dashboard
A unified command center showing activity history, interview performance trends, resume versions, and a personalized AI assistant for quick queries.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** + **Vite 7** | Core UI framework with fast HMR |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Page transitions & micro-animations |
| **GSAP + Lenis** | Smooth scroll & GPU-accelerated effects |
| **Three.js + React Three Fiber** | Cinematic 3D hero background |
| **Recharts** | Analytics & performance charts |
| **React Router v6** | Client-side routing |
| **Lucide React** | Consistent icon system |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **Supabase (PostgreSQL)** | Database, Auth & storage |
| **JWT + Google OAuth** | Secure authentication |
| **Cloudinary** | Image & asset hosting |
| **Multer + pdf-parse** | Resume PDF upload & text extraction |
| **OpenRouter API** | LLM integration for AI features |
| **bcryptjs** | Password hashing |

---

## 🏗️ Project Architecture

```
CareerForge/
├── src/
│   ├── components/
│   │   ├── 3d/              # Three.js scene & WebGL components
│   │   ├── Interview/       # Interview UI components
│   │   ├── JobFinder/       # Job search components
│   │   ├── LinkedIn/        # LinkedIn optimizer components
│   │   ├── Resume/          # Resume builder & templates
│   │   ├── UI/              # Shared UI primitives
│   │   └── layout/          # Navbar, SmoothScroll, wrappers
│   ├── pages/               # Route-level page components
│   │   ├── LandingPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ResumeBuilder.jsx
│   │   ├── ResumeAnalyzer.jsx
│   │   ├── InterviewPrep.jsx
│   │   ├── InterviewHistory.jsx
│   │   ├── LinkedInOptimizer.jsx
│   │   ├── JobExplorer.jsx
│   │   ├── CareerExplorer.jsx
│   │   └── Profile.jsx
│   ├── api/                 # Axios API layer
│   ├── services/            # Business logic services
│   └── utils/               # Helpers & shared utilities
│
└── server/
    ├── routes/
    │   ├── auth.js          # JWT + Google OAuth
    │   ├── resumes.js       # Resume CRUD + AI analysis
    │   ├── interviews.js    # Interview sessions & history
    │   ├── jobs.js          # Job discovery
    │   ├── profiles.js      # User profiles
    │   ├── roadmaps.js      # Career roadmaps
    │   └── upload.js        # File upload (Cloudinary)
    ├── models/              # Data models
    ├── lib/                 # Supabase client & helpers
    └── index.js             # Express server entry point
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key
- A [Cloudinary](https://cloudinary.com) account

### 1. Clone the Repository

```bash
git clone https://github.com/DiwakarMishra-CODER/CareerSaarthi.git
cd CareerForge
```

### 2. Configure Environment Variables

**Frontend** — create `.env` in the root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:4000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

**Backend** — create `server/.env` (see `server/.env.example`):
```env
PORT=4000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
OPENROUTER_API_KEY=your_openrouter_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Install & Run

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Start the backend (port 4000)
cd server && npm run dev

# In a new terminal — start the frontend (port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and you're live. 🎉

---

## 🌐 Deployment

The frontend is deployed on **Netlify** via `netlify.toml` with SPA redirect rules. The backend can be deployed to any Node.js-compatible host (Railway, Render, etc.).

```toml
# netlify.toml (already configured)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🎨 Design Philosophy

CareerSaarthi is built with a **premium-first** design ethos:

- **Dark, cinematic aesthetic** — deep navy/slate backgrounds with emerald accent gradients
- **3D WebGL hero** — a live Three.js particle field creating depth and motion on landing
- **Glassmorphism UI** — frosted glass cards with `backdrop-blur` and translucent borders
- **Physics-based animations** — spring-driven Framer Motion transitions and magnetic buttons
- **Smooth scrolling** — Lenis inertia scroll for a native app-like feel

---

## 📬 Contact

Built by **Diwakar Mishra** — Full Stack Developer & UI/UX Enthusiast, MAIT Delhi.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Diwakar_Mishra-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/diwakar-mishra-dev/)
[![GitHub](https://img.shields.io/badge/GitHub-DiwakarMishra--CODER-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/DiwakarMishra-CODER)

For queries, collaborations, or feedback — open a GitHub Issue or connect on LinkedIn.

---

<div align="center">

**© 2026 CareerSaarthi. All rights reserved.**

*Built for ambitious students. Powered by AI.*

</div>

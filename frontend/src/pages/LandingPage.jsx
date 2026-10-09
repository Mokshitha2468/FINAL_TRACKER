import React from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  PenTool,
  BookOpen,
  Trophy,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f1f5f9',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ---------------- NAVIGATION ---------------- */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Code2 size={22} />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                FinalTracker
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  marginLeft: '0.4rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                DSA &bull; AI
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link
              to="/login"
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#cbd5e1',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </Link>
            <Link
              to="/register"
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- HERO SECTION ---------------- */}
      <section
        style={{
          position: 'relative',
          padding: '5rem 1.5rem 4rem',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Glow backdrop */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(168, 85, 247, 0.08) 50%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '850px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.9rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#a5b4fc',
              marginBottom: '1.75rem',
            }}
          >
            <Sparkles size={14} style={{ color: '#818cf8' }} />
            <span>All-in-One Learning Operating System for DSA & AI</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
              color: '#ffffff',
            }}
          >
            Master DSA & AI Trackers with{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Excalidraw & Permanent Notes
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              maxWidth: '720px',
              margin: '0 auto 2.5rem',
            }}
          >
            Complete Striver A2Z curriculum tracking, visual system architecture sketching on authentic Excalidraw,
            permanent dual AI/DSA study notes with clipboard screenshot pasting, and live contest alerts.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.85rem',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                textDecoration: 'none',
                boxShadow: '0 6px 24px rgba(99, 102, 241, 0.45)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.85rem',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#e2e8f0',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In to Your Workspace
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              marginTop: '2.5rem',
              fontSize: '0.8rem',
              color: '#64748b',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} style={{ color: '#22c55e' }} />
              <span>455+ Sequential Problems</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} style={{ color: '#22c55e' }} />
              <span>Authentic Excalidraw Engine</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} style={{ color: '#22c55e' }} />
              <span>Permanent Cloud Persistence</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES GRID ---------------- */}
      <section
        style={{
          padding: '4rem 1.5rem 6rem',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.6rem' }}>
            Everything You Need to Ace Technical Interviews
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
            A unified suite designed for deep problem-solving, intuitive visual recall, and daily consistency.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Card 1: Curriculum */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <Layers size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                Striver A2Z DSA Tracker
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.55 }}>
                Structured hierarchy from Arrays & LinkedLists to Dynamic Programming & Graphs. Track solved status,
                difficulty filters, and spaced-repetition schedules.
              </p>
            </div>
          </div>

          {/* Card 2: Excalidraw */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f472b6',
              }}
            >
              <PenTool size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                Excalidraw Whiteboard
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.55 }}>
                Authentic Excalidraw virtual whiteboard. Sketch tree traversals, graph algorithms, and system
                architectures with handwritten typography and infinite panning.
              </p>
            </div>
          </div>

          {/* Card 3: Notepad */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80',
              }}
            >
              <BookOpen size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                AI & DSA Permanent Notepad
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.55 }}>
                Dedicated study workspaces for 🧠 AI & 💻 DSA. Paste screenshots straight from clipboard via{' '}
                <kbd style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px' }}>Ctrl+V</kbd>,
                save clickable URLs, and keep notes forever.
              </p>
            </div>
          </div>

          {/* Card 4: Contests & POTD */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <Trophy size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                Contests, Exams & Daily POTD
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.55 }}>
                Sync with upcoming LeetCode, CodeChef, and Codeforces rounds. Solve the daily problem of the day with
                streak tracking.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- CTA BANNER ---------------- */}
        <div
          style={{
            marginTop: '5rem',
            padding: '3rem 2rem',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: '#fff' }}>
            Ready to Accelerate Your Prep?
          </h3>
          <p style={{ color: '#cbd5e1', maxWidth: '600px', fontSize: '1rem', lineHeight: 1.6 }}>
            Sign in to unlock your persistent workspace, resume where you left off, and sync your study notes across devices.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              style={{
                padding: '0.8rem 1.8rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#fff',
                backgroundColor: '#6366f1',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
              }}
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              style={{
                padding: '0.8rem 1.8rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#e2e8f0',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textDecoration: 'none',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#64748b',
        }}
      >
        <p>© {new Date().getFullYear()} FinalTracker &bull; Built for ambitious engineers & competitive programmers.</p>
      </footer>
    </div>
  );
}

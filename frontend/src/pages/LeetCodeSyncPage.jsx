import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Save,
  Search,
  Sparkles,
  UserCheck,
  Code2,
  ShieldAlert,
  Lock,
  Key,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LeetCodeSyncPage() {
  const { isAuthenticated } = useAuth();

  // Profile & Sync state
  const [profile, setProfile] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [sessionCookie, setSessionCookie] = useState('');
  const [showCookieInput, setShowCookieInput] = useState(false);

  // Problems List state
  const [problems, setProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(true);

  // Filters
  const [revisionFilter, setRevisionFilter] = useState('today'); // 'today' | 'all' | 'needs_revision'
  const [difficultyFilter, setDifficultyFilter] = useState('All'); // 'All' | 'Easy' | 'Medium' | 'Hard'
  const [searchQuery, setSearchQuery] = useState('');

  // Problem Notes local edit state: slug -> string
  const [activeNotes, setActiveNotes] = useState({});
  const [savingNoteSlug, setSavingNoteSlug] = useState(null);

  // 1. Fetch Profile & Synced Problems
  const loadData = async () => {
    if (!isAuthenticated) {
      setLoadingProblems(false);
      return;
    }
    setLoadingProblems(true);
    try {
      const prof = await api.getLeetCodeProfile();
      setProfile(prof);
      if (prof?.username) {
        setUsernameInput(prof.username);
      } else {
        setIsEditingUsername(true);
      }

      const params = {};
      if (revisionFilter === 'today') params.today_only = 'true';
      if (revisionFilter === 'needs_revision') params.needs_revision = 'true';
      if (difficultyFilter !== 'All') params.difficulty = difficultyFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getLeetCodeProblems(params);
      setProblems(res.problems || []);

      // initialize notes map
      const noteMap = {};
      (res.problems || []).forEach((p) => {
        noteMap[p.title_slug] = p.notes || '';
      });
      setActiveNotes(noteMap);
    } catch (err) {
      console.error('Failed to load LeetCode data:', err);
    } finally {
      setLoadingProblems(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [revisionFilter, difficultyFilter, searchQuery, isAuthenticated]);

  // 2. Save Username
  const handleSaveUsername = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    try {
      await api.saveLeetCodeUsername(usernameInput.trim());
      setIsEditingUsername(false);
      // Automatically trigger sync
      handleSync();
    } catch (err) {
      alert(`Error saving username: ${err.message}`);
    }
  };

  // 3. Trigger Full Sync
  const handleSync = async (cookieOverride) => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const activeCookie = typeof cookieOverride === 'string' ? cookieOverride : (sessionCookie || '');
      const trimmedCookie = typeof activeCookie === 'string' ? activeCookie.trim() : '';
      const trimmedUsername = typeof usernameInput === 'string' ? usernameInput.trim() : '';

      const res = await api.syncLeetCodeFull(
        trimmedUsername || undefined,
        trimmedCookie || undefined
      );
      setSyncFeedback({
        type: 'success',
        text: res.message,
      });
      await loadData();
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        text: `Sync failed: ${err.message}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  // 4. Save Problem Note & Revision Flag
  const handleSaveNote = async (slug, currentNeedsRevision) => {
    setSavingNoteSlug(slug);
    try {
      await api.updateLeetCodeProblem(slug, {
        notes: activeNotes[slug],
        needs_revision: currentNeedsRevision,
      });
      // reload profile counts
      const prof = await api.getLeetCodeProfile();
      setProfile(prof);
    } catch (err) {
      alert(`Error saving note: ${err.message}`);
    } finally {
      setSavingNoteSlug(null);
    }
  };

  // 5. Toggle Needs Revision
  const handleToggleRevision = async (slug, currentVal) => {
    const nextVal = !currentVal;
    try {
      await api.updateLeetCodeProblem(slug, {
        needs_revision: nextVal,
        notes: activeNotes[slug],
      });
      setProblems((prev) =>
        prev.map((p) => (p.title_slug === slug ? { ...p, needs_revision: nextVal } : p))
      );
      const prof = await api.getLeetCodeProfile();
      setProfile(prof);
    } catch (err) {
      alert(`Error toggling revision: ${err.message}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar Header */}
      <header className="navbar">
        <div className="container navbar-inner">
          <div className="navbar-brand">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ArrowLeft size={16} />
              <span>Back to Curriculum</span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Code2 size={18} style={{ color: 'var(--accent-color)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>LeetCode Vault & Auto-Sync</span>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, padding: '2rem 1.5rem 4rem' }}>
        {/* Profile Connection & Sync Hero Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-color)' }} />
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700' }}>LeetCode Auto-Sync Vault</h1>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Connect your username once. Automatically sync your solved problems, track attempt counts, and auto-flag high-error questions into your Spaced Repetition queue.
              </p>
            </div>

            {/* Profile Status & Action */}
            {profile?.username && !isEditingUsername ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                  }}
                >
                  <UserCheck size={16} style={{ color: 'var(--easy-color)' }} />
                  <span style={{ fontWeight: '600' }}>{profile.username}</span>
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      marginLeft: '0.4rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Change
                  </button>
                </div>

                <button
                  onClick={() => handleSync()}
                  disabled={syncing}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Syncing...' : 'Sync LeetCode'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveUsername} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Enter LeetCode username..."
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    minWidth: '220px',
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={syncing || !usernameInput.trim()}
                  className="btn btn-primary"
                  style={{ fontWeight: '600' }}
                >
                  Save & Connect
                </button>
              </form>
            )}
          </div>

          {/* Sync Feedback Message */}
          {syncFeedback && (
            <div
              style={{
                fontSize: '0.8rem',
                color: syncFeedback.type === 'success' ? 'var(--easy-color)' : 'var(--hard-color)',
                backgroundColor: 'var(--bg-primary)',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {syncFeedback.text}
            </div>
          )}

          {/* Live LeetCode Profile Badge */}
          {profile?.leetcode_total_solved !== undefined && profile?.leetcode_total_solved !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {profile.leetcode_avatar ? (
                  <img
                    src={profile.leetcode_avatar}
                    alt="avatar"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Code2 size={18} style={{ color: 'var(--accent-color)' }} />
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    @{profile.username}
                    {profile.leetcode_ranking && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        Rank #{profile.leetcode_ranking.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{profile.leetcode_total_solved}</span> Total Solved &bull;{' '}
                    <span style={{ color: 'var(--easy-color)' }}>{profile.leetcode_easy_solved || 0} Easy</span> &bull;{' '}
                    <span style={{ color: 'var(--medium-color)' }}>{profile.leetcode_medium_solved || 0} Med</span> &bull;{' '}
                    <span style={{ color: 'var(--hard-color)' }}>{profile.leetcode_hard_solved || 0} Hard</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {profile.is_submissions_private && (
                  <span
                    style={{
                      fontSize: '0.725rem',
                      padding: '0.2rem 0.5rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      borderRadius: '4px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Lock size={12} />
                    Recent Submissions Private
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowCookieInput(!showCookieInput)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60a5fa',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    textDecoration: 'underline',
                  }}
                >
                  <Key size={12} />
                  {showCookieInput ? 'Hide Cookie Option' : 'Use Session Cookie'}
                </button>
              </div>
            </div>
          )}

          {/* Session Cookie Input Toggle */}
          {showCookieInput && (
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                <strong>Sync with LEETCODE_SESSION cookie:</strong> If your profile's recent submissions are private, paste your session cookie from browser DevTools (Application &gt; Cookies &gt; leetcode.com &gt; LEETCODE_SESSION) to fetch your full submission history.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="password"
                  placeholder="Paste LEETCODE_SESSION cookie value..."
                  value={sessionCookie}
                  onChange={(e) => setSessionCookie(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                  }}
                />
                <button
                  onClick={() => handleSync(sessionCookie)}
                  disabled={syncing || !sessionCookie.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  Sync with Cookie
                </button>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
              <div style={{ fontSize: '0.75rem', color: '#22c55e', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Today's Solved</span>
                <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Daily</span>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#22c55e', marginTop: '0.2rem' }}>
                {profile?.today_synced ?? 0}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Synced (Vault)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {profile?.total_synced || 0}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Needs Revision (&gt;4 attempts)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#ef4444', marginTop: '0.2rem' }}>
                {profile?.needs_revision_count || 0}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Last Synced
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                {profile?.last_synced_at ? new Date(profile.last_synced_at).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          {/* Tab Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setRevisionFilter('today')}
              className={`takeu-pill ${revisionFilter === 'today' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Sparkles size={12} style={{ color: '#22c55e' }} />
              <span>Today's Solved ({profile?.today_synced ?? 0})</span>
            </button>
            <button
              onClick={() => setRevisionFilter('all')}
              className={`takeu-pill ${revisionFilter === 'all' ? 'active' : ''}`}
            >
              All Synced ({profile?.total_synced || 0})
            </button>
            <button
              onClick={() => setRevisionFilter('needs_revision')}
              className={`takeu-pill ${revisionFilter === 'needs_revision' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <AlertTriangle size={12} />
              <span>Needs Revision ({profile?.needs_revision_count || 0})</span>
            </button>

            <span style={{ color: 'var(--border-color)', margin: '0 0.25rem' }}>|</span>

            {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`takeu-pill ${difficultyFilter === diff ? 'active' : ''}`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '0.6rem', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search synced problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* Problems List */}
        {loadingProblems ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Loading your LeetCode vault...
          </div>
        ) : problems.length === 0 ? (
          <div
            style={{
              padding: '4rem 1rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
            }}
          >
            {profile?.leetcode_total_solved > 0 ? (
              <div
                style={{
                  maxWidth: '620px',
                  margin: '0 auto',
                  textAlign: 'left',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#60a5fa', marginBottom: '0.75rem' }}>
                  <ShieldAlert size={20} />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                    LeetCode Profile Found ({profile.leetcode_total_solved} Solved)
                  </h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  We successfully connected to your LeetCode account <strong>@{profile.username}</strong> ({profile.leetcode_total_solved} problems solved, Global Rank #{profile.leetcode_ranking?.toLocaleString() || 'N/A'}).
                  However, LeetCode is hiding your submissions list because <strong>"Recent Submissions"</strong> is set to <strong>Private</strong> in your LeetCode settings.
                </p>

                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    👉 Quick Fix to Sync Solved Problems (Takes 10 seconds):
                  </div>
                  <ol style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                    <li>
                      Open{' '}
                      <a
                        href="https://leetcode.com/profile/account/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        LeetCode Account Settings ↗
                      </a>
                    </li>
                    <li>Scroll down to the <strong>Privacy Settings</strong> section.</li>
                    <li>
                      Toggle <strong>"Make recent submissions public"</strong> or <strong>"Show recent submissions"</strong> to <strong>ON / Public</strong> (or uncheck "Make profile private").
                    </li>
                    <li>Return here and click <strong>⚡ Sync Now</strong> below!</li>
                  </ol>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={() => handleSync()} disabled={syncing} className="btn btn-primary btn-sm">
                    {syncing ? 'Syncing...' : '⚡ Re-Sync Now'}
                  </button>
                  <button
                    onClick={() => setShowCookieInput(!showCookieInput)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Key size={12} style={{ marginRight: '0.25rem' }} />
                    {showCookieInput ? 'Hide Cookie Option' : 'Or Sync via LEETCODE_SESSION Cookie'}
                  </button>
                </div>
              </div>
            ) : profile?.username ? (
              <div>
                <p style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>
                  No problems found matching this filter. Click <strong>Sync LeetCode</strong> above to fetch your recent solves!
                </p>
                <button onClick={() => handleSync()} disabled={syncing} className="btn btn-primary btn-sm">
                  ⚡ Sync Now
                </button>
              </div>
            ) : (
              <p>Please enter and connect your LeetCode username above to view your solves.</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {problems.map((prob) => {
              const isHighAttempt = prob.attempt_count > 4 || prob.failed_attempts >= 3;
              const isSaving = savingNoteSlug === prob.title_slug;

              return (
                <div
                  key={prob.title_slug}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: prob.needs_revision ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {/* Top Problem Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span className={`diff-pill diff-pill-${prob.difficulty.toLowerCase()}`}>
                            {prob.difficulty}
                          </span>

                          {/* Attempt Count Badge */}
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              backgroundColor: isHighAttempt ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-color)',
                              color: isHighAttempt ? '#ef4444' : 'var(--text-secondary)',
                              border: isHighAttempt ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                            }}
                          >
                            {prob.attempt_count} {prob.attempt_count === 1 ? 'Attempt' : 'Attempts'}
                            {prob.failed_attempts > 0 ? ` (${prob.failed_attempts} failed)` : ''}
                          </span>

                          {/* Today's Solve Badge */}
                          {prob.is_today && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                color: '#22c55e',
                                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                            >
                              ⚡ Solved Today
                            </span>
                          )}

                          {/* A2Z Sheet Match Badge */}
                          {prob.matched_a2z_position && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--easy-color)',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                              }}
                            >
                              ✓ Striver A2Z #{prob.matched_a2z_position}
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>{prob.title}</h3>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <a
                        href={prob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                      >
                        <span>LeetCode</span>
                        <ExternalLink size={12} />
                      </a>

                      <button
                        onClick={() => handleToggleRevision(prob.title_slug, prob.needs_revision)}
                        className={`btn btn-sm ${prob.needs_revision ? 'btn-primary' : 'btn-outline'}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          backgroundColor: prob.needs_revision ? '#ef4444' : 'transparent',
                          borderColor: prob.needs_revision ? '#ef4444' : 'var(--border-color)',
                          color: prob.needs_revision ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>{prob.needs_revision ? 'In Revision Queue' : 'Flag Revision'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Personal Reflection Note Editor */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: 'var(--bg-primary)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <FileEdit size={14} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Add reflection note (e.g. edge cases missed, complexity tradeoffs, key bug)..."
                      value={activeNotes[prob.title_slug] ?? ''}
                      onChange={(e) =>
                        setActiveNotes((prev) => ({ ...prev, [prob.title_slug]: e.target.value }))
                      }
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleSaveNote(prob.title_slug, prob.needs_revision)}
                      disabled={isSaving}
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Save size={11} />
                      <span>{isSaving ? 'Saved' : 'Save Note'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

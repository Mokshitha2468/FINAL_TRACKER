import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Timer,
  Calendar,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowLeft,
  Award,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ContestsExamsPage() {
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('contests'); // 'contests' | 'exams'

  // Contests State
  const [contests, setContests] = useState([]);
  const [loadingContests, setLoadingContests] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('All');

  // Exams State
  const [activeExam, setActiveExam] = useState(null);
  const [examHistory, setExamHistory] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [solvedPositions, setSolvedPositions] = useState([]);
  const [examNotes, setExamNotes] = useState('');
  const [submittingExam, setSubmittingExam] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // New Exam Form State
  const [preset, setPreset] = useState('standard');
  const [duration, setDuration] = useState(60);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState(null);

  // 1. Load Contests
  const loadContests = async () => {
    setLoadingContests(true);
    try {
      const data = await api.getContests(selectedPlatform === 'All' ? '' : selectedPlatform);
      setContests(data);
    } catch (err) {
      console.error('Failed to load contests:', err);
    } finally {
      setLoadingContests(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'contests') {
      loadContests();
    }
  }, [selectedPlatform, activeTab]);

  // 2. Load Exams Data
  const loadExamsData = async () => {
    if (!isAuthenticated) {
      setLoadingExams(false);
      return;
    }
    setLoadingExams(true);
    try {
      const active = await api.getActiveExam();
      setActiveExam(active);
      if (active) {
        // pre-populate already solved
        const preSolved = active.problems.filter((p) => p.is_solved).map((p) => p.position);
        setSolvedPositions(preSolved);
      }
      const history = await api.getExamHistory();
      setExamHistory(history);
    } catch (err) {
      console.error('Failed to load exam data:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'exams') {
      loadExamsData();
    }
  }, [activeTab, isAuthenticated]);

  // 3. Ticking Countdown Timer for Active Exam
  useEffect(() => {
    if (!activeExam || !activeExam.expires_at) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const expiry = new Date(activeExam.expires_at).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeExam]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (contestId) => {
    if (!isAuthenticated) {
      alert('Please sign in to bookmark upcoming contests.');
      return;
    }
    try {
      const res = await api.toggleContestBookmark(contestId);
      setContests((prev) =>
        prev.map((c) => (c.id === contestId ? { ...c, is_bookmarked: res.is_bookmarked } : c))
      );
    } catch (err) {
      alert(`Error updating bookmark: ${err.message}`);
    }
  };

  // Create Mock Exam
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please sign in to launch timed mock assessments.');
      return;
    }
    setGenerating(true);
    setLastResult(null);
    try {
      const session = await api.createExam({
        duration_minutes: Number(duration),
        difficulty_preset: preset,
        topic: topic || null,
      });
      setActiveExam(session);
      setSolvedPositions([]);
      setExamNotes('');
    } catch (err) {
      alert(`Error launching exam: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Toggle problem solve state in exam
  const handleToggleExamProblem = (position) => {
    setSolvedPositions((prev) =>
      prev.includes(position) ? prev.filter((p) => p !== position) : [...prev, position]
    );
  };

  // Submit Exam
  const handleSubmitExam = async () => {
    if (!activeExam) return;
    if (!window.confirm('Are you ready to submit your assessment and compute your final score?')) {
      return;
    }

    setSubmittingExam(true);
    try {
      const result = await api.submitExam(activeExam.id, {
        solved_positions: solvedPositions,
        notes: examNotes,
      });
      setLastResult(result);
      setActiveExam(null);
      // Reload history
      const history = await api.getExamHistory();
      setExamHistory(history);
    } catch (err) {
      alert(`Error submitting exam: ${err.message}`);
    } finally {
      setSubmittingExam(false);
    }
  };

  const platforms = ['All', 'LeetCode', 'Codeforces', 'CodeChef', 'AtCoder'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <header className="navbar">
        <div className="container navbar-inner">
          <div className="navbar-brand">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ArrowLeft size={16} />
              <span>Back to Curriculum</span>
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>Competitive & Mock Arena</span>
          </div>
        </div>
      </header>

      <main className="container" style={{ flex: 1, paddingBottom: '3rem' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '1.5rem 0',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.5rem',
          }}
        >
          <button
            onClick={() => setActiveTab('contests')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'contests' ? '700' : '500',
              color: activeTab === 'contests' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'contests' ? '2px solid var(--accent-color)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Trophy size={16} />
            <span>Upcoming Contests</span>
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'exams' ? '700' : '500',
              color: activeTab === 'exams' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'exams' ? '2px solid var(--accent-color)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Timer size={16} />
            <span>Mock Exam Arena</span>
          </button>
        </div>

        {/* TAB 1: UPCOMING CONTESTS */}
        {activeTab === 'contests' && (
          <div>
            {/* Filter by Platform */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
              }}
            >
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`btn btn-sm ${selectedPlatform === p ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {p}
                </button>
              ))}
            </div>

            {loadingContests ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                Loading contest calendar...
              </div>
            ) : contests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                No upcoming contests found for this platform.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1rem',
                }}
              >
                {contests.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: 'var(--border-color)',
                            color: 'var(--accent-color)',
                          }}
                        >
                          {c.platform}
                        </span>

                        <button
                          onClick={() => handleToggleBookmark(c.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: c.is_bookmarked ? '#f59e0b' : 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                          title={c.is_bookmarked ? 'Bookmarked' : 'Add Bookmark'}
                        >
                          {c.is_bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                        </button>
                      </div>

                      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {c.name}
                      </h3>

                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} />
                          <span>{c.start_time}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} />
                          <span>Duration: {c.duration_minutes} minutes</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>Go to Contest</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MOCK EXAM ARENA */}
        {activeTab === 'exams' && (
          <div>
            {!isAuthenticated ? (
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                }}
              >
                <AlertCircle size={32} style={{ color: 'var(--accent-color)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Authentication Required
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Please sign in to launch timed mock assessments and record scorecards.
                </p>
                <Link to="/login" className="btn btn-primary">
                  Sign In
                </Link>
              </div>
            ) : activeExam ? (
              /* ONGOING EXAM INTERFACE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Active HUD Header */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--easy-color)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Assessment In Progress
                    </span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{activeExam.title}</h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <Timer size={18} style={{ color: timeLeft && timeLeft < 300 ? '#ef4444' : 'var(--accent-color)' }} />
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.2rem',
                          fontWeight: '700',
                          color: timeLeft && timeLeft < 300 ? '#ef4444' : 'var(--text-primary)',
                        }}
                      >
                        {formatTime(timeLeft)}
                      </span>
                    </div>

                    <button
                      onClick={handleSubmitExam}
                      disabled={submittingExam}
                      className="btn btn-primary"
                      style={{ fontWeight: '700' }}
                    >
                      {submittingExam ? 'Submitting...' : 'Submit Assessment'}
                    </button>
                  </div>
                </div>

                {/* Problems List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeExam.problems.map((prob, idx) => (
                    <div
                      key={prob.position}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          Q{idx + 1}
                        </span>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              #{prob.position}
                            </span>
                            <span className={`diff-pill diff-pill-${prob.difficulty.toLowerCase()}`}>
                              {prob.difficulty}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {prob.topic}
                            </span>
                          </div>

                          <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{prob.title}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {prob.url && (
                          <a
                            href={prob.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <ExternalLink size={13} />
                            <span>Solve</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleExamProblem(prob.position)}
                          className={`btn btn-sm ${
                            solvedPositions.includes(prob.position) ? 'btn-primary' : 'btn-outline'
                          }`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: solvedPositions.includes(prob.position) ? '#fff' : 'var(--text-secondary)',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>{solvedPositions.includes(prob.position) ? 'Solved' : 'Mark Solved'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional Exam Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Assessment Reflections & Notes (Optional)
                  </label>
                  <textarea
                    placeholder="Key learnings, edge cases missed, complexity tradeoffs..."
                    value={examNotes}
                    onChange={(e) => setExamNotes(e.target.value)}
                    rows={3}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>
            ) : (
              /* LAUNCH ASSESSMENT / GENERATOR SCREEN */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Result Card if just submitted */}
                {lastResult && (
                  <div
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Award size={20} style={{ color: 'var(--easy-color)' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--easy-color)' }}>
                          Assessment Completed!
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Solved {lastResult.solved_count} of {lastResult.total_problems} problems. All solved problems synced to your tracker.
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {lastResult.score}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Exam Launch Card */}
                <form
                  onSubmit={handleCreateExam}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem',
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Launch Mock Assessment</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Simulate real technical interviews under timed conditions directly from Striver A2Z curriculum.
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Assessment Difficulty Preset
                      </label>
                      <select
                        value={preset}
                        onChange={(e) => setPreset(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="standard">Standard (1 Easy, 2 Medium, 1 Hard)</option>
                        <option value="drill">Quick Drill (2 Medium)</option>
                        <option value="hardcore">Hardcore (2 Medium, 2 Hard)</option>
                        <option value="easy_start">Warmup (3 Easy, 1 Medium)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Time Limit
                      </label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value={30}>30 Minutes</option>
                        <option value={45}>45 Minutes</option>
                        <option value={60}>60 Minutes</option>
                        <option value={90}>90 Minutes</option>
                        <option value={120}>120 Minutes</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Topic Focus (Optional)
                      </label>
                      <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <option value="">All Topics (Full Curriculum)</option>
                        <option value="Arrays">Arrays</option>
                        <option value="Binary Search">Binary Search</option>
                        <option value="Strings">Strings</option>
                        <option value="Linked List">Linked List</option>
                        <option value="Recursion">Recursion</option>
                        <option value="Bit Manipulation">Bit Manipulation</option>
                        <option value="Stack and Queues">Stack and Queues</option>
                        <option value="Sliding Window & Two Pointer">Sliding Window & Two Pointer</option>
                        <option value="Heaps">Heaps</option>
                        <option value="Greedy Algorithms">Greedy Algorithms</option>
                        <option value="Binary Trees">Binary Trees</option>
                        <option value="Binary Search Trees">Binary Search Trees</option>
                        <option value="Graphs">Graphs</option>
                        <option value="Dynamic Programming">Dynamic Programming</option>
                        <option value="Tries">Tries</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={generating}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontWeight: '700',
                    }}
                  >
                    <Play size={16} />
                    <span>{generating ? 'Sampling Questions...' : 'Start Assessment'}</span>
                  </button>
                </form>

                {/* Past Exam History */}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.75rem' }}>
                    Past Assessment Scorecards
                  </h3>

                  {loadingExams ? (
                    <div style={{ color: 'var(--text-muted)' }}>Loading history...</div>
                  ) : examHistory.length === 0 ? (
                    <div
                      style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      No past mock assessments found. Launch your first one above!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {examHistory.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '0.85rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : 'Recent'} &bull; {item.duration_minutes}m Duration
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {item.solved_count} / {item.total_problems} Solved
                            </span>

                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                color: item.score >= 75 ? 'var(--easy-color)' : item.score >= 50 ? 'var(--medium-color)' : 'var(--hard-color)',
                              }}
                            >
                              {item.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

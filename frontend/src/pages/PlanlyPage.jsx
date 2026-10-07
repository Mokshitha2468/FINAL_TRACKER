import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Settings2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ListOrdered,
  Sparkles,
} from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function PlanlyPage() {
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [hours, setHours] = useState({
    monday: 2,
    tuesday: 2,
    wednesday: 1.5,
    thursday: 2,
    friday: 1.5,
    saturday: 3,
    sunday: 3,
  });

  // Next unsolved query state
  const [nextLimit, setNextLimit] = useState(10);
  const [nextTopic, setNextTopic] = useState('');
  const [nextDiff, setNextDiff] = useState('');
  const [nextProblems, setNextProblems] = useState([]);
  const [loadingNext, setLoadingNext] = useState(false);

  const loadAll = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [setRes, schedRes] = await Promise.all([
        api.getPlannerSettings('DSA'),
        api.getSchedule('DSA'),
      ]);
      setSettings(setRes);
      if (setRes.weekly_hours) setHours(setRes.weekly_hours);
      setScheduleData(schedRes);
    } catch (err) {
      console.error('Failed to load Planly data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [user]);

  const handleSaveHours = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const parsedHours = {};
      Object.keys(hours).forEach((k) => {
        parsedHours[k] = parseFloat(hours[k]) || 0;
      });
      const res = await api.savePlannerSettings({ weekly_hours: parsedHours });
      setSettings(res.settings);
      setScheduleData(res.schedule_summary);
      alert('Availability updated! Future schedule has been recalculated.');
    } catch (err) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.generateSchedule('DSA');
      setScheduleData(res);
    } catch (err) {
      alert(`Error generating schedule: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteProblem = async (position) => {
    try {
      await api.toggleProblem(position, 'DSA');
      // Refresh schedule
      handleRegenerate();
    } catch (err) {
      alert(`Error completing problem: ${err.message}`);
    }
  };

  const fetchNextUnsolved = async () => {
    setLoadingNext(true);
    try {
      const data = await api.getNextUnsolved({
        limit: nextLimit,
        topic: nextTopic || undefined,
        difficulty: nextDiff || undefined,
      });
      setNextProblems(data);
    } catch (err) {
      alert(`Error loading unsolved: ${err.message}`);
    } finally {
      setLoadingNext(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNextUnsolved();
    }
  }, [nextLimit, nextTopic, nextDiff, user]);

  if (!isAuthenticated) {
    return (
      <div>
        <Navbar />
        <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            Planly — Automated Curriculum Scheduler
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Please sign in to generate and track your personal study schedule.
          </p>
          <Link to="/login" className="btn btn-primary">
            Sign In to Access Planly
          </Link>
        </div>
      </div>
    );
  }

  const {
    total_remaining_problems = 0,
    total_remaining_hours = 0,
    weekly_available_hours = 0,
    estimated_days_needed = 0,
    target_completion_date = null,
    schedule = [],
  } = scheduleData || {};

  return (
    <div>
      <Navbar />

      <main className="container" style={{ paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2rem 0 1.5rem 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="brand-badge" style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}>
                PLANLY
              </span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Study Schedule & Planner</h1>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Full forward-looking schedule packed strictly in canonical A2Z order (1 &rarr; 474).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/" className="btn btn-outline btn-sm">
              &larr; Back to Dashboard
            </Link>
            <button
              onClick={handleRegenerate}
              className="btn btn-primary btn-sm"
              disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Re-planning...' : 'Recalculate Schedule'}</span>
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <section className="track-progress-banner" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Remaining Problems
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {total_remaining_problems}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Estimated Total Study Time
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--easy-color)' }}>
              {total_remaining_hours} <span style={{ fontSize: '0.9rem', fontWeight: '400' }}>hrs</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Weekly Study Capacity
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--medium-color)' }}>
              {weekly_available_hours} <span style={{ fontSize: '0.9rem', fontWeight: '400' }}>hrs/week</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Est. Completion Date
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--accent-color)' }}>
              {target_completion_date || 'N/A'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({estimated_days_needed} study days)
            </div>
          </div>
        </section>

        {/* Grid: Left = Availability Setup & Next Unsolved, Right = Full Future Schedule */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.75rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Weekly Hours Setup Card */}
            <div className="explorer-section" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Settings2 size={16} style={{ color: 'var(--accent-color)' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: '600' }}>Your Available Study Hours</h2>
              </div>

              <form onSubmit={handleSaveHours}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                  {DAYS.map((day) => (
                    <div key={day}>
                      <label className="form-label" style={{ textTransform: 'capitalize' }}>
                        {day} (hrs)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        className="input-field"
                        style={{ width: '100%' }}
                        value={hours[day]}
                        onChange={(e) => setHours({ ...hours, [day]: e.target.value })}
                        required
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                  disabled={generating}
                >
                  Save & Re-calculate Schedule
                </button>
              </form>
            </div>

            {/* Next N Unsolved Query Card */}
            <div className="explorer-section" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ListOrdered size={16} style={{ color: 'var(--easy-color)' }} />
                <h2 style={{ fontSize: '1rem', fontWeight: '600' }}>Next Unsolved Queue</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Count</label>
                  <select
                    className="select-field"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    value={nextLimit}
                    onChange={(e) => setNextLimit(parseInt(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Topic</label>
                  <select
                    className="select-field"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    value={nextTopic}
                    onChange={(e) => setNextTopic(e.target.value)}
                  >
                    <option value="">All Topics</option>
                    {['Basics', 'Sorting', 'Arrays', 'Binary Search', 'Strings', 'Linked List', 'Recursion', 'Dynamic Programming', 'Binary Trees', 'Graphs'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Difficulty</label>
                  <select
                    className="select-field"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    value={nextDiff}
                    onChange={(e) => setNextDiff(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Unsolved List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
                {loadingNext ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading next...</div>
                ) : nextProblems.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No unsolved problems matching criteria.</div>
                ) : (
                  nextProblems.map((p) => (
                    <div
                      key={p.position}
                      style={{
                        padding: '0.45rem 0.65rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          #{p.position}
                        </span>
                        <span style={{ fontWeight: '500', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {p.title}
                        </span>
                      </div>
                      <span className={`diff-pill diff-pill-${p.difficulty.toLowerCase()}`} style={{ padding: '0.05rem 0.4rem', fontSize: '0.65rem' }}>
                        {p.difficulty}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Complete Future Schedule */}
          <div className="explorer-section" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} style={{ color: 'var(--accent-color)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Complete Forward Schedule</h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {schedule.length} active study sessions
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                Loading full schedule...
              </div>
            ) : schedule.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                All problems completed! Great work.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '720px', overflowY: 'auto' }}>
                {schedule.map((slot) => (
                  <div
                    key={slot.date}
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.85rem 1rem',
                    }}
                  >
                    {/* Slot Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                          {slot.day_of_week}, {slot.date}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Clock size={13} />
                        <span>{slot.allocated_minutes} / {slot.available_minutes} mins</span>
                      </div>
                    </div>

                    {/* Slot Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {slot.items.map((item) => (
                        <div
                          key={item.position}
                          style={{
                            padding: '0.4rem 0.6rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              #{item.position}
                            </span>
                            <span style={{ fontWeight: '500' }}>{item.title}</span>
                            <span className={`diff-pill diff-pill-${item.difficulty.toLowerCase()}`} style={{ padding: '0.05rem 0.4rem', fontSize: '0.65rem' }}>
                              {item.difficulty}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              ({item.estimated_minutes}m)
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link-icon-btn"
                                style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                              >
                                <ExternalLink size={11} /> Open
                              </a>
                            )}
                            <button
                              onClick={() => handleCompleteProblem(item.position)}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderColor: 'var(--easy-border)', color: 'var(--easy-color)' }}
                              title="Mark problem as completed"
                            >
                              <CheckCircle2 size={12} />
                              <span>Complete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

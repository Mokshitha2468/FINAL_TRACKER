import React, { useState } from 'react';
import { Flame, CheckCircle2, ExternalLink, Calendar, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function POTDBanner({ potdData, onPOTDCompleted }) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!potdData || !potdData.problem) return null;

  const { date, problem, is_solved, streak, history = [] } = potdData;

  const handleComplete = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to complete the Problem of the Day and track your streak.');
      return;
    }
    if (is_solved) return; // Already completed

    setLoading(true);
    try {
      await api.completeTodayPOTD();
      if (onPOTDCompleted) onPOTDCompleted();
    } catch (err) {
      alert(`Error completing POTD: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getDiffClass = (diff) => {
    switch ((diff || '').toLowerCase()) {
      case 'easy':
        return 'diff-pill diff-pill-easy';
      case 'hard':
        return 'diff-pill diff-pill-hard';
      default:
        return 'diff-pill diff-pill-medium';
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: is_solved ? '1px solid var(--easy-border)' : '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Meta Bar: Badge, Date, Streak & 7-Day History Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <Sparkles size={13} />
            <span>Problem of the Day</span>
          </div>

          <span
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Calendar size={13} />
            {date}
          </span>
        </div>

        {/* Streak & 7-Day Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: streak > 0 ? '#f59e0b' : 'var(--text-muted)',
            }}
          >
            <Flame size={16} fill={streak > 0 ? '#f59e0b' : 'none'} />
            <span>{streak} {streak === 1 ? 'Day' : 'Days'} Streak</span>
          </div>

          {/* 7-day mini strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {history.map((day) => (
              <div
                key={day.date}
                title={`${day.date} (${day.day_name}): ${day.is_solved ? 'Solved' : 'Not solved'}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.15rem',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: day.is_solved ? 'var(--easy-color)' : 'var(--border-color)',
                    border: day.date === date ? '1.5px solid #fff' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  {day.day_name.slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Problem Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                fontWeight: '700',
                color: 'var(--text-muted)',
              }}
            >
              #{problem.position}
            </span>
            <span className={getDiffClass(problem.difficulty)}>{problem.difficulty}</span>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'var(--border-color)',
                padding: '0.1rem 0.45rem',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
              }}
            >
              {problem.topic}
            </span>
            {problem.subtopic && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                &bull; {problem.subtopic}
              </span>
            )}
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {problem.title}
          </h3>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {problem.url && (
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <ExternalLink size={14} />
              <span>Practice</span>
            </a>
          )}

          <button
            onClick={handleComplete}
            disabled={is_solved || loading}
            className={`btn btn-sm ${is_solved ? 'btn-outline' : 'btn-primary'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: is_solved ? 'var(--easy-color)' : '#fff',
              borderColor: is_solved ? 'var(--easy-border)' : 'transparent',
              cursor: is_solved ? 'default' : 'pointer',
            }}
          >
            <CheckCircle2 size={15} />
            <span>{is_solved ? 'Solved Today' : loading ? 'Marking...' : 'Mark Solved'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Calendar, ExternalLink } from 'lucide-react';
import { api } from '../api/client';

export default function RevisionsDrawer({ isOpen, onClose, onRevisionUpdated }) {
  if (!isOpen) return null;

  const [filter, setFilter] = useState('');
  const [data, setData] = useState({ stats: {}, revisions: [] });
  const [loading, setLoading] = useState(true);

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const res = await api.getRevisions(filter);
      setData(res);
    } catch (err) {
      console.error('Failed to load revisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevisions();
  }, [filter]);

  const handleComplete = async (id) => {
    try {
      await api.completeRevision(id);
      loadRevisions();
      if (onRevisionUpdated) onRevisionUpdated();
    } catch (err) {
      alert(`Error completing revision: ${err.message}`);
    }
  };

  const { stats, revisions } = data;

  const getRevLabel = (num) => {
    switch (num) {
      case 1: return 'R1 (+1d)';
      case 2: return 'R2 (+3d)';
      case 3: return 'R3 (+7d)';
      case 4: return 'R4 (+21d)';
      default: return `R${num}`;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Spaced Repetition Revisions</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              +1, +3, +7, +21 days automated retention schedule
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Row */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: stats.due_today > 0 ? 'var(--hard-color)' : 'var(--text-primary)' }}>
              {stats.due_today || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Due Today</div>
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--medium-color)' }}>
              {stats.upcoming || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Upcoming</div>
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--easy-color)' }}>
              {stats.completed || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Done</div>
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
              {stats.total || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
          {[
            { label: 'All', val: '' },
            { label: 'Due Today', val: 'due_today' },
            { label: 'Upcoming', val: 'upcoming' },
            { label: 'Completed', val: 'completed' },
          ].map((tab) => (
            <button
              key={tab.val}
              type="button"
              className={`btn btn-sm ${filter === tab.val ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              onClick={() => setFilter(tab.val)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Revisions List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading revisions...</div>
          ) : revisions.length === 0 ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No revisions found under this filter.
            </div>
          ) : (
            revisions.map((rev) => (
              <div
                key={rev.id}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: `1px solid ${rev.is_due ? 'var(--hard-border)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: 'var(--border-color)',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        color: 'var(--accent-color)',
                      }}
                    >
                      {getRevLabel(rev.revision_number)}
                    </span>

                    <span style={{ fontSize: '0.8rem', color: rev.is_due ? 'var(--hard-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={12} />
                      {rev.scheduled_date} {rev.is_due && '• Due Now'}
                    </span>

                    <span className={`diff-pill diff-pill-${rev.difficulty.toLowerCase()}`} style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>
                      {rev.difficulty}
                    </span>
                  </div>

                  <div style={{ fontWeight: '500', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {rev.position ? `#${rev.position} ` : ''}{rev.problem_title}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {rev.topic}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  {rev.is_completed ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--easy-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={14} /> Completed
                    </span>
                  ) : (
                    <button
                      onClick={() => handleComplete(rev.id)}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      Mark Done
                    </button>
                  )}

                  {rev.url && (
                    <a
                      href={rev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-icon-btn"
                      style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                    >
                      <ExternalLink size={11} /> Open
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

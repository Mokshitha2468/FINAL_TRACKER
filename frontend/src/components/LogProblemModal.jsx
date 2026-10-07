import React, { useState } from 'react';
import { X, CheckCircle, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function LogProblemModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('leetcode');
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('Arrays');
  const [difficulty, setDifficulty] = useState('Medium');
  const [status, setStatus] = useState('solved');
  const [date, setDate] = useState(todayStr);

  // Structured notes
  const [approach, setApproach] = useState('');
  const [whatWentWrong, setWhatWentWrong] = useState('');
  const [whatLearned, setWhatLearned] = useState('');
  const [rememberNextTime, setRememberNextTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        title,
        platform,
        url: url.trim() || null,
        topic,
        difficulty,
        status,
        date,
        notes: {
          approach,
          what_went_wrong: whatWentWrong,
          what_learned: whatLearned,
          remember_next_time: rememberNextTime,
        },
      };

      const res = await api.logProblem(payload);
      onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to log problem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="auth-card"
        style={{
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>
          Log Problem & Reflection
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Matches canonical A2Z problem if available and automatically schedules +1, +3, +7, +21 day revisions.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Row 1: Title & Platform */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Problem Title *</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                placeholder="e.g. Two Sum"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Platform</label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="leetcode">LeetCode</option>
                <option value="gfg">GeeksforGeeks</option>
                <option value="takeuforward">takeUforward</option>
                <option value="crackedprep">crackedprep</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Row 2: URL */}
          <div className="form-group">
            <label className="form-label">Problem URL (Optional)</label>
            <input
              type="url"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="https://leetcode.com/problems/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          {/* Row 3: Topic, Difficulty, Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Topic</label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {['Basics', 'Sorting', 'Arrays', 'Binary Search', 'Strings', 'Linked List', 'Recursion', 'Bit Manipulation', 'Stacks & Queues', 'Sliding Window & Two Pointers', 'Heaps', 'Greedy Algorithms', 'Binary Trees', 'Binary Search Trees', 'Graphs', 'Dynamic Programming', 'Tries'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Difficulty</label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="select-field"
                style={{ width: '100%' }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="solved">Solved</option>
                <option value="attempted">Attempted</option>
              </select>
            </div>
          </div>

          {/* Structured Notes */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Reflection Notes
            </h3>

            <div className="form-group">
              <label className="form-label">What approach did I use?</label>
              <textarea
                className="input-field"
                style={{ width: '100%', minHeight: '55px', resize: 'vertical' }}
                placeholder="e.g. Hash map storing value -> index for O(N) lookup..."
                value={approach}
                onChange={(e) => setApproach(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">What went wrong?</label>
              <textarea
                className="input-field"
                style={{ width: '100%', minHeight: '55px', resize: 'vertical' }}
                placeholder="e.g. Initially missed edge case when target is 0 or array has duplicate values..."
                value={whatWentWrong}
                onChange={(e) => setWhatWentWrong(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">What did I learn?</label>
              <textarea
                className="input-field"
                style={{ width: '100%', minHeight: '55px', resize: 'vertical' }}
                placeholder="e.g. Two-pass vs one-pass hash map trade-offs..."
                value={whatLearned}
                onChange={(e) => setWhatLearned(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">What should I remember next time?</label>
              <textarea
                className="input-field"
                style={{ width: '100%', minHeight: '55px', resize: 'vertical' }}
                placeholder="e.g. Always check if complement index is distinct from current index..."
                value={rememberNextTime}
                onChange={(e) => setRememberNextTime(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save & Schedule Revisions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

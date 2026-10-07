import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, User, LogOut, LogIn, PlusCircle, RotateCcw, Calendar, CheckSquare, Trophy, Code2, PenTool } from 'lucide-react';

export default function Navbar({
  totalSolved = 0,
  totalProblems = 474,
  onOpenLogModal,
  onOpenRevisions,
  revisionsDueCount = 0,
  onOpenTodos,
  todosCount = 0,
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const percentage = totalProblems > 0 ? ((totalSolved / totalProblems) * 100).toFixed(1) : 0;

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <div className="navbar-brand">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>DSA Revision Tracker</span>
            <span className="brand-badge">Striver A2Z</span>
          </Link>
        </div>

        <div className="navbar-stats">
          <div className="stat-box">
            <span className="stat-label">Progress:</span>
            <span className="stat-val stat-val-highlight">{totalSolved}</span>
            <span className="stat-label">/ {totalProblems}</span>
            <span className="stat-label" style={{ fontSize: '0.8rem' }}>({percentage}%)</span>
          </div>

          <Link
            to="/planly"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Open Planly Curriculum Scheduler"
          >
            <Calendar size={14} />
            <span>Planly</span>
          </Link>

          <Link
            to="/contests"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Upcoming Contests & Mock Exam Arena"
          >
            <Trophy size={14} />
            <span>Contests</span>
          </Link>

          <Link
            to="/leetcode"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="LeetCode Auto-Sync Vault & Error Revision Engine"
          >
            <Code2 size={14} />
            <span>LeetCode</span>
          </Link>

          <Link
            to="/whiteboard"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Infinite Digital Whiteboard"
          >
            <PenTool size={14} />
            <span>Whiteboard</span>
          </Link>

          {isAuthenticated && (
            <button
              onClick={onOpenRevisions}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}
              title="View Spaced Repetition Revisions"
            >
              <RotateCcw size={14} />
              <span>Revisions</span>
              {revisionsDueCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--hard-color)',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '0.05rem 0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                  }}
                >
                  {revisionsDueCount}
                </span>
              )}
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={onOpenTodos}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}
              title="View Tasks & TODOs"
            >
              <CheckSquare size={14} />
              <span>TODO</span>
              {todosCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--accent-color)',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '0.05rem 0.4rem',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                  }}
                >
                  {todosCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="navbar-auth">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={onOpenLogModal}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <PlusCircle size={14} />
                <span>Log Problem</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <User size={16} />
                <span>{user?.username}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-primary btn-sm">
                <LogIn size={14} />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

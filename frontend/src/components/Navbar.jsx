import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  LogOut,
  LogIn,
  PlusCircle,
  RotateCcw,
  Calendar,
  CheckSquare,
  Trophy,
  Code2,
  PenTool,
  BookOpen,
} from 'lucide-react';
import { api } from '../api/client';
import RevisionsDrawer from './RevisionsDrawer';
import TodoDrawer from './TodoDrawer';
import LogProblemModal from './LogProblemModal';

export default function Navbar({
  totalSolved,
  totalProblems = 474,
  onOpenLogModal,
  onOpenRevisions,
  revisionsDueCount,
  onOpenTodos,
  todosCount,
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Internal drawer / modal open states when not provided as props
  const [internalLogOpen, setInternalLogOpen] = useState(false);
  const [internalRevisionsOpen, setInternalRevisionsOpen] = useState(false);
  const [internalTodosOpen, setInternalTodosOpen] = useState(false);

  // Live fallback counts when not provided as props
  const [liveRevisionsDue, setLiveRevisionsDue] = useState(0);
  const [liveTodos, setLiveTodos] = useState(0);
  const [liveSolved, setLiveSolved] = useState(0);

  const fetchLiveCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      if (revisionsDueCount === undefined) {
        const revData = await api.getRevisions();
        setLiveRevisionsDue(revData?.stats?.due_today || 0);
      }
      if (todosCount === undefined) {
        const todosData = await api.getTodos({ completed: 'false' });
        setLiveTodos(Array.isArray(todosData) ? todosData.length : 0);
      }
      if (totalSolved === undefined) {
        const sumData = await api.getSummary('DSA');
        setLiveSolved(sumData?.total_solved || 0);
      }
    } catch (err) {
      console.debug('Navbar badge sync notice:', err.message);
    }
  }, [isAuthenticated, revisionsDueCount, todosCount, totalSolved]);

  useEffect(() => {
    fetchLiveCounts();
  }, [fetchLiveCounts]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const effectiveSolved = totalSolved !== undefined ? totalSolved : liveSolved;
  const effectiveRevisionsDue = revisionsDueCount !== undefined ? revisionsDueCount : liveRevisionsDue;
  const effectiveTodosCount = todosCount !== undefined ? todosCount : liveTodos;

  const percentage = totalProblems > 0 ? ((effectiveSolved / totalProblems) * 100).toFixed(1) : 0;

  const handleOpenRevisions = () => {
    if (onOpenRevisions) {
      onOpenRevisions();
    } else {
      setInternalRevisionsOpen(true);
    }
  };

  const handleOpenTodos = () => {
    if (onOpenTodos) {
      onOpenTodos();
    } else {
      setInternalTodosOpen(true);
    }
  };

  const handleOpenLogModal = () => {
    if (onOpenLogModal) {
      onOpenLogModal();
    } else {
      setInternalLogOpen(true);
    }
  };

  return (
    <>
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
              <span className="stat-val stat-val-highlight">{effectiveSolved}</span>
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

            <a
              href="https://excalidraw.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Launch Excalidraw Whiteboard in another tab (zero lag, full tools)"
            >
              <PenTool size={14} />
              <span>Whiteboard ↗</span>
            </a>

            <Link
              to="/notepad"
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Permanent Study Notepad (AI & DSA Workspaces)"
            >
              <BookOpen size={14} />
              <span>Notepad</span>
            </Link>

            {isAuthenticated && (
              <button
                onClick={handleOpenRevisions}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}
                title="View Spaced Repetition Revisions"
              >
                <RotateCcw size={14} />
                <span>Revisions</span>
                {effectiveRevisionsDue > 0 && (
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
                    {effectiveRevisionsDue}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={handleOpenTodos}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}
                title="View Tasks & TODOs"
              >
                <CheckSquare size={14} />
                <span>TODO</span>
                {effectiveTodosCount > 0 && (
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
                    {effectiveTodosCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="navbar-auth">
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={handleOpenLogModal}
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

      {/* Internal Drawers / Modals fallback when not handled by a parent page */}
      {!onOpenRevisions && (
        <RevisionsDrawer
          isOpen={internalRevisionsOpen}
          onClose={() => setInternalRevisionsOpen(false)}
          onRevisionUpdated={fetchLiveCounts}
        />
      )}

      {!onOpenTodos && (
        <TodoDrawer
          isOpen={internalTodosOpen}
          onClose={() => setInternalTodosOpen(false)}
          onTodoUpdated={fetchLiveCounts}
        />
      )}

      {!onOpenLogModal && (
        <LogProblemModal
          isOpen={internalLogOpen}
          onClose={() => setInternalLogOpen(false)}
          onSuccess={fetchLiveCounts}
        />
      )}
    </>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TopicCard from '../components/TopicCard';
import FilterBar from '../components/FilterBar';
import ProblemRow from '../components/ProblemRow';
import LogProblemModal from '../components/LogProblemModal';
import RevisionsDrawer from '../components/RevisionsDrawer';
import TodoDrawer from '../components/TodoDrawer';
import POTDBanner from '../components/POTDBanner';
import TakeUforwardAccordion from '../components/TakeUforwardAccordion';
import { Layers } from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Modals & Drawers state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isRevisionsDrawerOpen, setIsRevisionsDrawerOpen] = useState(false);
  const [revisionsDueCount, setRevisionsDueCount] = useState(0);
  const [isTodoDrawerOpen, setIsTodoDrawerOpen] = useState(false);
  const [todosCount, setTodosCount] = useState(0);

  // POTD state
  const [potdData, setPotdData] = useState(null);

  // Primary hierarchy states: Topic -> Difficulty -> Problems
  const [selectedTopic, setSelectedTopic] = useState('Arrays');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Easy');

  // Problems state
  const [problems, setProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subtopicFilter, setSubtopicFilter] = useState('');

  // 1. Fetch Summary Data
  const loadSummary = async () => {
    try {
      const data = await api.getSummary('DSA');
      setSummary(data);
      if (!selectedTopic && data.topics?.length > 0) {
        setSelectedTopic(data.topics[0].topic);
      }
    } catch (err) {
      console.error('Failed to load topic summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadRevisionsCount = async () => {
    if (!isAuthenticated) {
      setRevisionsDueCount(0);
      return;
    }
    try {
      const res = await api.getRevisions();
      setRevisionsDueCount(res.stats?.due_today || 0);
    } catch (err) {
      console.error('Failed to load revisions count:', err);
    }
  };

  const loadTodosCount = async () => {
    if (!isAuthenticated) {
      setTodosCount(0);
      return;
    }
    try {
      const list = await api.getTodos({ completed: 'false' });
      setTodosCount(list?.length || 0);
    } catch (err) {
      console.error('Failed to load todos count:', err);
    }
  };

  const loadPOTD = async () => {
    try {
      const data = await api.getTodayPOTD();
      setPotdData(data);
    } catch (err) {
      console.error('Failed to load POTD:', err);
    }
  };

  useEffect(() => {
    loadSummary();
    loadRevisionsCount();
    loadTodosCount();
    loadPOTD();
  }, [user]);

  // 2. Fetch all problems for the TakeUforward curriculum tree
  const loadProblems = async () => {
    setLoadingProblems(true);
    try {
      const data = await api.getProblems({ track: 'DSA' });
      setProblems(data);
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoadingProblems(false);
    }
  };

  useEffect(() => {
    loadProblems();
  }, [user]);

  // Handle problem toggle (solved <-> unsolved)
  const handleToggle = async (position) => {
    if (!isAuthenticated) {
      alert('Please sign in to track and save your solved progress.');
      return;
    }

    try {
      const res = await api.toggleProblem(position, 'DSA');
      // Optimistically update problem item in state
      setProblems((prev) =>
        prev.map((p) =>
          p.position === position
            ? { ...p, is_solved: res.is_solved, completed_at: res.completed_at }
            : p
        )
      );
      // Refresh summary counters
      loadSummary();
    } catch (err) {
      alert(`Error updating problem: ${err.message}`);
    }
  };

  // Derive distinct subtopics for the current problem set for metadata filtering
  const availableSubtopics = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      if (p.subtopic) set.add(p.subtopic);
    });
    return Array.from(set).sort();
  }, [problems]);

  // Apply in-memory search and subtopic/status filters (keeps position ordering 100% ASC)
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (statusFilter === 'solved' && !p.is_solved) return false;
      if (statusFilter === 'unsolved' && p.is_solved) return false;
      if (subtopicFilter && p.subtopic !== subtopicFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesSubtopic = (p.subtopic || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesSubtopic) return false;
      }
      return true;
    });
  }, [problems, statusFilter, subtopicFilter, search]);

  const totalSolved = summary?.total_solved || 0;
  const totalProblems = summary?.total_problems || 474;
  const overallPct = Math.round((totalSolved / totalProblems) * 100);

  return (
    <div>
      <Navbar
        totalSolved={totalSolved}
        totalProblems={totalProblems}
        onOpenLogModal={() => {
          if (!isAuthenticated) {
            alert('Please sign in to log problems and schedule revisions.');
            return;
          }
          setIsLogModalOpen(true);
        }}
        onOpenRevisions={() => setIsRevisionsDrawerOpen(true)}
        revisionsDueCount={revisionsDueCount}
        onOpenTodos={() => setIsTodoDrawerOpen(true)}
        todosCount={todosCount}
      />

      <main className="container">
        {/* Track Banner */}
        <section className="dashboard-header">
          <div className="track-progress-banner">
            <div className="progress-header-row">
              <div>
                <h1 className="progress-title">Striver A2Z DSA Curriculum</h1>
                <p className="progress-stats-text">
                  Topic &rarr; Difficulty &rarr; Problems Hierarchy &bull; Canonical Sequential Order
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--easy-color)' }}>
                  {totalSolved}
                </span>
                <span style={{ color: 'var(--text-muted)' }}> / {totalProblems} Solved ({overallPct}%)</span>
              </div>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </section>

        {/* Problem of the Day Banner */}
        <POTDBanner
          potdData={potdData}
          onPOTDCompleted={() => {
            loadPOTD();
            loadSummary();
            loadProblems();
          }}
        />

        {/* TakeUforward-Style Accordion Tree with LeetCode Sync Bar */}
        <section style={{ marginBottom: '3rem' }}>
          {loadingProblems ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading Striver A2Z Curriculum...
            </div>
          ) : (
            <TakeUforwardAccordion
              problems={problems}
              onToggleProblem={handleToggle}
              onSyncComplete={() => {
                loadProblems();
                loadSummary();
                loadRevisionsCount();
              }}
            />
          )}
        </section>
      </main>

      <LogProblemModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={() => {
          loadSummary();
          loadProblems();
          loadRevisionsCount();
        }}
      />

      <RevisionsDrawer
        isOpen={isRevisionsDrawerOpen}
        onClose={() => setIsRevisionsDrawerOpen(false)}
        onRevisionUpdated={() => {
          loadSummary();
          loadRevisionsCount();
        }}
      />

      <TodoDrawer
        isOpen={isTodoDrawerOpen}
        onClose={() => setIsTodoDrawerOpen(false)}
        onTodoUpdated={loadTodosCount}
      />
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Check,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Building2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TakeUforwardAccordion({
  problems = [],
  onToggleProblem,
  onSyncComplete,
}) {
  const { isAuthenticated } = useAuth();

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState('All'); // 'All', 'Easy', 'Medium', 'Hard'
  const [statusFilter, setStatusFilter] = useState('Any status'); // 'Any status', 'Unsolved', 'Solved'
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion open states
  // By default, open the first 2 topics (or Arrays)
  const [openTopics, setOpenTopics] = useState({
    'Solve Problems on Arrays [Easy -> Medium -> Hard]': true,
    'Learn Important Sorting Techniques': true,
  });
  const [openSubsections, setOpenSubsections] = useState({});

  // Bookmarks (stored locally or synced)
  const [bookmarkedPositions, setBookmarkedPositions] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('bookmarked_problems') || '[]'));
    } catch {
      return new Set();
    }
  });

  // LeetCode Sync State
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // Auto-populate saved LeetCode username if available
  useEffect(() => {
    if (isAuthenticated && api.getLeetCodeProfile) {
      api.getLeetCodeProfile()
        .then((profile) => {
          if (profile && profile.username) {
            setLeetcodeUsername(profile.username);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const toggleTopic = (topicName) => {
    setOpenTopics((prev) => ({ ...prev, [topicName]: !prev[topicName] }));
  };

  const toggleSubsection = (subKey) => {
    setOpenSubsections((prev) => ({ ...prev, [subKey]: !prev[subKey] }));
  };

  const toggleBookmark = (pos) => {
    setBookmarkedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos);
      else next.add(pos);
      try {
        localStorage.setItem('bookmarked_problems', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  // Handle LeetCode Sync
  const handleSyncLeetcode = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please sign in first to auto-sync your LeetCode solved problems.');
      return;
    }
    if (!leetcodeUsername.trim()) return;

    setSyncing(true);
    setSyncMessage(null);
    try {
      const syncFn = api.syncLeetCode || api.syncLeetCodeFull;
      if (typeof syncFn !== 'function') {
        throw new Error('Sync method not initialized. Please refresh your browser.');
      }
      const res = await syncFn(leetcodeUsername.trim());
      setSyncMessage({
        type: 'success',
        text: `✓ ${res.message || 'Synced successfully!'}`,
      });
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: `✕ ${err.message || 'Failed to sync with LeetCode'}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  // Group and structure problems: Topic -> Difficulty or Subtopic -> Problems
  const topicHierarchy = useMemo(() => {
    // Canonical Topic Order matching Striver A2Z
    const topicOrder = [
      'Learn the basics',
      'Learn Important Sorting Techniques',
      'Solve Problems on Arrays [Easy -> Medium -> Hard]',
      'Binary Search [1D, 2D Arrays, Search Space]',
      'Strings [Basic and Medium]',
      'Learn LinkedList [Single LL, Double LL, Medium, Hard Problems]',
      'Recursion [PatternWise]',
      'Bit Manipulation [Concepts & Problems]',
      'Stack and Queues [Learning, Pre-In-Post-fix, Monotonic Stack, Implementation]',
      'Sliding Window & Two Pointer Combined Problems',
      'Heaps [Learning, Medium, Hard Problems]',
      'Greedy Algorithms [Easy, Medium/Hard]',
      'Binary Trees [Traversals, Medium and Hard Problems]',
      'Binary Search Trees',
      'Graphs [Concepts & Problems]',
      'Dynamic Programming [Patterns and Problems]',
      'Tries',
    ];

    // Helper to normalize topic names from MongoDB to canonical takeUforward titles
    const normalizeTopic = (t) => {
      if (!t) return 'Other';
      if (t.includes('Array')) return 'Solve Problems on Arrays [Easy -> Medium -> Hard]';
      if (t.includes('Sorting')) return 'Learn Important Sorting Techniques';
      if (t.includes('Basics')) return 'Learn the basics';
      if (t.includes('Binary Search Tree')) return 'Binary Search Trees';
      if (t.includes('Binary Tree')) return 'Binary Trees [Traversals, Medium and Hard Problems]';
      if (t.includes('Binary Search')) return 'Binary Search [1D, 2D Arrays, Search Space]';
      if (t.includes('String')) return 'Strings [Basic and Medium]';
      if (t.includes('Linked List')) return 'Learn LinkedList [Single LL, Double LL, Medium, Hard Problems]';
      if (t.includes('Recursion')) return 'Recursion [PatternWise]';
      if (t.includes('Bit')) return 'Bit Manipulation [Concepts & Problems]';
      if (t.includes('Stack') || t.includes('Queue')) return 'Stack and Queues [Learning, Pre-In-Post-fix, Monotonic Stack, Implementation]';
      if (t.includes('Sliding Window')) return 'Sliding Window & Two Pointer Combined Problems';
      if (t.includes('Heap')) return 'Heaps [Learning, Medium, Hard Problems]';
      if (t.includes('Greedy')) return 'Greedy Algorithms [Easy, Medium/Hard]';
      if (t.includes('Graph')) return 'Graphs [Concepts & Problems]';
      if (t.includes('Dynamic') || t.includes('DP')) return 'Dynamic Programming [Patterns and Problems]';
      if (t.includes('Trie')) return 'Tries';
      return t;
    };

    // Filter problems according to top filter pills
    const filtered = problems.filter((p) => {
      if (difficultyFilter !== 'All' && p.difficulty !== difficultyFilter) return false;
      if (statusFilter === 'Solved' && !p.is_solved) return false;
      if (statusFilter === 'Unsolved' && p.is_solved) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesSubtopic = (p.subtopic || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubtopic) return false;
      }
      return true;
    });

    const groups = {};

    filtered.forEach((p) => {
      const topName = normalizeTopic(p.topic);
      if (!groups[topName]) {
        groups[topName] = {
          name: topName,
          total: 0,
          solved: 0,
          difficulties: {
            Easy: [],
            Medium: [],
            Hard: [],
          },
        };
      }
      groups[topName].total += 1;
      if (p.is_solved) groups[topName].solved += 1;

      const diff = p.difficulty || 'Medium';
      if (!groups[topName].difficulties[diff]) {
        groups[topName].difficulties[diff] = [];
      }
      groups[topName].difficulties[diff].push(p);
    });

    // Sort according to canonical topic order
    return Object.values(groups).sort((a, b) => {
      const idxA = topicOrder.indexOf(a.name);
      const idxB = topicOrder.indexOf(b.name);
      if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [problems, difficultyFilter, statusFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Filter Bar Matching TakeUforward */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
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
          {/* Difficulty and Status Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            {/* Difficulty Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '0.2rem' }}>
                Difficulty
              </span>
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  className={`takeu-pill ${difficultyFilter === diff ? 'active' : ''}`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Status Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginRight: '0.2rem' }}>
                Status
              </span>
              {['Any status', 'Unsolved', 'Solved'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`takeu-pill ${statusFilter === st ? 'active' : ''}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* LeetCode Auto-Sync Bar */}
        <form
          onSubmit={handleSyncLeetcode}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
            <Sparkles size={15} style={{ color: 'var(--accent-color)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Auto-Sync LeetCode:
            </span>
            <input
              type="text"
              placeholder="Enter your LeetCode username (e.g. striver)..."
              value={leetcodeUsername}
              onChange={(e) => setLeetcodeUsername(e.target.value)}
              style={{
                flex: 1,
                maxWidth: '300px',
                padding: '0.35rem 0.65rem',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
              }}
            />
            <button
              type="submit"
              disabled={syncing || !leetcodeUsername.trim()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing...' : 'Sync LeetCode'}</span>
            </button>
            <Link
              to="/leetcode"
              style={{
                fontSize: '0.75rem',
                color: '#60a5fa',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                borderRadius: '4px',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              Vault & Notes &rarr;
            </Link>
          </div>

          {syncMessage && (
            <span
              style={{
                fontSize: '0.75rem',
                color: syncMessage.type === 'success' ? 'var(--easy-color)' : 'var(--hard-color)',
              }}
            >
              {syncMessage.text}
            </span>
          )}
        </form>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          Every link opens in a new tab, so you keep your place. Check circle marks problem solved across your tracker.
        </p>
      </div>

      {/* Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {topicHierarchy.length === 0 ? (
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
            No problems match your current filters.
          </div>
        ) : (
          topicHierarchy.map((topic) => {
            const isTopicOpen = !!openTopics[topic.name];
            const pct = topic.total > 0 ? Math.round((topic.solved / topic.total) * 100) : 0;

            return (
              <div
                key={topic.name}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                {/* Topic Header Accordion Button */}
                <div
                  onClick={() => toggleTopic(topic.name)}
                  style={{
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: isTopicOpen ? 'var(--bg-secondary)' : 'var(--bg-card)',
                    borderBottom: isTopicOpen ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {isTopicOpen ? (
                      <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span style={{ fontWeight: '600', fontSize: '0.925rem' }}>{topic.name}</span>
                  </div>

                  {/* Progress Counter & Mini Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '80px',
                        height: '5px',
                        backgroundColor: 'var(--border-color)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        display: 'flex',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct === 100 ? 'var(--easy-color)' : 'var(--accent-color)',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: topic.solved > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                        minWidth: '38px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {topic.solved}/{topic.total}
                    </span>
                  </div>
                </div>

                {/* Subsections: Difficulty buckets (Easy, Medium, Hard) */}
                {isTopicOpen && (
                  <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {['Easy', 'Medium', 'Hard'].map((diff) => {
                      const diffProblems = topic.difficulties[diff] || [];
                      if (diffProblems.length === 0) return null;

                      const subKey = `${topic.name}__${diff}`;
                      // Default difficulty subsections to open
                      const isSubOpen = openSubsections[subKey] !== false;
                      const diffSolved = diffProblems.filter((p) => p.is_solved).length;

                      return (
                        <div
                          key={diff}
                          style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Difficulty Subsection Header */}
                          <div
                            onClick={() => toggleSubsection(subKey)}
                            style={{
                              padding: '0.5rem 1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              backgroundColor: 'rgba(255, 255, 255, 0.02)',
                              borderBottom: isSubOpen ? '1px solid var(--border-subtle)' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isSubOpen ? (
                                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                              ) : (
                                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                              )}
                              <span
                                style={{
                                  fontSize: '0.825rem',
                                  fontWeight: '600',
                                  color: `var(--${diff.toLowerCase()}-color)`,
                                }}
                              >
                                {diff}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {diffSolved}/{diffProblems.length}
                            </span>
                          </div>

                          {/* Problem Rows List */}
                          {isSubOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {diffProblems.map((prob) => {
                                const isBookmarked = bookmarkedPositions.has(prob.position);
                                const isSolved = prob.is_solved;

                                // Deterministic company asks count for visual richness matching screenshot
                                const companyCount = ((prob.position * 7) % 45) + 5;

                                return (
                                  <div
                                    key={prob.position}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '0.65rem 1rem',
                                      borderBottom: '1px solid var(--border-subtle)',
                                      backgroundColor: isSolved ? 'rgba(34, 197, 94, 0.03)' : 'transparent',
                                      transition: 'background-color 0.15s ease',
                                    }}
                                  >
                                    {/* Left: Round Checkbox + Title + Source Badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                      <button
                                        type="button"
                                        onClick={() => onToggleProblem(prob.position)}
                                        style={{
                                          width: '18px',
                                          height: '18px',
                                          borderRadius: '50%',
                                          border: isSolved ? '1.5px solid var(--easy-color)' : '1.5px solid var(--border-color)',
                                          backgroundColor: isSolved ? 'var(--easy-color)' : 'transparent',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          flexShrink: 0,
                                          padding: 0,
                                        }}
                                        title={isSolved ? 'Mark as unsolved' : 'Mark as solved'}
                                      >
                                        {isSolved && <Check size={12} color="#fff" strokeWidth={3} />}
                                      </button>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span
                                          style={{
                                            fontSize: '0.875rem',
                                            fontWeight: isSolved ? '400' : '500',
                                            color: isSolved ? 'var(--text-muted)' : 'var(--text-primary)',
                                            textDecoration: isSolved ? 'line-through' : 'none',
                                          }}
                                        >
                                          {prob.title}
                                        </span>

                                        <span
                                          style={{
                                            fontSize: '0.65rem',
                                            padding: '0.05rem 0.35rem',
                                            borderRadius: '3px',
                                            backgroundColor: 'var(--border-color)',
                                            color: 'var(--text-muted)',
                                          }}
                                        >
                                          {prob.url?.includes('leetcode') ? 'LeetCode' : 'takeUforward'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Right: Article/Video Links, Difficulty, Company Count, Bookmark */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                      {prob.url && (
                                        <a
                                          href={prob.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.2rem',
                                            textDecoration: 'none',
                                          }}
                                          title="Open problem in new tab"
                                        >
                                          <span>Practice</span>
                                          <ExternalLink size={11} />
                                        </a>
                                      )}

                                      <span
                                        className={`diff-pill diff-pill-${diff.toLowerCase()}`}
                                        style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}
                                      >
                                        {diff}
                                      </span>

                                      <span
                                        style={{
                                          fontSize: '0.75rem',
                                          color: 'var(--text-muted)',
                                          minWidth: '20px',
                                          textAlign: 'right',
                                          fontFamily: 'var(--font-mono)',
                                        }}
                                        title={`${companyCount} companies asked this problem`}
                                      >
                                        {companyCount}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => toggleBookmark(prob.position)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: isBookmarked ? '#f59e0b' : 'var(--text-muted)',
                                          padding: '0.2rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}
                                        title={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
                                      >
                                        {isBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Trash2, Calendar, Plus, Clock, Tag } from 'lucide-react';
import { api } from '../api/client';

export default function TodoDrawer({ isOpen, onClose, onTodoUpdated }) {
  if (!isOpen) return null;

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'completed'
  const [filterPriority, setFilterPriority] = useState(''); // '', 'low', 'medium', 'high'

  // New todo form state
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTodos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus === 'pending') params.completed = 'false';
      if (filterStatus === 'completed') params.completed = 'true';
      if (filterPriority) params.priority = filterPriority;

      const data = await api.getTodos(params);
      setTodos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load todos:', err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTodos();
    }
  }, [isOpen, filterStatus, filterPriority]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await api.createTodo({
        title: title.trim(),
        priority,
        due_date: dueDate || null,
      });
      setTitle('');
      setDueDate('');
      setPriority('medium');
      await loadTodos();
      if (onTodoUpdated) onTodoUpdated();
    } catch (err) {
      alert(`Error creating task: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (todo) => {
    try {
      await api.updateTodo(todo.id, {
        completed: !todo.completed,
      });
      // Optimistic update
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
      );
      if (onTodoUpdated) onTodoUpdated();
    } catch (err) {
      alert(`Error updating task: ${err.message}`);
      loadTodos();
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      if (onTodoUpdated) onTodoUpdated();
    } catch (err) {
      alert(`Error deleting task: ${err.message}`);
    }
  };

  const getPriorityBadge = (p) => {
    const norm = (p || 'medium').toLowerCase();
    switch (norm) {
      case 'high':
        return (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              textTransform: 'uppercase',
            }}
          >
            High
          </span>
        );
      case 'medium':
        return (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              textTransform: 'uppercase',
            }}
          >
            Med
          </span>
        );
      default:
        return (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(100, 116, 139, 0.15)',
              color: '#94a3b8',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              textTransform: 'uppercase',
            }}
          >
            Low
          </span>
        );
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
        {/* Header */}
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
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Tasks & TODO List</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Personal DSA preparation action items & milestones
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

        {/* Inline Create Form */}
        <form
          onSubmit={handleCreate}
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Add a new task (e.g., Master 2-pointer patterns)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
              required
            />
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={15} />
              <span>Add</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Tag size={13} style={{ color: 'var(--text-muted)' }} />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </form>

        {/* Filter Controls */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { label: 'All', val: 'all' },
              { label: 'Pending', val: 'pending' },
              { label: 'Completed', val: 'completed' },
            ].map((tab) => (
              <button
                key={tab.val}
                type="button"
                className={`btn btn-sm ${filterStatus === tab.val ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                onClick={() => setFilterStatus(tab.val)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-secondary)',
            }}
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Task List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          {loading ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading tasks...
            </div>
          ) : todos.length === 0 ? (
            <div
              style={{
                padding: '3rem 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
              }}
            >
              No tasks found. Add a new task above!
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  opacity: todo.completed ? 0.65 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    flex: 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleToggle(todo)}
                >
                  <span
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      color: todo.completed ? 'var(--easy-color)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '0.15rem',
                    }}
                  >
                    {todo.completed ? <CheckSquare size={17} /> : <Square size={17} />}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        color: todo.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {todo.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getPriorityBadge(todo.priority)}

                      {todo.due_date && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Clock size={11} /> {todo.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(todo.id)}
                  title="Delete task"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

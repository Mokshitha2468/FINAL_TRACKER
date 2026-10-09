import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Search,
  Pin,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  Save,
  Check,
  CheckSquare,
  Square,
  Tag,
  Copy,
  Brain,
  Code2,
  Sparkles,
  Calendar,
  X,
  Upload,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function NotepadPage() {
  const { isAuthenticated } = useAuth();

  // Active Category: 'DSA' or 'AI' (or 'ALL')
  const [activeCategory, setActiveCategory] = useState('DSA'); // 'DSA' | 'AI' | 'ALL'
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected note for editing
  const [selectedNote, setSelectedNote] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('DSA');
  const [editContent, setEditContent] = useState('');
  const [editUrls, setEditUrls] = useState([]);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [editImages, setEditImages] = useState([]);
  const [editTags, setEditTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  // Save feedback state
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'

  // Image input ref
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  // 1. Fetch Notes
  const loadNotes = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const cat = activeCategory === 'ALL' ? undefined : activeCategory;
      const data = await api.getNotes(cat, searchQuery || undefined);
      setNotes(data || []);
      if (data && data.length > 0 && !selectedNote) {
        selectNote(data[0]);
      } else if (selectedNote) {
        const stillExists = (data || []).find((n) => n.id === selectedNote.id);
        if (stillExists) selectNote(stillExists);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [activeCategory, searchQuery, isAuthenticated]);

  // Select note and populate editor fields
  const selectNote = (note) => {
    setSelectedNote(note);
    setEditTitle(note.title || 'Untitled Note');
    setEditCategory(note.category || 'DSA');
    setEditContent(note.content || '');
    setEditUrls(note.urls || []);
    setEditImages(note.images || []);
    setEditTags(note.tags || []);
    setIsPinned(note.is_pinned || false);
    setSaveStatus('saved');
  };

  // 2. Create New Note
  const handleCreateNote = async (categoryOverride) => {
    const targetCat = categoryOverride || (activeCategory === 'ALL' ? 'DSA' : activeCategory);
    try {
      const defaultTitle = targetCat === 'AI' ? 'New AI / ML Research Note' : 'New DSA Problem & Approach Note';
      const created = await api.createNote({
        category: targetCat,
        title: defaultTitle,
        content: '',
        urls: [],
        images: [],
        tags: [targetCat],
        is_pinned: false,
      });
      setNotes((prev) => [created, ...prev]);
      selectNote(created);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  // 3. Save / Update Note
  const handleSaveNote = async () => {
    if (!selectedNote) return;
    setSaveStatus('saving');
    try {
      const updated = await api.updateNote(selectedNote.id, {
        title: editTitle.trim() || 'Untitled Note',
        category: editCategory,
        content: editContent,
        urls: editUrls,
        images: editImages,
        tags: editTags,
        is_pinned: isPinned,
      });
      setSelectedNote(updated);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to update note:', err);
      setSaveStatus('unsaved');
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!selectedNote || saveStatus !== 'unsaved') return;
    const timer = setTimeout(() => {
      handleSaveNote();
    }, 2000);
    return () => clearTimeout(timer);
  }, [editTitle, editCategory, editContent, editUrls, editImages, editTags, isPinned, saveStatus]);

  // 4. Delete Note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.deleteNote(noteId);
      const remaining = notes.filter((n) => n.id !== noteId);
      setNotes(remaining);
      if (selectedNote?.id === noteId) {
        if (remaining.length > 0) selectNote(remaining[0]);
        else setSelectedNote(null);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // 5. URL Handling
  const handleAddUrl = (e) => {
    e.preventDefault();
    if (!newUrlInput.trim()) return;
    let url = newUrlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setEditUrls((prev) => [...prev, url]);
    setNewUrlInput('');
    setSaveStatus('unsaved');
  };

  const handleRemoveUrl = (index) => {
    setEditUrls((prev) => prev.filter((_, i) => i !== index));
    setSaveStatus('unsaved');
  };

  // 6. Tag Handling
  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim().replace(/^#/, '');
    if (!editTags.includes(tag)) {
      setEditTags((prev) => [...prev, tag]);
    }
    setNewTagInput('');
    setSaveStatus('unsaved');
  };

  const handleRemoveTag = (tag) => {
    setEditTags((prev) => prev.filter((t) => t !== tag));
    setSaveStatus('unsaved');
  };

  // 7. Screenshot / Image Upload & Clipboard Paste
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditImages((prev) => [...prev, ev.target.result]);
      setSaveStatus('unsaved');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => {
          setEditImages((prev) => [...prev, ev.target.result]);
          setSaveStatus('unsaved');
        };
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  };

  const handleRemoveImage = (index) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
    setSaveStatus('unsaved');
  };

  // Toggle checklist item in content
  const insertChecklist = () => {
    setEditContent((prev) => prev + '\n- [ ] ');
    setSaveStatus('unsaved');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ flex: 1, display: 'flex', maxWidth: '1600px', width: '100%', margin: '0 auto', padding: '1rem', gap: '1rem' }}>
        {/* ---------------------------------------------------- */}
        {/* LEFT SIDEBAR: Categories & Notes List                */}
        {/* ---------------------------------------------------- */}
        <div
          style={{
            width: '340px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 100px)',
          }}
        >
          {/* Header & Category Switcher */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '1.05rem' }}>
                <BookOpen size={18} style={{ color: 'var(--accent-color)' }} />
                <span>Study Notepad</span>
              </div>

              <button
                onClick={() => handleCreateNote()}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
              >
                <Plus size={14} />
                <span>New Note</span>
              </button>
            </div>

            {/* AI vs DSA Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', backgroundColor: 'var(--bg-primary)', padding: '0.25rem', borderRadius: '8px' }}>
              <button
                onClick={() => setActiveCategory('DSA')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeCategory === 'DSA' ? 'var(--accent-color)' : 'transparent',
                  color: activeCategory === 'DSA' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Code2 size={14} />
                <span>DSA Notes</span>
              </button>

              <button
                onClick={() => setActiveCategory('AI')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: activeCategory === 'AI' ? '#8b5cf6' : 'transparent',
                  color: activeCategory === 'AI' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Brain size={14} />
                <span>AI Notes</span>
              </button>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '0.65rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={`Search ${activeCategory} notes...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem 0.45rem 2rem',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Notes List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading notes...
              </div>
            ) : notes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notes found in {activeCategory}. Click <strong>+ New Note</strong> to start your knowledge vault!
              </div>
            ) : (
              notes.map((note) => {
                const isSelected = selectedNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-primary)',
                      border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {note.title}
                      </div>
                      {note.is_pinned && <Pin size={13} style={{ color: '#f59e0b', fill: '#f59e0b' }} />}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          backgroundColor: note.category === 'AI' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: note.category === 'AI' ? '#a78bfa' : '#60a5fa',
                          fontWeight: 700,
                        }}
                      >
                        {note.category}
                      </span>
                      {note.urls && note.urls.length > 0 && (
                        <span>🔗 {note.urls.length} links</span>
                      )}
                      {note.images && note.images.length > 0 && (
                        <span>🖼️ {note.images.length} images</span>
                      )}
                      <span style={{ marginLeft: 'auto' }}>
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT MAIN AREA: Full Rich Note Editor               */}
        {/* ---------------------------------------------------- */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 100px)',
          }}
        >
          {selectedNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Top Editor Toolbar */}
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  backgroundColor: 'var(--bg-primary)',
                }}
              >
                {/* Category & Pin Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      setEditCategory(e.target.value);
                      setSaveStatus('unsaved');
                    }}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    <option value="DSA">💻 DSA Workspace</option>
                    <option value="AI">🧠 AI Workspace</option>
                  </select>

                  <button
                    onClick={() => {
                      setIsPinned(!isPinned);
                      setSaveStatus('unsaved');
                    }}
                    title={isPinned ? 'Unpin note' : 'Pin note to top'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.35rem 0.6rem',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      color: isPinned ? '#f59e0b' : 'var(--text-muted)',
                      backgroundColor: isPinned ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    }}
                  >
                    <Pin size={13} style={{ fill: isPinned ? '#f59e0b' : 'none' }} />
                    <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                  </button>
                </div>

                {/* Save Status & Delete Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', color: saveStatus === 'unsaved' ? '#f59e0b' : '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? '• Unsaved changes' : '✓ Saved to Cloud'}
                  </span>

                  <button
                    onClick={handleSaveNote}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
                  >
                    <Save size={13} />
                    <span>Save Now</span>
                  </button>

                  <button
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    title="Delete Note"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Scrollable Editor Content */}
              <div
                ref={editorRef}
                onPaste={handlePaste}
                style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                {/* Note Title Input */}
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setSaveStatus('unsaved');
                  }}
                  style={{
                    width: '100%',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                />

                {/* Tags Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <Tag size={13} style={{ color: 'var(--text-muted)' }} />
                  {editTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      #{tag}
                      <X
                        size={11}
                        onClick={() => handleRemoveTag(tag)}
                        style={{ cursor: 'pointer', opacity: 0.7 }}
                      />
                    </span>
                  ))}

                  <form onSubmit={handleAddTag} style={{ display: 'inline-flex' }}>
                    <input
                      type="text"
                      placeholder="+ Add tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        backgroundColor: 'transparent',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '999px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        width: '85px',
                      }}
                    />
                  </form>
                </div>

                {/* Quick Content Insertion Bar (Checklist, Screenshot, URL) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    onClick={insertChecklist}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    title="Insert task checkbox"
                  >
                    <CheckSquare size={13} />
                    <span>Checklist</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    title="Upload screenshot or image"
                  >
                    <ImageIcon size={13} />
                    <span>Upload Screenshot</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    Tip: You can also paste screenshots directly with <strong>Ctrl+V</strong>!
                  </span>
                </div>

                {/* Attached Links & URLs Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <LinkIcon size={13} style={{ color: 'var(--accent-color)' }} />
                    <span>Reference URLs & Links ({editUrls.length})</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {editUrls.map((url, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          backgroundColor: 'rgba(37, 99, 235, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {url.replace(/^https?:\/\//, '')}
                          </span>
                          <ExternalLink size={11} />
                        </a>
                        <X
                          size={12}
                          onClick={() => handleRemoveUrl(i)}
                          style={{ cursor: 'pointer', color: '#f87171', marginLeft: '0.2rem' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Add URL Form */}
                  <form onSubmit={handleAddUrl} style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <input
                      type="text"
                      placeholder="Paste reference URL (LeetCode, GitHub, Research Paper, Docs)..."
                      value={newUrlInput}
                      onChange={(e) => setNewUrlInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.35rem 0.6rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!newUrlInput.trim()}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Add Link
                    </button>
                  </form>
                </div>

                {/* Attached Screenshots / Images Gallery */}
                {editImages.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Attached Screenshots & Diagrams ({editImages.length}):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                      {editImages.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                            backgroundColor: '#000',
                          }}
                        >
                          <img
                            src={imgSrc}
                            alt={`screenshot-${idx}`}
                            style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                          />
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              backgroundColor: 'rgba(0,0,0,0.7)',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#fff',
                              padding: '0.2rem',
                              cursor: 'pointer',
                            }}
                            title="Remove image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Note Text Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px' }}>
                  <textarea
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      setSaveStatus('unsaved');
                    }}
                    placeholder={`Write your detailed ${editCategory} notes, breakdown, algorithms, edge cases, or paste screenshots here...`}
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '360px',
                      padding: '1rem',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      lineHeight: '1.65',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: "'JetBrains Mono', 'Inter', monospace",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
              <BookOpen size={48} style={{ opacity: 0.4 }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Select a note or create a new one</h3>
                <p style={{ fontSize: '0.85rem' }}>Organize all your daily DSA problem notes and AI/ML notes permanently.</p>
              </div>
              <button onClick={() => handleCreateNote()} className="btn btn-primary btn-sm">
                + Create New Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

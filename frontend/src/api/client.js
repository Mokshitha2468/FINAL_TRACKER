const API_BASE = '/api';

/**
 * Universal fetch wrapper that automatically attaches the JWT Bearer token
 * and handles HTTP error responses.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || response.statusText || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Authentication
  login: (username_or_email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
    }),

  register: (username, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  getMe: () => request('/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Problems & Dashboard
  getSummary: (track = 'DSA') => request(`/problems/summary?track=${encodeURIComponent(track)}`),

  getProblems: (params = {}) => {
    const query = new URLSearchParams();
    if (params.track) query.append('track', params.track);
    if (params.topic) query.append('topic', params.topic);
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.subtopic) query.append('subtopic', params.subtopic);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    return request(`/problems?${query.toString()}`);
  },

  toggleProblem: (position, track = 'DSA') =>
    request(`/problems/${position}/toggle?track=${encodeURIComponent(track)}`, {
      method: 'POST',
    }),

  // Manual Problem Logging & Spaced Repetition Revisions
  logProblem: (logData) =>
    request('/revisions/log', {
      method: 'POST',
      body: JSON.stringify(logData),
    }),

  getRevisions: (filterType) => {
    const query = filterType ? `?filter=${encodeURIComponent(filterType)}` : '';
    return request(`/revisions${query}`);
  },

  completeRevision: (revisionId) =>
    request(`/revisions/${encodeURIComponent(revisionId)}/complete`, {
      method: 'POST',
    }),

  // Planly — Study Planner & Schedule Generator
  getPlannerSettings: (track = 'DSA') =>
    request(`/planner/settings?track=${encodeURIComponent(track)}`),

  savePlannerSettings: (settingsData, track = 'DSA') =>
    request(`/planner/settings?track=${encodeURIComponent(track)}`, {
      method: 'POST',
      body: JSON.stringify(settingsData),
    }),

  generateSchedule: (track = 'DSA') =>
    request(`/planner/generate?track=${encodeURIComponent(track)}`, {
      method: 'POST',
    }),

  getSchedule: (track = 'DSA') =>
    request(`/planner/schedule?track=${encodeURIComponent(track)}`),

  getTodayPlan: (track = 'DSA') =>
    request(`/planner/today?track=${encodeURIComponent(track)}`),

  getNextUnsolved: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.topic) query.append('topic', params.topic);
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.track) query.append('track', params.track || 'DSA');
    return request(`/planner/next-unsolved?${query.toString()}`);
  },

  // Separate TODO System
  getTodos: (params = {}) => {
    const query = new URLSearchParams();
    if (params.completed !== undefined && params.completed !== null && params.completed !== '') {
      query.append('completed', params.completed);
    }
    if (params.priority) query.append('priority', params.priority);
    const qs = query.toString();
    return request(`/todos${qs ? `?${qs}` : ''}`);
  },

  createTodo: (todoData) =>
    request('/todos', {
      method: 'POST',
      body: JSON.stringify(todoData),
    }),

  updateTodo: (todoId, updateData) =>
    request(`/todos/${encodeURIComponent(todoId)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }),

  deleteTodo: (todoId) =>
    request(`/todos/${encodeURIComponent(todoId)}`, {
      method: 'DELETE',
    }),

  // Problem of the Day (POTD)
  getTodayPOTD: (date) => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return request(`/potd/today${query}`);
  },

  completeTodayPOTD: (date) => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return request(`/potd/today/complete${query}`, {
      method: 'POST',
    });
  },

  // Contests Engine
  getContests: (platform) => {
    const query = platform ? `?platform=${encodeURIComponent(platform)}` : '';
    return request(`/contests${query}`);
  },

  toggleContestBookmark: (contestId) =>
    request(`/contests/${encodeURIComponent(contestId)}/bookmark`, {
      method: 'POST',
    }),

  // Timed Mock Exam Simulator
  createExam: (examData) =>
    request('/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    }),

  getActiveExam: () => request('/exams/active'),

  submitExam: (examId, submitData) =>
    request(`/exams/${encodeURIComponent(examId)}/submit`, {
      method: 'POST',
      body: JSON.stringify(submitData),
    }),

  getExamHistory: () => request('/exams/history'),

  // LeetCode Vault & Auto-Sync
  getLeetCodeProfile: () => request('/sync/leetcode/profile'),

  saveLeetCodeUsername: (username) =>
    request('/sync/leetcode/username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  syncLeetCodeFull: (username, sessionCookie) =>
    request('/sync/leetcode/sync', {
      method: 'POST',
      body: JSON.stringify({
        ...(username ? { username } : {}),
        ...(sessionCookie ? { session_cookie: sessionCookie } : {}),
      }),
    }),

  syncLeetCode: (username, sessionCookie) =>
    request('/sync/leetcode/sync', {
      method: 'POST',
      body: JSON.stringify({
        ...(username ? { username } : {}),
        ...(sessionCookie ? { session_cookie: sessionCookie } : {}),
      }),
    }),

  getLeetCodeProblems: (params = {}) => {
    const query = new URLSearchParams();
    if (params.needs_revision !== undefined && params.needs_revision !== null) {
      query.append('needs_revision', params.needs_revision);
    }
    if (params.today_only !== undefined && params.today_only !== null) {
      query.append('today_only', params.today_only);
    }
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return request(`/sync/leetcode/problems${qs ? `?${qs}` : ''}`);
  },

  updateLeetCodeProblem: (slug, data) =>
    request(`/sync/leetcode/problems/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Infinite Whiteboard Engine
  getWhiteboards: () => request('/whiteboard'),

  createWhiteboard: (data = {}) =>
    request('/whiteboard', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getWhiteboard: (boardId) =>
    request(`/whiteboard/${encodeURIComponent(boardId)}`),

  updateWhiteboard: (boardId, data) =>
    request(`/whiteboard/${encodeURIComponent(boardId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteWhiteboard: (boardId) =>
    request(`/whiteboard/${encodeURIComponent(boardId)}`, {
      method: 'DELETE',
    }),

  // Permanent Notepad Engine (AI & DSA Workspaces)
  getNotes: (category, search) => {
    const query = new URLSearchParams();
    if (category) query.append('category', category);
    if (search) query.append('search', search);
    const qs = query.toString();
    return request(`/notes${qs ? `?${qs}` : ''}`);
  },

  getNote: (noteId) => request(`/notes/${encodeURIComponent(noteId)}`),

  createNote: (noteData) =>
    request('/notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    }),

  updateNote: (noteId, noteData) =>
    request(`/notes/${encodeURIComponent(noteId)}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    }),

  deleteNote: (noteId) =>
    request(`/notes/${encodeURIComponent(noteId)}`, {
      method: 'DELETE',
    }),
};


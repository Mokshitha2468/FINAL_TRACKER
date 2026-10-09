import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import rough from 'roughjs';
import {
  ArrowLeft,
  MousePointer,
  Square,
  Diamond,
  Circle,
  MoveRight,
  Minus,
  Pen,
  Type,
  Eraser,
  Hand,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Save,
  Download,
  Trash2,
  FolderOpen,
  Plus,
  Check,
  CheckSquare,
  Square as SquareOutline,
  ClipboardList,
  ExternalLink,
  X,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STROKE_COLORS = [
  { label: 'Black', value: '#1e1e1e' },
  { label: 'White', value: '#f8fafc' },
  { label: 'Red', value: '#e03131' },
  { label: 'Green', value: '#2f9e44' },
  { label: 'Blue', value: '#1971c2' },
  { label: 'Orange', value: '#f08c00' },
  { label: 'Purple', value: '#9c36b5' },
];

const FILL_COLORS = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'Soft Red', value: 'rgba(255, 199, 199, 0.45)' },
  { label: 'Soft Green', value: 'rgba(195, 240, 203, 0.45)' },
  { label: 'Soft Blue', value: 'rgba(208, 235, 255, 0.45)' },
  { label: 'Soft Orange', value: 'rgba(255, 236, 179, 0.45)' },
  { label: 'Soft Purple', value: 'rgba(238, 210, 255, 0.45)' },
];

export default function WhiteboardPage() {
  const { isAuthenticated } = useAuth();

  // Canvas Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Whiteboards management
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [activeBoardTitle, setActiveBoardTitle] = useState('My Excali Canvas');
  const [isBoardsMenuOpen, setIsBoardsMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'

  // Canvas Viewport (Infinite pan & zoom)
  const [viewport, setViewport] = useState({ panX: 0, panY: 0, zoom: 1.0 });

  // Tools & Properties
  // 'selection' | 'rectangle' | 'diamond' | 'ellipse' | 'arrow' | 'line' | 'pencil' | 'text' | 'eraser' | 'hand'
  const [activeTool, setActiveTool] = useState('pencil');
  const [strokeColor, setStrokeColor] = useState('#1e1e1e');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(3.5);
  const [roughness, setRoughness] = useState(1.5);
  const [fontSize, setFontSize] = useState(32);
  const [canvasTheme, setCanvasTheme] = useState('light'); // 'light' | 'dark'

  // Elements & Selection
  const [elements, setElements] = useState([]);
  const elementsRef = useRef([]);
  elementsRef.current = elements;
  const [selectedId, setSelectedId] = useState(null);

  // History for Undo / Redo
  const [history, setHistory] = useState([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Text Prompt Modal / Inline Editor
  const [textModal, setTextModal] = useState(null); // { x, y, screenX, screenY, text, id, isEdit }
  const textInputRef = useRef(null);

  // Daily Tasks Drawer
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notepadTab, setNotepadTab] = useState('tasks');
  const [todos, setTodos] = useState([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState('medium');
  const [todoFilter, setTodoFilter] = useState('all');
  const [quickNotes, setQuickNotes] = useState(() => localStorage.getItem('whiteboard_quick_notes') || '');

  // Pointer tracking
  const isInteracting = useRef(false);
  const actionType = useRef(null); // 'drawing' | 'shape_create' | 'moving' | 'panning'
  const pointerStart = useRef({ clientX: 0, clientY: 0, worldX: 0, worldY: 0 });
  const activeDraftElement = useRef(null);
  const dragStartPositions = useRef({}); // Stores initial pos of element when dragging starts

  // Coordinate transforms
  const screenToWorld = useCallback((clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - viewport.panX) / viewport.zoom,
      y: (sy - viewport.panY) / viewport.zoom,
    };
  }, [viewport]);

  const worldToScreen = useCallback((wx, wy) => {
    return {
      x: wx * viewport.zoom + viewport.panX,
      y: wy * viewport.zoom + viewport.panY,
    };
  }, [viewport]);

  const pushHistory = useCallback((newElements) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIdx + 1);
      return [...upToCurrent, newElements];
    });
    setHistoryIdx((prev) => prev + 1);
    setSaveStatus('unsaved');
  }, [historyIdx]);

  // ----------------------------------------------------
  // Canvas Rendering with RoughJS
  // ----------------------------------------------------
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = canvasTheme === 'dark' ? '#121212' : '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid dots
    ctx.save();
    ctx.fillStyle = canvasTheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)';
    const gridSize = 24 * viewport.zoom;
    const startX = ((viewport.panX % gridSize) + gridSize) % gridSize;
    const startY = ((viewport.panY % gridSize) + gridSize) % gridSize;
    for (let x = startX; x < width; x += gridSize) {
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Viewport transform
    ctx.translate(viewport.panX, viewport.panY);
    ctx.scale(viewport.zoom, viewport.zoom);

    const rc = rough.canvas(canvas);
    const allToDraw = [...elementsRef.current];
    if (activeDraftElement.current) {
      allToDraw.push(activeDraftElement.current);
    }

    allToDraw.forEach((el) => {
      ctx.save();
      ctx.globalAlpha = (el.opacity ?? 100) / 100;

      const opts = {
        stroke: el.strokeColor || '#1e1e1e',
        strokeWidth: el.strokeWidth || 3.5,
        roughness: el.roughness ?? 1.5,
        bowing: 1.5,
        seed: el.seed || 1,
        fill: el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : undefined,
        fillStyle: 'hachure',
        hachureAngle: 60,
        hachureGap: 6,
      };

      if (el.type === 'rectangle') {
        rc.rectangle(el.x, el.y, el.width, el.height, opts);
      } else if (el.type === 'diamond') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        rc.polygon(
          [
            [cx, el.y],
            [el.x + el.width, cy],
            [cx, el.y + el.height],
            [el.x, cy],
          ],
          opts
        );
      } else if (el.type === 'ellipse') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        rc.ellipse(cx, cy, Math.abs(el.width), Math.abs(el.height), opts);
      } else if (el.type === 'line') {
        rc.line(el.x1, el.y1, el.x2, el.y2, opts);
      } else if (el.type === 'arrow') {
        rc.line(el.x1, el.y1, el.x2, el.y2, opts);
        const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
        const headLen = Math.max(14, (el.strokeWidth || 3) * 4);
        const h1x = el.x2 - headLen * Math.cos(angle - Math.PI / 6);
        const h1y = el.y2 - headLen * Math.sin(angle - Math.PI / 6);
        const h2x = el.x2 - headLen * Math.cos(angle + Math.PI / 6);
        const h2y = el.y2 - headLen * Math.sin(angle + Math.PI / 6);
        rc.line(el.x2, el.y2, h1x, h1y, opts);
        rc.line(el.x2, el.y2, h2x, h2y, opts);
      } else if (el.type === 'pencil' && el.points && el.points.length > 1) {
        ctx.strokeStyle = el.strokeColor || '#1e1e1e';
        ctx.lineWidth = el.strokeWidth || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(el.points[0][0], el.points[0][1]);
        for (let i = 1; i < el.points.length; i++) {
          const xc = (el.points[i][0] + el.points[i - 1][0]) / 2;
          const yc = (el.points[i][1] + el.points[i - 1][1]) / 2;
          ctx.quadraticCurveTo(el.points[i - 1][0], el.points[i - 1][1], xc, yc);
        }
        ctx.stroke();
      } else if (el.type === 'text') {
        const textDrawColor =
          canvasTheme === 'dark' && (el.strokeColor === '#1e1e1e' || !el.strokeColor)
            ? '#f8fafc'
            : canvasTheme === 'light' && (el.strokeColor === '#ffffff' || el.strokeColor === '#f8fafc')
            ? '#1e1e1e'
            : el.strokeColor || '#1e1e1e';

        ctx.font = `600 ${el.fontSize || 32}px 'Caveat', cursive`;
        ctx.fillStyle = textDrawColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const lines = (el.text || '').split('\n');
        const lHeight = (el.fontSize || 32) * 1.25;
        lines.forEach((line, idx) => {
          ctx.fillText(line, el.x, el.y + idx * lHeight);
        });
      }

      // Selection bounding box with handles
      if (el.id === selectedId) {
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5 / viewport.zoom;
        ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
        const box = getElementBounds(el);
        const pad = 6 / viewport.zoom;
        const bw = box.maxX - box.minX + pad * 2;
        const bh = box.maxY - box.minY + pad * 2;
        const bx = box.minX - pad;
        const by = box.minY - pad;
        ctx.strokeRect(bx, by, bw, bh);

        // Corner handles
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5 / viewport.zoom;
        ctx.setLineDash([]);
        const hSize = 8 / viewport.zoom;
        const corners = [
          [bx - hSize / 2, by - hSize / 2],
          [bx + bw - hSize / 2, by - hSize / 2],
          [bx - hSize / 2, by + bh - hSize / 2],
          [bx + bw - hSize / 2, by + bh - hSize / 2],
        ];
        corners.forEach(([cx, cy]) => {
          ctx.fillRect(cx, cy, hSize, hSize);
          ctx.strokeRect(cx, cy, hSize, hSize);
        });

        // Top rotation handle circle
        const rotY = by - 16 / viewport.zoom;
        const rotX = bx + bw / 2;
        ctx.beginPath();
        ctx.arc(rotX, rotY, 4 / viewport.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    });

    ctx.restore();
  }, [viewport, canvasTheme, selectedId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, elements, selectedId]);

  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // Bounds & Hit Detection
  function getElementBounds(el) {
    if (el.type === 'rectangle' || el.type === 'diamond' || el.type === 'ellipse') {
      const minX = Math.min(el.x, el.x + el.width);
      const maxX = Math.max(el.x, el.x + el.width);
      const minY = Math.min(el.y, el.y + el.height);
      const maxY = Math.max(el.y, el.y + el.height);
      return { minX, minY, maxX, maxY };
    }
    if (el.type === 'line' || el.type === 'arrow') {
      return {
        minX: Math.min(el.x1, el.x2),
        minY: Math.min(el.y1, el.y2),
        maxX: Math.max(el.x1, el.x2),
        maxY: Math.max(el.y1, el.y2),
      };
    }
    if (el.type === 'pencil' && el.points && el.points.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      el.points.forEach(([px, py]) => {
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      });
      return { minX, minY, maxX, maxY };
    }
    if (el.type === 'text') {
      const lines = (el.text || '').split('\n');
      const maxLen = lines.reduce((acc, l) => Math.max(acc, l.length), 0);
      const width = Math.max(40, maxLen * (el.fontSize || 32) * 0.55);
      const height = lines.length * (el.fontSize || 32) * 1.25;
      return { minX: el.x, minY: el.y, maxX: el.x + width, maxY: el.y + height };
    }
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  function hitTest(el, wx, wy) {
    const box = getElementBounds(el);
    const pad = 10;
    return (
      wx >= box.minX - pad &&
      wx <= box.maxX + pad &&
      wy >= box.minY - pad &&
      wy <= box.maxY + pad
    );
  }

  // ----------------------------------------------------
  // Pointer Event Handlers
  // ----------------------------------------------------
  const handlePointerDown = (e) => {
    if (e.button === 1 || activeTool === 'hand' || e.spaceKey) {
      isInteracting.current = true;
      actionType.current = 'panning';
      pointerStart.current = { clientX: e.clientX, clientY: e.clientY };
      return;
    }

    if (e.button !== 0) return;

    const world = screenToWorld(e.clientX, e.clientY);
    const clicked = [...elements].reverse().find((el) => hitTest(el, world.x, world.y));

    // Deselect if clicking on empty space
    if (!clicked) {
      setSelectedId(null);
    }

    isInteracting.current = true;
    pointerStart.current = { clientX: e.clientX, clientY: e.clientY, worldX: world.x, worldY: world.y };

    // Move element when clicked with selection tool OR when clicking an existing selected element
    if (activeTool === 'selection' || clicked) {
      if (clicked) {
        setSelectedId(clicked.id);
        actionType.current = 'moving';
        // Store element state for dragging
        dragStartPositions.current = {
          element: clicked,
          startX: world.x,
          startY: world.y,
        };
        return;
      }
      actionType.current = null;
      return;
    }

    if (activeTool === 'eraser') {
      if (clicked) {
        const next = elements.filter((el) => el.id !== clicked.id);
        setElements(next);
        pushHistory(next);
      }
      actionType.current = 'erasing';
      return;
    }

    if (activeTool === 'text') {
      // Open text creation modal
      setTextModal({
        x: world.x,
        y: world.y,
        text: '',
        id: 'txt_' + Date.now(),
        isEdit: false,
      });
      isInteracting.current = false;
      return;
    }

    if (activeTool === 'pencil') {
      actionType.current = 'drawing';
      activeDraftElement.current = {
        id: 'pen_' + Date.now(),
        type: 'pencil',
        points: [[world.x, world.y]],
        strokeColor: canvasTheme === 'dark' && strokeColor === '#1e1e1e' ? '#f8fafc' : strokeColor,
        strokeWidth,
        seed: Math.floor(Math.random() * 2147483647),
      };
      renderCanvas();
      return;
    }

    if (['rectangle', 'diamond', 'ellipse', 'line', 'arrow'].includes(activeTool)) {
      actionType.current = 'shape_create';
      const base = {
        id: 'shape_' + Date.now(),
        type: activeTool,
        strokeColor: canvasTheme === 'dark' && strokeColor === '#1e1e1e' ? '#f8fafc' : strokeColor,
        fillColor,
        strokeWidth,
        roughness,
        seed: Math.floor(Math.random() * 2147483647),
      };
      if (activeTool === 'line' || activeTool === 'arrow') {
        activeDraftElement.current = {
          ...base,
          x1: world.x,
          y1: world.y,
          x2: world.x,
          y2: world.y,
        };
      } else {
        activeDraftElement.current = {
          ...base,
          x: world.x,
          y: world.y,
          width: 0,
          height: 0,
        };
      }
      renderCanvas();
    }
  };

  const handlePointerMove = (e) => {
    if (!isInteracting.current) return;

    if (actionType.current === 'panning') {
      const dx = e.clientX - pointerStart.current.clientX;
      const dy = e.clientY - pointerStart.current.clientY;
      pointerStart.current = { clientX: e.clientX, clientY: e.clientY };
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }));
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    if (actionType.current === 'drawing' && activeDraftElement.current) {
      activeDraftElement.current.points.push([world.x, world.y]);
      renderCanvas();
      return;
    }

    if (actionType.current === 'shape_create' && activeDraftElement.current) {
      const el = activeDraftElement.current;
      if (el.type === 'line' || el.type === 'arrow') {
        el.x2 = world.x;
        el.y2 = world.y;
      } else {
        el.width = world.x - pointerStart.current.worldX;
        el.height = world.y - pointerStart.current.worldY;
      }
      renderCanvas();
      return;
    }

    // Moving elements freely
    if (actionType.current === 'moving' && selectedId) {
      const dx = world.x - pointerStart.current.worldX;
      const dy = world.y - pointerStart.current.worldY;
      pointerStart.current.worldX = world.x;
      pointerStart.current.worldY = world.y;

      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedId) return el;
          if (el.type === 'line' || el.type === 'arrow') {
            return {
              ...el,
              x1: el.x1 + dx,
              y1: el.y1 + dy,
              x2: el.x2 + dx,
              y2: el.y2 + dy,
            };
          }
          if (el.type === 'pencil') {
            return {
              ...el,
              points: el.points.map(([px, py]) => [px + dx, py + dy]),
            };
          }
          return { ...el, x: el.x + dx, y: el.y + dy };
        })
      );
    }
  };

  const handlePointerUp = () => {
    if (!isInteracting.current) return;
    isInteracting.current = false;

    if (activeDraftElement.current) {
      const drafted = activeDraftElement.current;
      activeDraftElement.current = null;

      let isValid = true;
      if (drafted.type === 'pencil' && drafted.points.length < 2) isValid = false;
      if (['rectangle', 'diamond', 'ellipse'].includes(drafted.type)) {
        if (Math.abs(drafted.width) < 5 && Math.abs(drafted.height) < 5) isValid = false;
      }
      if (['line', 'arrow'].includes(drafted.type)) {
        const dist = Math.hypot(drafted.x2 - drafted.x1, drafted.y2 - drafted.y1);
        if (dist < 5) isValid = false;
      }

      if (isValid) {
        if (['rectangle', 'diamond', 'ellipse'].includes(drafted.type)) {
          if (drafted.width < 0) {
            drafted.x += drafted.width;
            drafted.width = Math.abs(drafted.width);
          }
          if (drafted.height < 0) {
            drafted.y += drafted.height;
            drafted.height = Math.abs(drafted.height);
          }
        }
        const updated = [...elements, drafted];
        setElements(updated);
        pushHistory(updated);
        // Do not auto-select newly drawn shapes (avoids stuck purple box)
        setSelectedId(null);
      } else {
        renderCanvas();
      }
    }

    if (actionType.current === 'moving') {
      pushHistory(elementsRef.current);
    }

    actionType.current = null;
  };

  // Wheel Infinite Scroll Pan (Scroll down moves down)
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.15), 5.0);
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewport((prev) => ({
        zoom: newZoom,
        panX: mouseX - (mouseX - prev.panX) * (newZoom / prev.zoom),
        panY: mouseY - (mouseY - prev.panY) * (newZoom / prev.zoom),
      }));
    } else {
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX - (e.shiftKey ? e.deltaY : e.deltaX),
        panY: prev.panY + (e.shiftKey ? 0 : e.deltaY), // Downward infinite scroll
      }));
    }
  };

  // Commit text
  const handleSaveTextModal = () => {
    if (!textModal) return;
    const clean = textModal.text.trim();
    if (clean) {
      const resolvedColor =
        canvasTheme === 'dark' && (strokeColor === '#1e1e1e' || strokeColor === '#000000')
          ? '#f8fafc'
          : canvasTheme === 'light' && strokeColor === '#ffffff'
          ? '#1e1e1e'
          : strokeColor;

      const newEl = {
        id: textModal.id,
        type: 'text',
        x: textModal.x,
        y: textModal.y,
        text: textModal.text,
        fontSize,
        strokeColor: resolvedColor,
      };

      const updated = textModal.isEdit
        ? elements.map((el) => (el.id === textModal.id ? newEl : el))
        : [...elements, newEl];

      setElements(updated);
      pushHistory(updated);
      setSelectedId(newEl.id);
    }
    setTextModal(null);
  };

  // Undo / Redo / Delete
  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const targetIdx = historyIdx - 1;
      setHistoryIdx(targetIdx);
      setElements(history[targetIdx]);
      setSelectedId(null);
      setSaveStatus('unsaved');
    }
  }, [historyIdx, history]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const targetIdx = historyIdx + 1;
      setHistoryIdx(targetIdx);
      setElements(history[targetIdx]);
      setSelectedId(null);
      setSaveStatus('unsaved');
    }
  }, [historyIdx, history]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const updated = elements.filter((el) => el.id !== selectedId);
    setElements(updated);
    pushHistory(updated);
    setSelectedId(null);
  }, [selectedId, elements, pushHistory]);

  // Backend persistence
  const loadBoards = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getWhiteboards();
      setBoards(data || []);
      if (data && data.length > 0 && !activeBoardId) {
        loadBoardDetail(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
    }
  };

  const loadBoardDetail = async (id) => {
    try {
      const b = await api.getWhiteboard(id);
      setActiveBoardId(b.id);
      setActiveBoardTitle(b.title);
      setElements(b.elements || []);
      setHistory([b.elements || []]);
      setHistoryIdx(0);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to load board details:', err);
    }
  };

  const handleSaveBoard = async () => {
    if (!activeBoardId) return;
    setSaveStatus('saving');
    try {
      await api.updateWhiteboard(activeBoardId, {
        title: activeBoardTitle,
        elements,
        viewport,
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('unsaved');
    }
  };

  useEffect(() => {
    loadBoards();
  }, [isAuthenticated]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: canvasTheme === 'dark' ? '#121212' : '#ffffff',
        color: canvasTheme === 'dark' ? '#f1f5f9' : '#1e1e1e',
        userSelect: 'none',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* TOP NOTIFICATION: OPEN NATIVE EXCALIDRAW IN NEW TAB  */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 45,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          backgroundColor: canvasTheme === 'dark' ? '#1e293b' : '#f8fafc',
          border: `1px solid ${canvasTheme === 'dark' ? '#334155' : '#cbd5e1'}`,
          borderRadius: '999px',
          padding: '0.35rem 0.95rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          fontSize: '0.78rem',
        }}
      >
        <span style={{ color: canvasTheme === 'dark' ? '#94a3b8' : '#64748b' }}>
          Need 100% full Excalidraw tools?
        </span>
        <a
          href="https://excalidraw.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: '#6366f1',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <span>Open Excalidraw in New Tab</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TOP BAR: Navigation, Title & Centered Toolbar        */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      >
        {/* Left: Back Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', pointerEvents: 'auto' }}>
          <Link
            to="/"
            title="Back to Curriculum"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: canvasTheme === 'dark' ? '#1e1e1e' : '#ffffff',
              border: `1px solid ${canvasTheme === 'dark' ? '#333' : '#e2e8f0'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              color: canvasTheme === 'dark' ? '#fff' : '#1e1e1e',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{activeBoardTitle}</span>
        </div>

        {/* Center: Iconic Excalidraw Floating Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem',
            padding: '0.25rem 0.4rem',
            borderRadius: '10px',
            backgroundColor: canvasTheme === 'dark' ? '#1e1e1e' : '#ffffff',
            border: `1px solid ${canvasTheme === 'dark' ? '#333' : '#e2e8f0'}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            pointerEvents: 'auto',
            marginTop: '34px',
          }}
        >
          {[
            { id: 'selection', icon: MousePointer, label: 'Selection / Move (V)' },
            { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
            { id: 'diamond', icon: Diamond, label: 'Diamond (D)' },
            { id: 'ellipse', icon: Circle, label: 'Ellipse (O)' },
            { id: 'arrow', icon: MoveRight, label: 'Arrow (A)' },
            { id: 'line', icon: Minus, label: 'Line (L)' },
            { id: 'pencil', icon: Pen, label: 'Draw / Pen (P)' },
            { id: 'text', icon: Type, label: 'Handwritten Text (T)' },
            { id: 'eraser', icon: Eraser, label: 'Eraser (E)' },
            { id: 'hand', icon: Hand, label: 'Pan / Hand (H)' },
          ].map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id !== 'selection') setSelectedId(null);
                }}
                title={tool.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? '#6366f1' : 'transparent',
                  color: isActive ? '#ffffff' : canvasTheme === 'dark' ? '#cbd5e1' : '#475569',
                  cursor: 'pointer',
                }}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        {/* Right: Save & Tasks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto' }}>
          <button
            onClick={() => setIsNotepadOpen(!isNotepadOpen)}
            title="Open Daily Tasks Notepad"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0 0.65rem',
              height: '36px',
              borderRadius: '8px',
              border: isNotepadOpen ? '1px solid #6366f1' : `1px solid ${canvasTheme === 'dark' ? '#333' : '#e2e8f0'}`,
              backgroundColor: isNotepadOpen ? 'rgba(99, 102, 241, 0.15)' : canvasTheme === 'dark' ? '#1e1e1e' : '#fff',
              color: isNotepadOpen ? '#6366f1' : 'inherit',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
            }}
          >
            <ClipboardList size={16} />
            <span>Tasks</span>
          </button>

          <button
            onClick={handleSaveBoard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: canvasTheme === 'dark' ? '#1e1e1e' : '#ffffff',
              border: `1px solid ${canvasTheme === 'dark' ? '#333' : '#e2e8f0'}`,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <Save size={15} />
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Save' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MAIN INTERACTIVE CANVAS                              */}
      {/* ---------------------------------------------------- */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor:
            activeTool === 'hand'
              ? 'grab'
              : activeTool === 'selection'
              ? 'default'
              : activeTool === 'text'
              ? 'text'
              : 'crosshair',
        }}
      />

      {/* ---------------------------------------------------- */}
      {/* TEXT CREATION MODAL OVERLAY                          */}
      {/* ---------------------------------------------------- */}
      {textModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setTextModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '380px',
              backgroundColor: canvasTheme === 'dark' ? '#1e293b' : '#ffffff',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Add Handwritten Text</span>
              <button
                onClick={() => setTextModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#888' }}
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              autoFocus
              value={textModal.text}
              onChange={(e) => setTextModal((prev) => ({ ...prev, text: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveTextModal();
                }
              }}
              placeholder="Type your handwritten note here... (Enter to place)"
              style={{
                width: '100%',
                minHeight: '90px',
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '1.2rem',
                fontFamily: "'Caveat', cursive",
                color: canvasTheme === 'dark' ? '#fff' : '#1e1e1e',
                backgroundColor: canvasTheme === 'dark' ? '#0f172a' : '#f8fafc',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setTextModal(null)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'transparent',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTextModal}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Place Text ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* BOTTOM-LEFT CONTROLS: Zoom, Undo, Redo, Delete       */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.45rem',
          borderRadius: '10px',
          backgroundColor: canvasTheme === 'dark' ? '#1e1e1e' : '#ffffff',
          border: `1px solid ${canvasTheme === 'dark' ? '#333' : '#e2e8f0'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          zIndex: 40,
        }}
      >
        <button
          onClick={() => setViewport((prev) => ({ ...prev, zoom: Math.max(0.2, prev.zoom - 0.15) }))}
          style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          onClick={() => setViewport((prev) => ({ ...prev, zoom: Math.min(4.0, prev.zoom + 0.15) }))}
          style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0', margin: '0 0.2rem' }} />

        <button
          onClick={handleUndo}
          style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Undo"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={handleRedo}
          style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="Redo"
        >
          <RotateCw size={15} />
        </button>

        {selectedId && (
          <button
            onClick={handleDeleteSelected}
            style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
            title="Delete Selected Element"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* DAILY TASKS & NOTEPAD DRAWER                         */}
      {/* ---------------------------------------------------- */}
      {isNotepadOpen && (
        <div
          style={{
            position: 'absolute',
            top: 68,
            right: 16,
            width: '320px',
            height: 'calc(100vh - 120px)',
            backgroundColor: canvasTheme === 'dark' ? '#1e1e1e' : '#ffffff',
            border: `1px solid ${canvasTheme === 'dark' ? '#333' : '#e2e8f0'}`,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 45,
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Daily Tasks</span>
            <button onClick={() => setIsNotepadOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <X size={15} />
            </button>
          </div>
          <textarea
            value={quickNotes}
            onChange={(e) => {
              setQuickNotes(e.target.value);
              localStorage.setItem('whiteboard_quick_notes', e.target.value);
            }}
            placeholder="Type quick daily notes or reminders..."
            style={{
              flex: 1,
              width: '100%',
              padding: '0.5rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              resize: 'none',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

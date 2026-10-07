import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pen,
  Eraser,
  MousePointer,
  Type,
  Square,
  Circle,
  Minus,
  MoveRight,
  Hand,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  FolderOpen,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Color Palette
const COLORS = [
  '#ffffff', // White
  '#94a3b8', // Slate Gray
  '#3b82f6', // Royal Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#000000', // Black
];

// Stroke Widths
const STROKE_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Bold', value: 8 },
  { label: 'Thick', value: 16 },
];

export default function WhiteboardPage() {
  const { isAuthenticated } = useAuth();

  // Canvas Refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Whiteboards management state
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [activeBoardTitle, setActiveBoardTitle] = useState('Weekly Study Notes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [newTitleInput, setNewTitleInput] = useState('');

  // Active Tool state
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'eraser' | 'select' | 'text' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'pan'
  const [currentColor, setCurrentColor] = useState('#3b82f6');
  const [currentWidth, setCurrentWidth] = useState(4);
  const [fontSize, setFontSize] = useState(20);

  // Infinite Canvas Viewport: pan & zoom
  const [viewport, setViewport] = useState({ panX: 0, panY: 0, zoom: 1.0 });

  // Canvas Elements
  const [elements, setElements] = useState([]);
  const elementsRef = useRef([]);
  elementsRef.current = elements;

  const [selectedElementId, setSelectedElementId] = useState(null);

  // Undo / Redo stacks
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Save state
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'

  // Text Tool Inline input
  const [textInput, setTextInput] = useState(null); // { x, y, screenX, screenY, text }

  // Interaction tracking refs
  const isInteracting = useRef(false);
  const currentAction = useRef(null); // 'drawing' | 'panning' | 'moving' | 'resizing' | 'creating_shape'
  const startPointer = useRef({ x: 0, y: 0, worldX: 0, worldY: 0 });
  const activeStroke = useRef(null);
  const currentShape = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeHandle = useRef(null); // 'tl', 'tr', 'bl', 'br'
  const isSpacePressed = useRef(false);

  // Convert Screen (client pixels) to Infinite World coordinates
  const screenToWorld = useCallback(
    (screenX, screenY) => {
      const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      const x = screenX - rect.left;
      const y = screenY - rect.top;
      const z = viewport.zoom || 1.0;
      return {
        x: x / z - (viewport.panX || 0),
        y: y / z - (viewport.panY || 0),
      };
    },
    [viewport]
  );

  // Commit and push elements to history cleanly
  const commitElements = useCallback(
    (newElements) => {
      const validElements = (newElements || []).filter(Boolean);
      setElements(validElements);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, validElements];
      });
      setHistoryIndex((prev) => prev + 1);
      setSaveStatus('unsaved');
    },
    [historyIndex]
  );

  // 1. Initial Load of Whiteboards
  const loadBoardsList = async () => {
    if (!isAuthenticated) return;
    try {
      const list = await api.getWhiteboards();
      setBoards(list || []);
      if (list && list.length > 0 && !activeBoardId) {
        loadBoardDetails(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load whiteboards list:', err);
    }
  };

  const loadBoardDetails = async (boardId) => {
    try {
      const board = await api.getWhiteboard(boardId);
      setActiveBoardId(board.id);
      setActiveBoardTitle(board.title || 'Untitled Whiteboard');
      const valid = (board.elements || []).filter(Boolean);
      setElements(valid);
      if (board.viewport) {
        setViewport({
          panX: board.viewport.panX || 0,
          panY: board.viewport.panY || 0,
          zoom: board.viewport.zoom || 1.0,
        });
      }
      setHistory([valid]);
      setHistoryIndex(0);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to load whiteboard details:', err);
    }
  };

  useEffect(() => {
    loadBoardsList();
  }, [isAuthenticated]);

  // 2. Debounced Auto-Save
  useEffect(() => {
    if (!activeBoardId || saveStatus !== 'unsaved') return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await api.updateWhiteboard(activeBoardId, {
          title: activeBoardTitle,
          elements: elementsRef.current,
          viewport,
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed auto-saving whiteboard:', err);
        setSaveStatus('unsaved');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [elements, viewport, activeBoardId, activeBoardTitle, saveStatus]);

  // Explicit Save
  const handleManualSave = async () => {
    if (!activeBoardId) return;
    setSaveStatus('saving');
    try {
      await api.updateWhiteboard(activeBoardId, {
        title: activeBoardTitle,
        elements: elementsRef.current,
        viewport,
      });
      setSaveStatus('saved');
    } catch (err) {
      alert(`Failed saving: ${err.message}`);
      setSaveStatus('unsaved');
    }
  };

  // Create New Board
  const handleCreateBoard = async () => {
    try {
      const newBoard = await api.createWhiteboard({ title: 'New Study Canvas' });
      setBoards((prev) => [newBoard, ...prev]);
      await loadBoardDetails(newBoard.id);
      setIsSidebarOpen(false);
    } catch (err) {
      alert(`Error creating board: ${err.message}`);
    }
  };

  // Delete Board
  const handleDeleteBoard = async (id, e) => {
    e.stopPropagation();
    if (boards.length <= 1) {
      alert('You must keep at least one whiteboard.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this whiteboard?')) return;
    try {
      await api.deleteWhiteboard(id);
      const remaining = boards.filter((b) => b.id !== id);
      setBoards(remaining);
      if (activeBoardId === id && remaining.length > 0) {
        loadBoardDetails(remaining[0].id);
      }
    } catch (err) {
      alert(`Error deleting board: ${err.message}`);
    }
  };

  // Rename Board
  const handleSaveRename = async (id, e) => {
    e.stopPropagation();
    if (!newTitleInput.trim()) return;
    try {
      await api.updateWhiteboard(id, { title: newTitleInput.trim() });
      setBoards((prev) =>
        prev.map((b) => (b.id === id ? { ...b, title: newTitleInput.trim() } : b))
      );
      if (activeBoardId === id) {
        setActiveBoardTitle(newTitleInput.trim());
      }
      setEditingTitleId(null);
    } catch (err) {
      alert(`Error updating title: ${err.message}`);
    }
  };

  // 3. Redraw Canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Deep dark background
      ctx.fillStyle = '#0a0b0e';
      ctx.fillRect(0, 0, width, height);

      // Draw Infinite Dot Grid
      const zoom = viewport.zoom || 1.0;
      const panX = viewport.panX || 0;
      const panY = viewport.panY || 0;

      const gridSize = 40 * zoom;
      const offsetX = ((panX * zoom) % gridSize + gridSize) % gridSize;
      const offsetY = ((panY * zoom) % gridSize + gridSize) % gridSize;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const dotRadius = Math.max(1, 1.2 * Math.min(1.5, zoom));
      for (let x = offsetX; x < width; x += gridSize) {
        for (let y = offsetY; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Apply Viewport Transformation (Pan & Zoom)
      ctx.translate(panX * zoom, panY * zoom);
      ctx.scale(zoom, zoom);

      // Render all saved elements
      (elementsRef.current || []).forEach((elem) => {
        if (elem) drawElement(ctx, elem);
      });

      // Render active stroke currently being drawn
      if (activeStroke.current) {
        drawElement(ctx, activeStroke.current);
      }

      // Render active shape being dragged
      if (currentShape.current) {
        drawElement(ctx, currentShape.current);
      }

      // Render Selection Bounding Box & Handles
      if (selectedElementId) {
        const selected = (elementsRef.current || []).find((e) => e && e.id === selectedElementId);
        if (selected) {
          drawSelectionBox(ctx, selected, zoom);
        }
      }

      ctx.restore();
    } catch (err) {
      console.error('Error during canvas redraw:', err);
    }
  }, [viewport, selectedElementId]);

  // Draw single element on canvas
  const drawElement = (ctx, elem) => {
    if (!elem || !elem.type) return;
    ctx.save();
    try {
      switch (elem.type) {
        case 'stroke': {
          if (!elem.points || elem.points.length < 2) {
            if (elem.points && elem.points.length === 1) {
              ctx.fillStyle = elem.color || '#3b82f6';
              ctx.beginPath();
              ctx.arc(elem.points[0].x, elem.points[0].y, (elem.width || 4) / 2, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          }
          ctx.strokeStyle = elem.color || '#3b82f6';
          ctx.lineWidth = elem.width || 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(elem.points[0].x, elem.points[0].y);
          for (let i = 1; i < elem.points.length; i++) {
            const xc = (elem.points[i - 1].x + elem.points[i].x) / 2;
            const yc = (elem.points[i - 1].y + elem.points[i].y) / 2;
            ctx.quadraticCurveTo(elem.points[i - 1].x, elem.points[i - 1].y, xc, yc);
          }
          ctx.stroke();
          break;
        }

        case 'shape': {
          ctx.strokeStyle = elem.color || '#3b82f6';
          ctx.lineWidth = elem.strokeWidth || 3;
          ctx.fillStyle = elem.fill || 'transparent';

          const { shapeType, x, y, width, height } = elem;

          if (shapeType === 'rectangle') {
            ctx.beginPath();
            ctx.rect(x, y, width, height);
            if (elem.fill && elem.fill !== 'transparent') ctx.fill();
            ctx.stroke();
          } else if (shapeType === 'circle') {
            ctx.beginPath();
            const rx = Math.abs(width) / 2;
            const ry = Math.abs(height) / 2;
            const cx = x + width / 2;
            const cy = y + height / 2;
            ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
            if (elem.fill && elem.fill !== 'transparent') ctx.fill();
            ctx.stroke();
          } else if (shapeType === 'line') {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + width, y + height);
            ctx.stroke();
          } else if (shapeType === 'arrow') {
            const startX = x;
            const startY = y;
            const endX = x + width;
            const endY = y + height;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            const angle = Math.atan2(endY - startY, endX - startX);
            const headLen = Math.max(12, (elem.strokeWidth || 3) * 3.5);
            ctx.fillStyle = elem.color || '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
              endX - headLen * Math.cos(angle - Math.PI / 6),
              endY - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              endX - headLen * Math.cos(angle + Math.PI / 6),
              endY - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;
        }

        case 'text': {
          ctx.fillStyle = elem.color || '#ffffff';
          ctx.font = `${elem.fontSize || 20}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textBaseline = 'top';
          const lines = (elem.text || '').split('\n');
          const lineHeight = (elem.fontSize || 20) * 1.35;
          lines.forEach((line, i) => {
            ctx.fillText(line, elem.x, elem.y + i * lineHeight);
          });
          break;
        }

        case 'image': {
          if (!elem.imageObj) {
            const img = new Image();
            img.src = elem.src;
            img.onload = () => {
              elem.imageObj = img;
              redraw();
            };
          } else {
            ctx.drawImage(elem.imageObj, elem.x, elem.y, elem.width, elem.height);
          }
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.error('Error drawing element:', e);
    } finally {
      ctx.restore();
    }
  };

  // Draw Selection Bounding Box & Handles
  const drawSelectionBox = (ctx, elem, zoom) => {
    if (!elem) return;
    const box = getElementBounds(elem);
    if (!box) return;

    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5 / zoom;
    const handleSize = 8 / zoom;

    const corners = [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x, y: box.y + box.height },
      { x: box.x + box.width, y: box.y + box.height },
    ];

    corners.forEach((c) => {
      ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
    });

    ctx.restore();
  };

  // Get Bounding Box of any element
  const getElementBounds = (elem) => {
    if (!elem) return null;
    switch (elem.type) {
      case 'stroke': {
        if (!elem.points || elem.points.length === 0) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        elem.points.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });
        const pad = (elem.width || 4) / 2;
        return {
          x: minX - pad,
          y: minY - pad,
          width: Math.max(10, maxX - minX + pad * 2),
          height: Math.max(10, maxY - minY + pad * 2),
        };
      }
      case 'shape':
      case 'image':
        return {
          x: Math.min(elem.x, elem.x + elem.width),
          y: Math.min(elem.y, elem.y + elem.height),
          width: Math.abs(elem.width),
          height: Math.abs(elem.height),
        };
      case 'text': {
        const lines = (elem.text || '').split('\n');
        const maxLine = lines.reduce((max, l) => Math.max(max, l.length), 0);
        const w = Math.max(40, maxLine * ((elem.fontSize || 20) * 0.6));
        const h = Math.max(20, lines.length * ((elem.fontSize || 20) * 1.35));
        return { x: elem.x, y: elem.y, width: w, height: h };
      }
      default:
        return null;
    }
  };

  // Hit test: Find element under world coordinate
  const hitTestElement = (worldX, worldY) => {
    const arr = elementsRef.current || [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const elem = arr[i];
      if (!elem) continue;
      const box = getElementBounds(elem);
      if (
        box &&
        worldX >= box.x &&
        worldX <= box.x + box.width &&
        worldY >= box.y &&
        worldY <= box.y + box.height
      ) {
        return elem;
      }
    }
    return null;
  };

  // Resize Canvas to Window
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      redraw();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  // Redraw whenever state changes
  useEffect(() => {
    redraw();
  }, [elements, viewport, selectedElementId, redraw]);

  // 4. Keyboard Shortcuts: Undo, Redo, Spacebar Pan, Delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space' && !isSpacePressed.current) {
        isSpacePressed.current = true;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }

      // Delete selected object
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          const next = elementsRef.current.filter((el) => el && el.id !== selectedElementId);
          commitElements(next);
          setSelectedElementId(null);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        isSpacePressed.current = false;
        if (canvasRef.current) {
          canvasRef.current.style.cursor = activeTool === 'pan' ? 'grab' : 'crosshair';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedElementId, activeTool, commitElements]);

  // 5. Global Paste Handler (Ctrl+V Screenshots / Images)
  useEffect(() => {
    const handlePaste = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const src = event.target.result;
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              const cx = canvas ? canvas.width / (2 * (window.devicePixelRatio || 1)) : 400;
              const cy = canvas ? canvas.height / (2 * (window.devicePixelRatio || 1)) : 300;
              const worldCenter = screenToWorld(cx, cy);

              const maxW = 500;
              const scale = img.width > maxW ? maxW / img.width : 1;
              const w = img.width * scale;
              const h = img.height * scale;

              const newImgElem = {
                id: `img_${Date.now()}`,
                type: 'image',
                x: worldCenter.x - w / 2,
                y: worldCenter.y - h / 2,
                width: w,
                height: h,
                src,
                imageObj: img,
              };

              const next = [...elementsRef.current, newImgElem];
              commitElements(next);
              setSelectedElementId(newImgElem.id);
              setActiveTool('select');
            };
            img.src = src;
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [screenToWorld, commitElements]);

  // 6. Handle File Upload (Insert Image)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const cx = canvas ? canvas.width / (2 * (window.devicePixelRatio || 1)) : 400;
        const cy = canvas ? canvas.height / (2 * (window.devicePixelRatio || 1)) : 300;
        const worldCenter = screenToWorld(cx, cy);

        const maxW = 500;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = img.width * scale;
        const h = img.height * scale;

        const newImgElem = {
          id: `img_${Date.now()}`,
          type: 'image',
          x: worldCenter.x - w / 2,
          y: worldCenter.y - h / 2,
          width: w,
          height: h,
          src,
          imageObj: img,
        };

        const next = [...elementsRef.current, newImgElem];
        commitElements(next);
        setSelectedElementId(newImgElem.id);
        setActiveTool('select');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 7. Mouse / Stylus Handlers
  const handlePointerDown = (e) => {
    if (textInput) {
      commitText();
    }

    const world = screenToWorld(e.clientX, e.clientY);
    startPointer.current = { x: e.clientX, y: e.clientY, worldX: world.x, worldY: world.y };
    isInteracting.current = true;

    // Pan with spacebar or middle click or Pan tool
    if (isSpacePressed.current || e.button === 1 || activeTool === 'pan') {
      currentAction.current = 'panning';
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    // Eraser Tool
    if (activeTool === 'eraser') {
      currentAction.current = 'erasing';
      eraseAt(world.x, world.y);
      return;
    }

    // Text Tool: Click to place text box
    if (activeTool === 'text') {
      setTextInput({
        x: world.x,
        y: world.y,
        screenX: e.clientX,
        screenY: e.clientY,
        text: '',
      });
      return;
    }

    // Pen Tool: Begin freehand stroke
    if (activeTool === 'pen') {
      currentAction.current = 'drawing';
      activeStroke.current = {
        id: `stroke_${Date.now()}`,
        type: 'stroke',
        points: [{ x: world.x, y: world.y }],
        color: currentColor,
        width: currentWidth,
      };
      redraw();
      return;
    }

    // Shape Tools
    if (['rectangle', 'circle', 'line', 'arrow'].includes(activeTool)) {
      currentAction.current = 'creating_shape';
      currentShape.current = {
        id: `shape_${Date.now()}`,
        type: 'shape',
        shapeType: activeTool,
        x: world.x,
        y: world.y,
        width: 0,
        height: 0,
        color: currentColor,
        strokeWidth: currentWidth,
        fill: 'transparent',
      };
      redraw();
      return;
    }

    // Select Tool: Check selection or dragging
    if (activeTool === 'select') {
      if (selectedElementId) {
        const selected = elementsRef.current.find((el) => el && el.id === selectedElementId);
        if (selected) {
          const box = getElementBounds(selected);
          if (box) {
            const handleRadius = 10 / (viewport.zoom || 1);
            const corners = {
              tl: { x: box.x, y: box.y },
              tr: { x: box.x + box.width, y: box.y },
              bl: { x: box.x, y: box.y + box.height },
              br: { x: box.x + box.width, y: box.y + box.height },
            };
            for (const [handleKey, pt] of Object.entries(corners)) {
              if (
                Math.abs(world.x - pt.x) <= handleRadius &&
                Math.abs(world.y - pt.y) <= handleRadius
              ) {
                currentAction.current = 'resizing';
                resizeHandle.current = handleKey;
                return;
              }
            }
          }
        }
      }

      const hit = hitTestElement(world.x, world.y);
      if (hit) {
        setSelectedElementId(hit.id);
        currentAction.current = 'moving';
        dragOffset.current = {
          x: world.x - hit.x,
          y: world.y - hit.y,
        };
      } else {
        setSelectedElementId(null);
      }
      redraw();
    }
  };

  const handlePointerMove = (e) => {
    if (!isInteracting.current) return;
    const world = screenToWorld(e.clientX, e.clientY);

    // Panning
    if (currentAction.current === 'panning') {
      const z = viewport.zoom || 1.0;
      const dx = (e.clientX - startPointer.current.x) / z;
      const dy = (e.clientY - startPointer.current.y) / z;
      setViewport((prev) => ({
        ...prev,
        panX: (prev.panX || 0) + dx,
        panY: (prev.panY || 0) + dy,
      }));
      startPointer.current = { x: e.clientX, y: e.clientY, worldX: world.x, worldY: world.y };
      return;
    }

    // Erasing (while dragging)
    if (currentAction.current === 'erasing') {
      eraseAt(world.x, world.y);
      return;
    }

    // Freehand Drawing
    if (currentAction.current === 'drawing' && activeStroke.current) {
      activeStroke.current.points.push({ x: world.x, y: world.y });
      redraw();
      return;
    }

    // Creating Shape
    if (currentAction.current === 'creating_shape' && currentShape.current) {
      currentShape.current.width = world.x - currentShape.current.x;
      currentShape.current.height = world.y - currentShape.current.y;
      redraw();
      return;
    }

    // Moving Selected Object
    if (currentAction.current === 'moving' && selectedElementId) {
      const dx = world.x - startPointer.current.worldX;
      const dy = world.y - startPointer.current.worldY;
      startPointer.current.worldX = world.x;
      startPointer.current.worldY = world.y;

      setElements((prev) =>
        prev.map((el) => {
          if (!el || el.id !== selectedElementId) return el;
          if (el.type === 'stroke') {
            return {
              ...el,
              points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            };
          }
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
          };
        })
      );
      redraw();
      return;
    }

    // Resizing Selected Object
    if (currentAction.current === 'resizing' && selectedElementId && resizeHandle.current) {
      const handle = resizeHandle.current;
      setElements((prev) =>
        prev.map((el) => {
          if (!el || el.id !== selectedElementId) return el;
          if (el.type === 'stroke') return el;

          let newX = el.x;
          let newY = el.y;
          let newW = el.width;
          let newH = el.height;

          if (handle === 'br') {
            newW = Math.max(15, world.x - el.x);
            newH = Math.max(15, world.y - el.y);
          } else if (handle === 'bl') {
            newW = Math.max(15, el.x + el.width - world.x);
            newX = world.x;
            newH = Math.max(15, world.y - el.y);
          } else if (handle === 'tr') {
            newW = Math.max(15, world.x - el.x);
            newH = Math.max(15, el.y + el.height - world.y);
            newY = world.y;
          } else if (handle === 'tl') {
            newW = Math.max(15, el.x + el.width - world.x);
            newH = Math.max(15, el.y + el.height - world.y);
            newX = world.x;
            newY = world.y;
          }

          return { ...el, x: newX, y: newY, width: newW, height: newH };
        })
      );
      redraw();
    }
  };

  const handlePointerUp = () => {
    if (!isInteracting.current) return;
    isInteracting.current = false;

    if (canvasRef.current) {
      canvasRef.current.style.cursor =
        isSpacePressed.current || activeTool === 'pan' ? 'grab' : 'crosshair';
    }

    // Finished Freehand Stroke
    if (currentAction.current === 'drawing' && activeStroke.current) {
      const stroke = {
        ...activeStroke.current,
        points: [...activeStroke.current.points],
      };
      activeStroke.current = null;

      if (stroke.points.length > 1) {
        const next = [...elementsRef.current, stroke];
        commitElements(next);
      }
    }

    // Finished Shape
    if (currentAction.current === 'creating_shape' && currentShape.current) {
      const shape = { ...currentShape.current };
      currentShape.current = null;

      if (Math.abs(shape.width) > 3 || Math.abs(shape.height) > 3) {
        const next = [...elementsRef.current, shape];
        commitElements(next);
        setSelectedElementId(shape.id);
        setActiveTool('select');
      }
    }

    // Finished Moving or Resizing
    if (currentAction.current === 'moving' || currentAction.current === 'resizing') {
      commitElements(elementsRef.current);
    }

    currentAction.current = null;
    resizeHandle.current = null;
    redraw();
  };

  // Erase element at world coordinate
  const eraseAt = (worldX, worldY) => {
    const hit = hitTestElement(worldX, worldY);
    if (hit) {
      const next = elementsRef.current.filter((el) => el && el.id !== hit.id);
      commitElements(next);
      if (selectedElementId === hit.id) {
        setSelectedElementId(null);
      }
      redraw();
    }
  };

  // Commit text input
  const commitText = () => {
    if (!textInput || !textInput.text.trim()) {
      setTextInput(null);
      return;
    }

    const newTextElem = {
      id: `text_${Date.now()}`,
      type: 'text',
      x: textInput.x,
      y: textInput.y,
      text: textInput.text,
      color: currentColor,
      fontSize,
    };

    const next = [...elementsRef.current, newTextElem];
    commitElements(next);
    setSelectedElementId(newTextElem.id);
    setTextInput(null);
    setActiveTool('select');
  };

  // 8. Mouse Wheel: Zoom in / Zoom out centered on cursor
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    const currentZ = viewport.zoom || 1.0;
    const newZoom = Math.min(5.0, Math.max(0.1, currentZ * zoomFactor));

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldBefore = {
      x: mouseX / currentZ - (viewport.panX || 0),
      y: mouseY / currentZ - (viewport.panY || 0),
    };

    const newPanX = mouseX / newZoom - worldBefore.x;
    const newPanY = mouseY / newZoom - worldBefore.y;

    setViewport({
      panX: newPanX,
      panY: newPanY,
      zoom: newZoom,
    });
  };

  // Zoom Button Controls
  const handleZoom = (delta) => {
    const currentZ = viewport.zoom || 1.0;
    const newZoom = Math.min(5.0, Math.max(0.1, currentZ + delta));
    setViewport((prev) => ({ ...prev, zoom: newZoom }));
  };

  const handleResetZoom = () => {
    setViewport({ panX: 0, panY: 0, zoom: 1.0 });
  };

  // Fit All / Overview
  const handleFitAll = () => {
    const arr = elementsRef.current || [];
    if (arr.length === 0) {
      handleResetZoom();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    arr.forEach((el) => {
      const box = getElementBounds(el);
      if (box) {
        if (box.x < minX) minX = box.x;
        if (box.y < minY) minY = box.y;
        if (box.x + box.width > maxX) maxX = box.x + box.width;
        if (box.y + box.height > maxY) maxY = box.y + box.height;
      }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW <= 0 || contentH <= 0 || !isFinite(contentW) || !isFinite(contentH)) return;

    const scaleX = (w * 0.8) / contentW;
    const scaleY = (h * 0.8) / contentH;
    const fitZoom = Math.min(2.0, Math.max(0.15, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setViewport({
      panX: w / 2 / fitZoom - centerX,
      panY: h / 2 / fitZoom - centerY,
      zoom: fitZoom,
    });
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetState = history[nextIndex] || [];
      setElements(targetState);
      setHistoryIndex(nextIndex);
      setSelectedElementId(null);
      setSaveStatus('unsaved');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex] || [];
      setElements(targetState);
      setHistoryIndex(nextIndex);
      setSelectedElementId(null);
      setSaveStatus('unsaved');
    }
  };

  // Export Canvas Image (PNG)
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${(activeBoardTitle || 'Whiteboard').replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0b0e',
        color: '#ffffff',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Top Floating Control Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          pointerEvents: 'none',
        }}
      >
        {/* Left: Back & Board Drawer Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto' }}>
          <Link
            to="/"
            className="btn btn-outline btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(19, 20, 28, 0.92)',
              backdropFilter: 'blur(8px)',
              borderColor: 'var(--border-color)',
            }}
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="btn btn-outline btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(19, 20, 28, 0.92)',
              backdropFilter: 'blur(8px)',
              borderColor: 'var(--border-color)',
            }}
          >
            <FolderOpen size={14} />
            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeBoardTitle}
            </span>
          </button>
        </div>

        {/* Center: Tools Dock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            backgroundColor: 'rgba(19, 20, 28, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.3rem 0.5rem',
            pointerEvents: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Select Tool */}
          <button
            onClick={() => setActiveTool('select')}
            title="Selection Tool (V)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'select' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <MousePointer size={16} />
          </button>

          {/* Pen Tool */}
          <button
            onClick={() => setActiveTool('pen')}
            title="Pen (P)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'pen' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <Pen size={16} />
          </button>

          {/* Eraser Tool */}
          <button
            onClick={() => setActiveTool('eraser')}
            title="Eraser (E)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'eraser' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <Eraser size={16} />
          </button>

          <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-subtle)', margin: '0 0.2rem' }} />

          {/* Text Tool */}
          <button
            onClick={() => setActiveTool('text')}
            title="Text Tool (T)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'text' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <Type size={16} />
          </button>

          {/* Shapes */}
          <button
            onClick={() => setActiveTool('rectangle')}
            title="Rectangle (R)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'rectangle' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <Square size={16} />
          </button>

          <button
            onClick={() => setActiveTool('circle')}
            title="Circle / Ellipse (C)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'circle' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <Circle size={16} />
          </button>

          <button
            onClick={() => setActiveTool('line')}
            title="Straight Line (L)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'line' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <Minus size={16} />
          </button>

          <button
            onClick={() => setActiveTool('arrow')}
            title="Arrow (A)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'arrow' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <MoveRight size={16} />
          </button>

          <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-subtle)', margin: '0 0.2rem' }} />

          {/* Upload Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Insert Image (or paste Ctrl+V)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: '#ffffff',
            }}
          >
            <ImageIcon size={16} />
          </button>

          {/* Pan Hand Tool */}
          <button
            onClick={() => setActiveTool('pan')}
            title="Pan Tool (H or Spacebar+Drag)"
            style={{
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTool === 'pan' ? 'var(--accent-color)' : 'transparent',
              color: '#ffffff',
            }}
          >
            <Hand size={16} />
          </button>

          <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-subtle)', margin: '0 0.2rem' }} />

          {/* Color Palette Dropdown / Swatches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0 0.2rem' }}>
            {COLORS.slice(0, 5).map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: currentColor === c ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              title="Custom Color"
              style={{
                width: '18px',
                height: '18px',
                border: 'none',
                borderRadius: '50%',
                background: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          </div>

          <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-subtle)', margin: '0 0.2rem' }} />

          {/* Stroke Width Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0 0.2rem' }}>
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                onClick={() => setCurrentWidth(sw.value)}
                title={sw.label}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: currentWidth === sw.value ? 'rgba(37, 99, 235, 0.4)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(14, sw.value * 1.5)}px`,
                    height: `${Math.min(14, sw.value * 1.5)}px`,
                    borderRadius: '50%',
                    backgroundColor: currentColor,
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Undo/Redo & Save Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'rgba(19, 20, 28, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.3rem 0.5rem',
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            style={{
              padding: '0.35rem',
              borderRadius: '4px',
              border: 'none',
              background: 'none',
              color: historyIndex <= 0 ? 'var(--text-muted)' : '#ffffff',
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            style={{
              padding: '0.35rem',
              borderRadius: '4px',
              border: 'none',
              background: 'none',
              color: historyIndex >= history.length - 1 ? 'var(--text-muted)' : '#ffffff',
              cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            <RotateCw size={15} />
          </button>

          <span style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)', margin: '0 0.15rem' }} />

          <button
            onClick={handleExportPNG}
            title="Export PNG screenshot"
            style={{
              padding: '0.35rem',
              borderRadius: '4px',
              border: 'none',
              background: 'none',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
          </button>

          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className="btn btn-primary btn-sm"
            style={{
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.6rem',
            }}
          >
            <Save size={13} />
            <span>
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'unsaved'
                ? 'Save'
                : 'Saved ✓'}
            </span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Viewport Navigation HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          backgroundColor: 'rgba(19, 20, 28, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.3rem 0.6rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
      >
        <button
          onClick={() => handleZoom(-0.15)}
          title="Zoom Out"
          style={{
            padding: '0.3rem',
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <ZoomOut size={14} />
        </button>

        <span
          onClick={handleResetZoom}
          title="Click to reset to 100%"
          style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            minWidth: '45px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          {Math.round((viewport.zoom || 1) * 100)}%
        </span>

        <button
          onClick={() => handleZoom(0.15)}
          title="Zoom In"
          style={{
            padding: '0.3rem',
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <ZoomIn size={14} />
        </button>

        <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-subtle)', margin: '0 0.2rem' }} />

        <button
          onClick={handleFitAll}
          title="Fit All Content in View"
          style={{
            padding: '0.3rem',
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
          }}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Tip Notice floating bottom right */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 30,
          fontSize: '0.725rem',
          color: 'var(--text-muted)',
          backgroundColor: 'rgba(19, 20, 28, 0.85)',
          padding: '0.3rem 0.6rem',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          pointerEvents: 'none',
        }}
      >
        💡 <strong>Space+Drag</strong> or Middle Click to Pan &bull; <strong>Ctrl+V</strong> to Paste Screenshot
      </div>

      {/* Slide-out Whiteboards Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '280px',
            height: '100%',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>My Whiteboards</h3>
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '0.75rem 1rem' }}>
            <button
              onClick={handleCreateBoard}
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
              }}
            >
              <Plus size={14} />
              <span>New Whiteboard</span>
            </button>
          </div>

          {/* Boards List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem' }}>
            {boards.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  loadBoardDetails(b.id);
                  setIsSidebarOpen(false);
                }}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '6px',
                  marginBottom: '0.35rem',
                  cursor: 'pointer',
                  backgroundColor: b.id === activeBoardId ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                  border: b.id === activeBoardId ? '1px solid #2563eb' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                {editingTitleId === b.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1 }}>
                    <input
                      type="text"
                      value={newTitleInput}
                      onChange={(e) => setNewTitleInput(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: '#ffffff',
                      }}
                      autoFocus
                    />
                    <button
                      onClick={(e) => handleSaveRename(b.id, e)}
                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}
                    >
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: b.id === activeBoardId ? '600' : '400',
                          color: b.id === activeBoardId ? '#60a5fa' : 'var(--text-primary)',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {b.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {b.element_count} objects
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitleId(b.id);
                          setNewTitleInput(b.title);
                        }}
                        title="Rename Board"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteBoard(b.id, e)}
                        title="Delete Board"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: activeTool === 'pan' ? 'grab' : 'crosshair',
          touchAction: 'none',
        }}
      />

      {/* Inline Textarea when clicking with Text Tool */}
      {textInput && (
        <div
          style={{
            position: 'absolute',
            left: `${textInput.screenX}px`,
            top: `${textInput.screenY}px`,
            zIndex: 60,
          }}
        >
          <textarea
            value={textInput.text}
            onChange={(e) => setTextInput((prev) => ({ ...prev, text: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                commitText();
              }
            }}
            placeholder="Type your notes here... (Ctrl+Enter to save)"
            autoFocus
            rows={4}
            style={{
              padding: '0.5rem',
              backgroundColor: 'rgba(19, 20, 28, 0.95)',
              color: currentColor,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: `${fontSize}px`,
              border: '2px solid #2563eb',
              borderRadius: '6px',
              outline: 'none',
              resize: 'both',
              minWidth: '220px',
              minHeight: '80px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            }}
          />
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
            <button onClick={commitText} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
              Done
            </button>
            <button
              onClick={() => setTextInput(null)}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

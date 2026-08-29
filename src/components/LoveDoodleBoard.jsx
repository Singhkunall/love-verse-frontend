import React, { useRef, useEffect, useState } from 'react';
import { 
  Sparkles, Heart, Trash2, Download, Save, Undo, RefreshCw, 
  ArrowLeft, Eye, Maximize2, Minimize2, Palette, ChevronUp, ChevronDown, X, Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import canvasConfetti from 'canvas-confetti';
import API_URL from '../utils/config';

const LoveDoodleBoard = ({ user, roomId, socket, onBack, partnerName = "Partner" }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // States
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState('#f43f5e'); // Rose Pink default
  const [brushSize, setBrushSize] = useState(8);
  const [brushMode, setBrushMode] = useState('brush'); // 'brush' | 'neon' | 'rainbow' | 'eraser'
  const [activeStamp, setActiveStamp] = useState(null); // stamp emoji or null
  const [history, setHistory] = useState([]); // Undo history stack
  const [savedDoodles, setSavedDoodles] = useState([]);
  const [partnerCursor, setPartnerCursor] = useState(null); // { x, y, name, color }
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [previewDoodle, setPreviewDoodle] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const userId = user._id || user.id;
  const myName = user.name || "Your Love";

  const colors = [
    '#f43f5e', // Rose
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#000000', // Black
    '#ffffff', // White
  ];

  const stamps = ['❤️', '💋', '👑', '✨', '🧸', '🌹', '💍', '🔥'];

  // Initialize Single Canvas Element Safe Mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    const initCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || 320;
      const h = rect.height || 380;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      applyTemplate(selectedTemplate, ctx, w, h);
      saveState();
    };

    initCanvasSize();
    fetchSavedDoodles();

    const handleResize = () => {
      initCanvasSize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Saved Doodles
  const fetchSavedDoodles = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/doodle/${roomId}`);
      setSavedDoodles(res.data);
    } catch (err) {
      console.error("Doodles fetch error:", err);
    }
  };

  // Background Template Renderer (Safe Bounds)
  const applyTemplate = (tmpl, ctx, width, height) => {
    if (!ctx) return;
    const canvas = canvasRef.current;
    const w = width || (canvas ? canvas.clientWidth : 320);
    const h = height || (canvas ? canvas.clientHeight : 380);

    ctx.save();
    if (tmpl === 'starry') {
      ctx.fillStyle = '#0f172a'; // Deep Space Navy
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const sx = (Math.sin(i * 99) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 33) * 0.5 + 0.5) * h;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (tmpl === 'tictactoe') {
      ctx.fillStyle = '#fff0f3';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 3, 40); ctx.lineTo(w / 3, h - 40);
      ctx.moveTo((2 * w) / 3, 40); ctx.lineTo((2 * w) / 3, h - 40);
      ctx.moveTo(40, h / 3); ctx.lineTo(w - 40, h / 3);
      ctx.moveTo(40, (2 * h) / 3); ctx.lineTo(w - 40, (2 * h) / 3);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  };

  // Switch Template
  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    applyTemplate(tmpl, ctxRef.current);
    saveState();
    if (socket) socket.emit("canvas_clear", { roomId });
  };

  // Undo History Save
  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    if (canvas.width <= 0 || canvas.height <= 0) return;

    try {
      const imageData = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-15), imageData]);
    } catch (e) {
      console.warn("Save state skipped:", e);
    }
  };

  // Socket Listeners for Real-Time Sync
  useEffect(() => {
    if (!socket) return;

    const handleDrawStroke = (data) => {
      drawSegmentOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.mode);
    };

    const handleCursorMove = (data) => {
      setPartnerCursor(data);
    };

    const handleCanvasClear = () => {
      const canvas = canvasRef.current;
      if (!canvas || !ctxRef.current) return;
      applyTemplate(selectedTemplate, ctxRef.current);
      saveState();
      toast("Partner cleared the canvas! 🧹", { icon: '🎨' });
    };

    const handleDoodleSaved = (data) => {
      fetchSavedDoodles();
      toast.success(`${data.savedByName || 'Partner'} saved a Love Doodle! 🎨💖`);
      canvasConfetti({ particleCount: 50, spread: 60 });
    };

    const handleStrokeUndo = () => {
      handleUndoLocal();
      toast("Partner undone last stroke ⌫", { icon: '✏️' });
    };

    const handleStampPlace = (data) => {
      drawStampOnCanvas(data.x, data.y, data.emoji);
    };

    socket.on("draw_stroke", handleDrawStroke);
    socket.on("cursor_move", handleCursorMove);
    socket.on("canvas_clear", handleCanvasClear);
    socket.on("doodle_saved", handleDoodleSaved);
    socket.on("stroke_undo", handleStrokeUndo);
    socket.on("stamp_place", handleStampPlace);

    return () => {
      socket.off("draw_stroke", handleDrawStroke);
      socket.off("cursor_move", handleCursorMove);
      socket.off("canvas_clear", handleCanvasClear);
      socket.off("doodle_saved", handleDoodleSaved);
      socket.off("stroke_undo", handleStrokeUndo);
      socket.off("stamp_place", handleStampPlace);
    };
  }, [socket, selectedTemplate]);

  // Coordinate Helpers
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Draw Segment Core
  const drawSegmentOnCanvas = (x0, y0, x1, y1, strokeColor, strokeSize, mode) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);

    if (mode === 'eraser') {
      ctx.strokeStyle = selectedTemplate === 'starry' ? '#0f172a' : '#ffffff';
      ctx.lineWidth = strokeSize * 2.5;
      ctx.shadowBlur = 0;
    } else if (mode === 'neon') {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 15;
    } else if (mode === 'rainbow') {
      const hue = (Date.now() / 5) % 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.lineWidth = strokeSize;
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.shadowBlur = 0;
    }

    ctx.stroke();
    ctx.restore();
  };

  // Draw Stamp Core
  const drawStampOnCanvas = (x, y, emoji) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.save();
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
    ctx.restore();
  };

  // Start Drawing / Place Stamp
  const startDrawing = (e) => {
    const pos = getCanvasPos(e);

    if (activeStamp) {
      drawStampOnCanvas(pos.x, pos.y, activeStamp);
      saveState();
      if (socket) {
        socket.emit("stamp_place", { roomId, x: pos.x, y: pos.y, emoji: activeStamp });
      }
      return;
    }

    setIsDrawing(true);
    setLastPos(pos);
  };

  // Draw Motion
  const draw = (e) => {
    const pos = getCanvasPos(e);

    if (socket && Math.random() > 0.4) {
      socket.emit("cursor_move", {
        roomId,
        x: pos.x,
        y: pos.y,
        name: myName,
        color
      });
    }

    if (!isDrawing || activeStamp) return;

    drawSegmentOnCanvas(lastPos.x, lastPos.y, pos.x, pos.y, color, brushSize, brushMode);

    if (socket) {
      socket.emit("draw_stroke", {
        roomId,
        x0: lastPos.x,
        y0: lastPos.y,
        x1: pos.x,
        y1: pos.y,
        color,
        size: brushSize,
        mode: brushMode
      });
    }

    setLastPos(pos);
  };

  // Stop Drawing
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  // Undo Local
  const handleUndoLocal = () => {
    if (history.length <= 1) return;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];

    if (previousState) {
      try {
        ctx.putImageData(previousState, 0, 0);
        setHistory(newHistory);
      } catch (e) {
        console.warn("Undo failed:", e);
      }
    }
  };

  const triggerUndo = () => {
    handleUndoLocal();
    if (socket) socket.emit("stroke_undo", { roomId });
  };

  // Clear Canvas
  const triggerClear = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    applyTemplate(selectedTemplate, ctxRef.current);
    saveState();
    if (socket) socket.emit("canvas_clear", { roomId });
    toast.success("Canvas cleared! 🧹");
  };

  // Save Doodle to Cloudinary & REST API
  const handleSaveDoodle = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    const saveToast = toast.loading("Saving doodle to Memories... 🎨");

    try {
      const imageBase64 = canvas.toDataURL("image/png");

      const res = await axios.post(`${API_URL}/api/doodle/save`, {
        roomId,
        imageBase64,
        savedBy: userId,
        savedByName: myName,
        title: `${myName} & ${partnerName}'s Doodle ❤️`
      });

      toast.success("Saved to Memories! 🖼️💖", { id: saveToast });
      fetchSavedDoodles();
      canvasConfetti({ particleCount: 100, spread: 70 });

      if (socket) {
        socket.emit("doodle_saved", {
          roomId,
          imageUrl: res.data.imageUrl,
          savedByName: myName
        });
      }
    } catch (err) {
      console.error("Save doodle error:", err);
      toast.error("Failed to save doodle!", { id: saveToast });
    } finally {
      setIsSaving(false);
    }
  };

  // Download Local PNG
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = `LoveVerse-Doodle-${Date.now()}.png`;
    link.click();
    toast.success("Downloaded PNG to device! 📥");
  };

  // Delete Doodle
  const handleDeleteDoodle = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/doodle/${id}`);
      toast.success("Doodle deleted!");
      fetchSavedDoodles();
    } catch (err) {
      toast.error("Delete failed!");
    }
  };

  // Shared Toolbar Controls Component
  const ControlsToolbar = () => (
    <div className="space-y-4">
      {/* Brush Size Selector */}
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Brush Size ({brushSize}px)
        </label>
        <div className="flex items-center gap-2">
          {[4, 8, 16, 28].map((size) => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all flex items-center justify-center ${
                brushSize === size ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-rose-50'
              }`}
            >
              <span style={{ width: size / 2, height: size / 2 }} className="rounded-full bg-current inline-block" />
            </button>
          ))}
        </div>
      </div>

      {/* Brush Modes */}
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Brush Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => { setBrushMode('brush'); setActiveStamp(null); }}
            className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              brushMode === 'brush' && !activeStamp ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            ✏️ Normal
          </button>

          <button
            onClick={() => { setBrushMode('neon'); setActiveStamp(null); }}
            className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              brushMode === 'neon' && !activeStamp ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}
          >
            ✨ Neon
          </button>

          <button
            onClick={() => { setBrushMode('rainbow'); setActiveStamp(null); }}
            className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              brushMode === 'rainbow' && !activeStamp ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            🌈 Rainbow
          </button>

          <button
            onClick={() => { setBrushMode('eraser'); setActiveStamp(null); }}
            className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
              brushMode === 'eraser' && !activeStamp ? 'bg-slate-700 text-white border-slate-700 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            🧹 Eraser
          </button>
        </div>
      </div>

      {/* Color Palette */}
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Color Palette
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); if (brushMode === 'eraser') setBrushMode('brush'); }}
              className={`w-9 h-9 shrink-0 rounded-xl transition-all border-2 shadow-sm ${
                color === c ? 'border-gray-800 scale-110 shadow-md' : 'border-white hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); if (brushMode === 'eraser') setBrushMode('brush'); }}
            className="w-9 h-9 shrink-0 rounded-xl cursor-pointer bg-white p-0.5 border border-gray-200"
          />
        </div>
      </div>

      {/* Stamps & Stickers */}
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Love Stamps & Stickers 💖
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {stamps.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStamp(activeStamp === s ? null : s)}
              className={`h-10 rounded-xl text-lg flex items-center justify-center border transition-all ${
                activeStamp === s ? 'bg-rose-100 border-rose-500 scale-110 shadow-md ring-2 ring-rose-300' : 'bg-gray-50 border-gray-200 hover:bg-rose-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {activeStamp && (
          <p className="text-[10px] text-rose-500 font-bold mt-1 italic text-center">
            Tap on canvas to place {activeStamp}!
          </p>
        )}
      </div>

      {/* Canvas Template Backgrounds */}
      <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Background Template
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleSelectTemplate('blank')}
            className={`py-2 rounded-xl text-xs font-bold border ${selectedTemplate === 'blank' ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-50 text-gray-700'}`}
          >
            ⚪ Blank
          </button>
          <button
            onClick={() => handleSelectTemplate('starry')}
            className={`py-2 rounded-xl text-xs font-bold border ${selectedTemplate === 'starry' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-800'}`}
          >
            🌌 Starry
          </button>
          <button
            onClick={() => handleSelectTemplate('tictactoe')}
            className={`py-2 rounded-xl text-xs font-bold border ${selectedTemplate === 'tictactoe' ? 'bg-rose-500 text-white border-rose-500' : 'bg-rose-50 text-rose-700'}`}
          >
            ❌⭕ TicTac
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 animate-in fade-in duration-300 pb-32 lg:pb-16 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-3 overflow-y-auto' : ''}`}>
      
      {/* Ultra-Clean Responsive Navigation Header */}
      <div className="bg-white/80 backdrop-blur-xl p-3 md:p-5 rounded-[2rem] border border-rose-100 shadow-xl space-y-3">
        {/* Row 1: Back + Title */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all active:scale-95 flex items-center gap-1 text-xs font-bold shrink-0"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="min-w-0">
              <h3 className="text-base md:text-xl font-black italic tracking-tight text-gray-800 truncate">
                Love Doodle 🎨
              </h3>
              <p className="text-[10px] text-gray-400 font-medium truncate">
                with <span className="font-bold text-rose-500">{partnerName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all active:scale-95 text-xs font-bold"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              onClick={triggerUndo}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1"
            >
              <Undo size={13} /> Undo
            </button>

            <button
              onClick={triggerClear}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1"
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPNG}
            className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1"
          >
            <Download size={14} /> PNG 📥
          </button>

          <button
            onClick={handleSaveDoodle}
            disabled={isSaving}
            className="flex-[2] py-2 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save to Memories 💖"}
          </button>
        </div>
      </div>

      {/* Main Single-Canvas Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Desktop Left Toolbar Sidebar */}
        <div className="hidden lg:block lg:col-span-1 bg-white/80 backdrop-blur-xl p-5 rounded-[2.5rem] border border-rose-100 shadow-xl">
          <ControlsToolbar />
        </div>

        {/* Single Shared Canvas Container */}
        <div className="lg:col-span-3 bg-white/90 backdrop-blur-xl p-3 md:p-5 rounded-[2.5rem] border border-rose-100 shadow-xl relative flex flex-col items-center justify-center">
          
          {/* Partner Cursor Overlay */}
          {partnerCursor && (
            <div
              className="absolute z-30 pointer-events-none transition-all duration-75 flex items-center gap-1.5"
              style={{ left: partnerCursor.x, top: partnerCursor.y }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-lg animate-ping"
                style={{ backgroundColor: partnerCursor.color || '#3b82f6' }}
              />
              <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full shadow-md">
                {partnerCursor.name || partnerName} ✏️
              </span>
            </div>
          )}

          {/* SINGLE CANVAS DOM ELEMENT (Perfect 380px Mobile Height) */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-[380px] md:h-[550px] rounded-2xl cursor-crosshair touch-none border border-rose-100 shadow-inner bg-white"
          />

          <div className="mt-2.5 flex items-center justify-between w-full text-[10px] md:text-xs text-gray-400 font-medium px-2">
            <span>🎨 Tip: Draw together live with {partnerName}!</span>
            <span className="flex items-center gap-1 font-bold text-rose-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-time
            </span>
          </div>
        </div>

        {/* Mobile In-Line Controls Toolbar (No Overlapping Floating Sheets!) */}
        <div className="lg:hidden col-span-1 bg-white/90 backdrop-blur-xl p-4 rounded-[2rem] border border-rose-100 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2">
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Palette size={15} className="text-rose-500" /> Drawing Tools & Palette
            </h4>
          </div>
          <ControlsToolbar />
        </div>

      </div>

      {/* Saved Doodles Gallery */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2.5rem] border border-rose-100 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base md:text-lg font-black italic tracking-tight text-gray-800 flex items-center gap-2">
            Saved Love Doodles ({savedDoodles.length}) 🖼️
          </h4>
          <button
            onClick={fetchSavedDoodles}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            title="Refresh Doodles"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {savedDoodles.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs italic bg-rose-50/50 rounded-2xl border border-dashed border-rose-200">
            No saved doodles yet. Draw something romantic together and click "Save to Memories"! 🎨💖
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {savedDoodles.map((d) => (
              <div key={d._id} className="group relative bg-white p-2 rounded-2xl border border-rose-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                <img
                  src={d.imageUrl}
                  alt={d.title}
                  className="w-full h-28 md:h-32 object-cover rounded-xl border border-gray-100"
                />
                <div className="p-1.5 space-y-0.5">
                  <p className="text-xs font-black text-gray-800 truncate">{d.title}</p>
                  <p className="text-[9px] text-gray-400 font-medium">By {d.savedByName}</p>
                </div>

                {/* Overlay Action Buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex items-center justify-center gap-2 p-2">
                  <button
                    onClick={() => setPreviewDoodle(d)}
                    className="p-2 bg-white text-gray-800 rounded-xl hover:bg-rose-50 transition-all"
                    title="View Fullscreen"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteDoodle(d._id)}
                    className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Fullscreen Modal */}
      {previewDoodle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-white p-5 rounded-[2.5rem] shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base md:text-lg font-black text-gray-800">{previewDoodle.title}</h3>
                <p className="text-xs text-gray-400">Saved by {previewDoodle.savedByName}</p>
              </div>
              <button
                onClick={() => setPreviewDoodle(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={previewDoodle.imageUrl}
              alt={previewDoodle.title}
              className="w-full max-h-[65vh] object-contain rounded-2xl border border-gray-100 shadow-inner"
            />
            <div className="flex justify-end gap-2">
              <a
                href={previewDoodle.imageUrl}
                download="LoveDoodle.png"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs shadow-md transition-all"
              >
                Download PNG 📥
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoveDoodleBoard;
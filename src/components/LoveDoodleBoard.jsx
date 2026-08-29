import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Sparkles, Heart, Trash2, Download, Save, Undo, RefreshCw, 
  ArrowLeft, Eye, Maximize2, Minimize2, Palette, ChevronUp, ChevronDown, X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import canvasConfetti from 'canvas-confetti';
import API_URL from '../utils/config';

const LoveDoodleBoard = ({ user, roomId, socket, onBack, partnerName = "Partner" }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState('#f43f5e');
  const [brushSize, setBrushSize] = useState(8);
  const [brushMode, setBrushMode] = useState('brush');
  const [activeStamp, setActiveStamp] = useState(null);
  const [history, setHistory] = useState([]);
  const [savedDoodles, setSavedDoodles] = useState([]);
  const [partnerCursor, setPartnerCursor] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [previewDoodle, setPreviewDoodle] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Mobile bottom sheet state
  const [showToolbar, setShowToolbar] = useState(false);
  const [activeToolSection, setActiveToolSection] = useState('brush'); // brush | color | stamp | template

  const userId = user._id || user.id;
  const myName = user.name || "Your Love";

  const colors = ['#f43f5e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#000000','#ffffff'];
  const stamps = ['❤️','💋','👑','✨','🧸','🌹','💍','🔥'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    applyTemplate(selectedTemplate, ctx, rect.width, rect.height);
    saveState();
    fetchSavedDoodles();
  }, []);

  const fetchSavedDoodles = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/doodle/${roomId}`);
      setSavedDoodles(res.data);
    } catch (err) { console.error(err); }
  };

  const applyTemplate = (tmpl, ctx, width, height) => {
    if (!ctx) return;
    const w = width || canvasRef.current?.clientWidth;
    const h = height || canvasRef.current?.clientHeight;
    ctx.save();
    if (tmpl === 'starry') {
      ctx.fillStyle = '#0f172a';
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
      ctx.moveTo(w/3, 40); ctx.lineTo(w/3, h-40);
      ctx.moveTo((2*w)/3, 40); ctx.lineTo((2*w)/3, h-40);
      ctx.moveTo(40, h/3); ctx.lineTo(w-40, h/3);
      ctx.moveTo(40, (2*h)/3); ctx.lineTo(w-40, (2*h)/3);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  };

  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    applyTemplate(tmpl, ctxRef.current);
    saveState();
    if (socket) socket.emit("canvas_clear", { roomId });
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    const imageData = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), imageData]);
  };

  useEffect(() => {
    if (!socket) return;
    const handleDrawStroke = (data) => drawSegmentOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.mode);
    const handleCursorMove = (data) => setPartnerCursor(data);
    const handleCanvasClear = () => {
      const canvas = canvasRef.current;
      if (!canvas || !ctxRef.current) return;
      applyTemplate(selectedTemplate, ctxRef.current);
      saveState();
      toast("Partner cleared the canvas! 🧹", { icon: '🎨' });
    };
    const handleDoodleSaved = (data) => {
      fetchSavedDoodles();
      toast.success(`${data.savedByName || 'Partner'} saved a doodle! 💖`);
      canvasConfetti({ particleCount: 50, spread: 60 });
    };
    const handleStrokeUndo = () => { handleUndoLocal(); };
    const handleStampPlace = (data) => drawStampOnCanvas(data.x, data.y, data.emoji);

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

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

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

  const startDrawing = (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (activeStamp) {
      drawStampOnCanvas(pos.x, pos.y, activeStamp);
      saveState();
      if (socket) socket.emit("stamp_place", { roomId, x: pos.x, y: pos.y, emoji: activeStamp });
      return;
    }
    setIsDrawing(true);
    setLastPos(pos);
  };

  const draw = (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (socket && Math.random() > 0.4) {
      socket.emit("cursor_move", { roomId, x: pos.x, y: pos.y, name: myName, color });
    }
    if (!isDrawing || activeStamp) return;
    drawSegmentOnCanvas(lastPos.x, lastPos.y, pos.x, pos.y, color, brushSize, brushMode);
    if (socket) {
      socket.emit("draw_stroke", { roomId, x0: lastPos.x, y0: lastPos.y, x1: pos.x, y1: pos.y, color, size: brushSize, mode: brushMode });
    }
    setLastPos(pos);
  };

  const stopDrawing = (e) => {
    e?.preventDefault();
    if (isDrawing) { setIsDrawing(false); saveState(); }
  };

  const handleUndoLocal = () => {
    if (history.length <= 1) return;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];
    if (previousState) { ctx.putImageData(previousState, 0, 0); setHistory(newHistory); }
  };

  const triggerUndo = () => { handleUndoLocal(); if (socket) socket.emit("stroke_undo", { roomId }); };
  const triggerClear = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    applyTemplate(selectedTemplate, ctxRef.current);
    saveState();
    if (socket) socket.emit("canvas_clear", { roomId });
    toast.success("Canvas cleared! 🧹");
  };

  const handleSaveDoodle = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    const saveToast = toast.loading("Saving... 🎨");
    try {
      const imageBase64 = canvas.toDataURL("image/png");
      const res = await axios.post(`${API_URL}/api/doodle/save`, {
        roomId, imageBase64, savedBy: userId, savedByName: myName,
        title: `${myName} & ${partnerName}'s Doodle ❤️`
      });
      toast.success("Saved to Memories! 🖼️💖", { id: saveToast });
      fetchSavedDoodles();
      canvasConfetti({ particleCount: 100, spread: 70 });
      if (socket) socket.emit("doodle_saved", { roomId, imageUrl: res.data.imageUrl, savedByName: myName });
    } catch (err) {
      toast.error("Failed to save!", { id: saveToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `LoveVerse-Doodle-${Date.now()}.png`;
    link.click();
  };

  const handleDeleteDoodle = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/doodle/${id}`);
      toast.success("Deleted!");
      fetchSavedDoodles();
    } catch (err) { toast.error("Delete failed!"); }
  };

  // Mobile toolbar sections
  const ToolSection = () => (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'brush', label: '🖌️ Brush' },
          { id: 'color', label: '🎨 Color' },
          { id: 'stamp', label: '💖 Stamps' },
          { id: 'template', label: '🖼️ BG' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveToolSection(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${
              activeToolSection === tab.id ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Brush Section */}
      {activeToolSection === 'brush' && (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Brush Size ({brushSize}px)</p>
            <div className="flex gap-2">
              {[4, 8, 16, 28].map(size => (
                <button key={size} onClick={() => setBrushSize(size)}
                  className={`flex-1 py-3 rounded-xl border flex items-center justify-center transition-all ${
                    brushSize === size ? 'bg-rose-500 border-rose-500' : 'bg-gray-50 border-gray-200'
                  }`}>
                  <span style={{ width: size/2, height: size/2, backgroundColor: brushSize === size ? 'white' : 'black' }} className="rounded-full inline-block" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Style</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mode: 'brush', label: '✏️', bg: 'bg-rose-500' },
                { mode: 'neon', label: '✨', bg: 'bg-purple-600' },
                { mode: 'rainbow', label: '🌈', bg: 'bg-amber-500' },
                { mode: 'eraser', label: '🧹', bg: 'bg-slate-700' },
              ].map(b => (
                <button key={b.mode} onClick={() => { setBrushMode(b.mode); setActiveStamp(null); }}
                  className={`py-3 rounded-xl text-lg transition-all ${
                    brushMode === b.mode && !activeStamp ? `${b.bg} text-white scale-105` : 'bg-gray-100'
                  }`}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Color Section */}
      {activeToolSection === 'color' && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {colors.map(c => (
              <button key={c} onClick={() => { setColor(c); if (brushMode === 'eraser') setBrushMode('brush'); }}
                className={`h-12 rounded-2xl border-2 transition-all ${color === c ? 'border-gray-800 scale-110 shadow-lg' : 'border-white'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <input type="color" value={color}
            onChange={(e) => { setColor(e.target.value); if (brushMode === 'eraser') setBrushMode('brush'); }}
            className="w-full h-12 rounded-2xl cursor-pointer border border-gray-200 p-1" />
        </div>
      )}

      {/* Stamp Section */}
      {activeToolSection === 'stamp' && (
        <div className="grid grid-cols-4 gap-3">
          {stamps.map(s => (
            <button key={s} onClick={() => setActiveStamp(activeStamp === s ? null : s)}
              className={`h-14 rounded-2xl text-2xl flex items-center justify-center border-2 transition-all ${
                activeStamp === s ? 'bg-rose-100 border-rose-500 scale-110 shadow-lg' : 'bg-gray-50 border-gray-200'
              }`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Template Section */}
      {activeToolSection === 'template' && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'blank', label: '⚪ Blank', cls: 'bg-white' },
            { id: 'starry', label: '🌌 Starry', cls: 'bg-slate-900 text-white' },
            { id: 'tictactoe', label: '❌⭕ TicTac', cls: 'bg-rose-50' },
          ].map(t => (
            <button key={t.id} onClick={() => handleSelectTemplate(t.id)}
              className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${t.cls} ${
                selectedTemplate === t.id ? 'border-rose-500 scale-105' : 'border-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`animate-in fade-in duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-2 overflow-y-auto' : 'pb-32 lg:pb-16'}`}>
      
      {/* ===== MOBILE LAYOUT ===== */}
      <div className="lg:hidden flex flex-col h-full">
        
        {/* Mobile Top Bar */}
        <div className="flex items-center justify-between p-3 bg-white/90 backdrop-blur-xl rounded-[2rem] mb-3 shadow-lg border border-rose-100">
          <button onClick={onBack} className="p-2 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-1 text-xs font-black">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="text-center">
            <h3 className="text-sm font-black text-gray-800">Love Doodle 🎨</h3>
            <p className="text-[9px] text-gray-400">with <span className="text-rose-500 font-bold">{partnerName}</span></p>
          </div>
          <div className="flex gap-1">
            <button onClick={triggerUndo} className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Undo size={14} />
            </button>
            <button onClick={triggerClear} className="p-2 bg-red-50 text-red-500 rounded-xl">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Mobile Canvas — Full Width, Big */}
        <div className="relative bg-white rounded-[2rem] shadow-lg border border-rose-100 mx-0">
          {partnerCursor && (
            <div className="absolute z-30 pointer-events-none" style={{ left: partnerCursor.x, top: partnerCursor.y }}>
              <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg animate-ping"
                style={{ backgroundColor: partnerCursor.color || '#3b82f6' }} />
              <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">
                {partnerCursor.name} ✏️
              </span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
            className="w-full rounded-[2rem] cursor-crosshair touch-none bg-white"
            style={{ height: '55vh' }}
          />
          <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[9px] text-gray-400 font-bold">
            <span>🎨 Draw together!</span>
            <span className="text-rose-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Live
            </span>
          </div>
        </div>

        {/* Mobile Quick Actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={handleDownloadPNG}
            className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs flex items-center justify-center gap-1">
            <Download size={14} /> PNG
          </button>
          <button onClick={handleSaveDoodle} disabled={isSaving}
            className="flex-[2] py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1 shadow-lg">
            <Save size={14} /> {isSaving ? "Saving..." : "Save to Memories 💖"}
          </button>
        </div>

        {/* Saved Doodles Mobile */}
        {savedDoodles.length > 0 && (
          <div className="mt-3 bg-white/80 rounded-[2rem] p-4 border border-rose-100 shadow-lg">
            <p className="text-xs font-black text-gray-700 mb-3">Saved Doodles ({savedDoodles.length}) 🖼️</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {savedDoodles.map(d => (
                <div key={d._id} className="flex-shrink-0 w-24">
                  <img src={d.imageUrl} alt={d.title}
                    className="w-24 h-24 object-cover rounded-2xl border border-rose-100 shadow-sm"
                    onClick={() => setPreviewDoodle(d)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden lg:block space-y-6">
        {/* Desktop Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] border border-rose-100 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl flex items-center gap-2 text-xs font-bold">
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h3 className="text-2xl font-black italic text-gray-800">Love Doodle Board 🎨</h3>
              <p className="text-xs text-gray-400">Draw real-time with <span className="font-bold text-rose-500">{partnerName}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={triggerUndo} className="px-4 py-3 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black flex items-center gap-1.5">
              <Undo size={14} /> Undo
            </button>
            <button onClick={triggerClear} className="px-4 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-black flex items-center gap-1.5">
              <Trash2 size={14} /> Clear
            </button>
            <button onClick={handleDownloadPNG} className="px-4 py-3 bg-blue-50 text-blue-600 rounded-2xl text-xs font-black flex items-center gap-1.5">
              <Download size={14} /> PNG
            </button>
            <button onClick={handleSaveDoodle} disabled={isSaving}
              className="px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl text-xs font-black shadow-lg flex items-center gap-2">
              <Save size={16} /> {isSaving ? "Saving..." : "Save to Memories 🖼️"}
            </button>
          </div>
        </div>

        {/* Desktop Grid */}
        <div className="grid grid-cols-4 gap-6">
          {/* Desktop Toolbar */}
          <div className="col-span-1 bg-white/80 backdrop-blur-xl p-5 rounded-[2.5rem] border border-rose-100 shadow-xl space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Brush Size ({brushSize}px)</label>
              <div className="flex items-center gap-2">
                {[4,8,16,28].map(size => (
                  <button key={size} onClick={() => setBrushSize(size)}
                    className={`flex-1 py-2.5 rounded-xl border flex items-center justify-center ${brushSize === size ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-50 border-gray-200'}`}>
                    <span style={{ width: size/2, height: size/2 }} className="rounded-full bg-current inline-block" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Brush Style</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'brush', label: '✏️ Normal', active: 'bg-rose-500 text-white', inactive: 'bg-gray-50 text-gray-700' },
                  { mode: 'neon', label: '✨ Neon', active: 'bg-purple-600 text-white', inactive: 'bg-purple-50 text-purple-700' },
                  { mode: 'rainbow', label: '🌈 Rainbow', active: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-700' },
                  { mode: 'eraser', label: '🧹 Eraser', active: 'bg-slate-700 text-white', inactive: 'bg-slate-50 text-slate-700' },
                ].map(b => (
                  <button key={b.mode} onClick={() => { setBrushMode(b.mode); setActiveStamp(null); }}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${brushMode === b.mode && !activeStamp ? b.active : b.inactive}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Colors</label>
              <div className="grid grid-cols-4 gap-2">
                {colors.map(c => (
                  <button key={c} onClick={() => { setColor(c); if (brushMode === 'eraser') setBrushMode('brush'); }}
                    className={`w-full h-10 rounded-xl border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-white'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <input type="color" value={color} onChange={e => { setColor(e.target.value); if (brushMode === 'eraser') setBrushMode('brush'); }}
                className="mt-2 w-full h-9 rounded-xl cursor-pointer bg-white p-1 border border-gray-200" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stamps 💖</label>
              <div className="grid grid-cols-4 gap-2">
                {stamps.map(s => (
                  <button key={s} onClick={() => setActiveStamp(activeStamp === s ? null : s)}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center border-2 ${activeStamp === s ? 'bg-rose-100 border-rose-500 scale-110' : 'bg-gray-50 border-gray-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Background</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'blank', label: '⚪ Blank' },
                  { id: 'starry', label: '🌌 Starry' },
                  { id: 'tictactoe', label: '❌⭕' },
                ].map(t => (
                  <button key={t.id} onClick={() => handleSelectTemplate(t.id)}
                    className={`py-2 rounded-xl text-xs font-bold border ${selectedTemplate === t.id ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Canvas */}
          <div className="col-span-3 bg-white/90 backdrop-blur-xl p-4 rounded-[2.5rem] border border-rose-100 shadow-xl relative flex flex-col">
            {partnerCursor && (
              <div className="absolute z-30 pointer-events-none" style={{ left: partnerCursor.x, top: partnerCursor.y }}>
                <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg animate-ping"
                  style={{ backgroundColor: partnerCursor.color || '#3b82f6' }} />
                <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full">
                  {partnerCursor.name} ✏️
                </span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
              className="w-full h-[550px] rounded-2xl cursor-crosshair touch-none border border-rose-100 bg-white"
            />
            <div className="mt-3 flex justify-between text-xs text-gray-400 font-medium px-2">
              <span>🎨 Draw together in real-time!</span>
              <span className="text-rose-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Real-time Sync Active
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Saved Doodles */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-rose-100 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-black text-gray-800">Saved Love Doodles ({savedDoodles.length}) 🖼️</h4>
            <button onClick={fetchSavedDoodles} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
              <RefreshCw size={16} />
            </button>
          </div>
          {savedDoodles.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs italic bg-rose-50/50 rounded-2xl border border-dashed border-rose-200">
              No saved doodles yet. Draw something romantic and save! 🎨💖
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {savedDoodles.map(d => (
                <div key={d._id} className="group relative bg-white p-2 rounded-2xl border border-rose-100 shadow-sm hover:shadow-lg transition-all">
                  <img src={d.imageUrl} alt={d.title} className="w-full h-32 object-cover rounded-xl" />
                  <p className="text-xs font-black text-gray-800 mt-2 truncate">{d.title}</p>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex items-center justify-center gap-2">
                    <button onClick={() => setPreviewDoodle(d)} className="p-2 bg-white text-gray-800 rounded-xl"><Eye size={16} /></button>
                    <button onClick={() => handleDeleteDoodle(d._id)} className="p-2 bg-red-500 text-white rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== MOBILE BOTTOM TOOLBAR (Fixed) ===== */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40">
        {/* Toggle Button */}
        <div className="flex justify-center mb-2">
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className="flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-full shadow-2xl font-black text-xs"
          >
            <Palette size={16} />
            {showToolbar ? 'Hide Tools' : 'Show Tools'}
            {showToolbar ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Bottom Sheet */}
        {showToolbar && (
          <div className="bg-white/95 backdrop-blur-xl border-t border-rose-100 shadow-2xl rounded-t-[2rem] p-4 max-h-[40vh] overflow-y-auto">
            <ToolSection />
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoodle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-white p-6 rounded-[2.5rem] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-800">{previewDoodle.title}</h3>
              <button onClick={() => setPreviewDoodle(null)} className="p-2 text-gray-400 bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>
            <img src={previewDoodle.imageUrl} alt={previewDoodle.title} className="w-full max-h-[70vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoveDoodleBoard;
import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Heart, RefreshCw, Touchpad, Palette, ShieldCheck, Zap } from 'lucide-react';
import Confetti from 'react-confetti';
import toast from 'react-hot-toast';

const TRAIL_COLORS = [
  { id: 'rose', name: 'Rose Romance 💖', myColor: '#ff4d6d', partnerColor: '#38bdf8' },
  { id: 'gold', name: 'Golden Glow ✨', myColor: '#fbbf24', partnerColor: '#a855f7' },
  { id: 'emerald', name: 'Emerald Spark 💫', myColor: '#34d399', partnerColor: '#f43f5e' }
];

export default function VirtualTouch({ user, roomId, socket }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  
  const [selectedTheme, setSelectedTheme] = useState(TRAIL_COLORS[0]);
  const [myNormPos, setMyNormPos] = useState(null);
  const [partnerNormPos, setPartnerNormPos] = useState(null);
  const [partnerActive, setPartnerActive] = useState(false);
  const [showSparkConfetti, setShowSparkConfetti] = useState(false);
  const [touchCount, setTouchCount] = useState(0);

  const userId = user._id || user.id;

  // Handle Socket Events for Partner Touch
  useEffect(() => {
    if (!socket) return;

    socket.on('partner_touch_move', (data) => {
      setPartnerNormPos({ x: data.nx, y: data.ny });
      setPartnerActive(true);

      const canvas = canvasRef.current;
      if (canvas) {
        const px = data.nx * canvas.width;
        const py = data.ny * canvas.height;
        
        // Spawn particles for partner
        spawnParticles(px, py, selectedTheme.partnerColor, 'Partner ❤️');

        // Proximity Spark Check (Distance < 10% of canvas width)
        if (myNormPos) {
          const dx = data.nx - myNormPos.x;
          const dy = data.ny - myNormPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.12 && !showSparkConfetti) {
            triggerSparkBurst(px, py);
          }
        }
      }
    });

    socket.on('partner_touch_end', () => {
      setPartnerNormPos(null);
    });

    return () => {
      socket.off('partner_touch_move');
      socket.off('partner_touch_end');
    };
  }, [socket, myNormPos, selectedTheme, showSparkConfetti]);

  // Particle Physics Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Resize canvas to parent container
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 460;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 60FPS Canvas Animation Loop
    const render = () => {
      // Semi-transparent fade background for motion trail effect
      ctx.fillStyle = 'rgba(9, 5, 29, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update & Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size *= 0.96;

        if (p.alpha <= 0 || p.size <= 0.5) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fill();

        if (p.label) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(p.label, p.x, p.y - p.size - 6);
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Spawn trail particles helper
  const spawnParticles = (x, y, color, label = null) => {
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        size: Math.random() * 10 + 6,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015,
        label: i === 0 ? label : null
      });
    }
  };

  // Trigger Spark Explosion when touches align
  const triggerSparkBurst = (x, y) => {
    setShowSparkConfetti(true);
    setTouchCount(prev => prev + 1);
    toast.success("✨ Connection Spark! Your fingertips met! 💖", {
      icon: '💖',
      duration: 3500
    });

    // Spawn 40 explosive spark particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 14 + 6,
        color: ['#ff4d6d', '#fbbf24', '#38bdf8', '#ffffff'][Math.floor(Math.random() * 4)],
        alpha: 1,
        decay: 0.02,
        label: i === 0 ? 'SPARK! 💥' : null
      });
    }

    setTimeout(() => setShowSparkConfetti(false), 3500);
  };

  // Touch & Pointer Move Handler (Normalized Coordinates)
  const handleTouchMove = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const nx = Math.max(0, Math.min(1, x / canvas.width));
    const ny = Math.max(0, Math.min(1, y / canvas.height));

    setMyNormPos({ x: nx, y: ny });
    spawnParticles(x, y, selectedTheme.myColor, 'You 💙');

    // Emit Normalized Coordinates over Socket
    if (socket) {
      socket.emit('touch_move', {
        roomId,
        userId,
        nx,
        ny
      });
    }
  };

  const handlePointerMove = (e) => {
    if (e.buttons > 0 || e.pointerType === 'touch' || e.type === 'pointerdown' || e.type === 'mousemove') {
      handleTouchMove(e.clientX, e.clientY);
    }
  };

  const handlePointerEnd = () => {
    setMyNormPos(null);
    if (socket) socket.emit('touch_end', { roomId, userId });
  };

  const clearCanvas = () => {
    particlesRef.current = [];
    setMyNormPos(null);
    setPartnerNormPos(null);
    toast.success("Touch Canvas Cleared!");
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-500 pb-16 px-4">
      {showSparkConfetti && <Confetti recycle={false} numberOfPieces={350} />}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-400 to-rose-500 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md">
          <Touchpad size={16} /> Real-Time Multi-Device Touch
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 italic">
          Virtual Touch 💖
        </h2>
        <p className="text-gray-500 font-bold text-sm max-w-md mx-auto italic">
          "Drag your finger or mouse across the canvas. Touch the same spot together to trigger a Connection Spark!"
        </p>
      </div>

      {/* CONTROLS & STATUS BAR */}
      <div className={`${glassStyle} p-6 space-y-4`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${partnerActive ? 'bg-green-500 animate-ping' : 'bg-gray-300'}`} />
            <div>
              <p className="text-xs font-black text-gray-800">
                {partnerActive ? 'Partner is Touching Canvas! 💖' : 'Waiting for Partner to Touch...'}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">
                {touchCount} Connection Sparks Triggered
              </p>
            </div>
          </div>

          {/* Theme Color Selector */}
          <div className="flex items-center gap-2">
            {TRAIL_COLORS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTheme(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedTheme.id === t.id
                    ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {t.name}
              </button>
            ))}
            
            <button
              onClick={clearCanvas}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all"
              title="Clear Canvas"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Interactive Smooth Canvas */}
        <div className="rounded-3xl overflow-hidden border-2 border-indigo-900/40 shadow-2xl relative cursor-crosshair touch-none bg-[#09051d]">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerMove}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerLeave={handlePointerEnd}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleTouchMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                handleTouchMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handlePointerEnd}
            className="w-full h-[460px] touch-none select-none"
          />

          {/* Canvas Helper Overlay */}
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex justify-between items-center text-white/50 text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedTheme.myColor }} />
              Your Finger / Cursor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: selectedTheme.partnerColor }} />
              Partner's Touch
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

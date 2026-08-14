import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Heart, RefreshCw, Zap, Touchpad } from 'lucide-react';
import Confetti from 'react-confetti';
import toast from 'react-hot-toast';

function VirtualTouch({ user, roomId, socket }) {
  const canvasRef = useRef(null);
  const [partnerPos, setPartnerPos] = useState(null);
  const [myPos, setMyPos] = useState(null);
  const [showSpark, setShowSpark] = useState(false);

  const userId = user._id || user.id;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 450;

    // Draw background
    ctx.fillStyle = '#09051d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('partner_touch_move', (data) => {
      setPartnerPos({ x: data.x, y: data.y });
      drawParticle(data.x, data.y, '#f43f5e', 'Partner');

      // Check proximity for connection spark
      if (myPos) {
        const dx = data.x - myPos.x;
        const dy = data.y - myPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 60) {
          triggerSparkExplosion(data.x, data.y);
        }
      }
    });

    return () => {
      socket.off('partner_touch_move');
    };
  }, [socket, myPos]);

  const drawParticle = (x, y, color, label) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.fill();

    // Draw glowing label
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x - 15, y - 18);
  };

  const triggerSparkExplosion = (x, y) => {
    setShowSpark(true);
    toast.success("Connection Made! Hearts Exploded! 💖✨");
    setTimeout(() => setShowSpark(false), 3000);
  };

  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMyPos({ x, y });
    drawParticle(x, y, '#38bdf8', 'You');

    if (socket) {
      socket.emit('touch_move', {
        roomId,
        userId,
        x,
        y
      });
    }

    // Check distance with partner
    if (partnerPos) {
      const dx = x - partnerPos.x;
      const dy = y - partnerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 60 && !showSpark) {
        triggerSparkExplosion(x, y);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#09051d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setMyPos(null);
    setPartnerPos(null);
    toast.success("Canvas Cleared!");
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-500 pb-16 px-4">
      {showSpark && <Confetti recycle={false} numberOfPieces={350} />}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-400 to-rose-500 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md">
          <Touchpad size={16} /> Real-Time Touch Canvas
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 italic">
          Virtual Touch 💖
        </h2>
        <p className="text-gray-500 font-bold text-sm max-w-md mx-auto italic">
          "Move your finger or cursor together. Touch at the same spot to spark connection fireworks!"
        </p>
      </div>

      {/* CANVAS CARD */}
      <div className={`${glassStyle} p-6 space-y-4 relative overflow-hidden`}>
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-sky-500">
              <span className="w-3 h-3 rounded-full bg-sky-400 inline-block shadow-sm" /> You
            </span>
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="w-3 h-3 rounded-full bg-rose-400 inline-block shadow-sm" /> Partner
            </span>
          </div>

          <button
            onClick={clearCanvas}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Clear Canvas
          </button>
        </div>

        {/* Interactive Canvas */}
        <div className="rounded-3xl overflow-hidden border-2 border-indigo-900/40 shadow-2xl relative cursor-crosshair">
          <canvas
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                const touch = e.touches[0];
                handlePointerMove({ clientX: touch.clientX, clientY: touch.clientY });
              }
            }}
            className="w-full h-[450px] touch-none"
          />
        </div>
      </div>
    </div>
  );
}

export default VirtualTouch;

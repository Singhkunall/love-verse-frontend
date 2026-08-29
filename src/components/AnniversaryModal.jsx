import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Gift, Award, Send, Flame, Trophy, Star, Music, X, Volume2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import canvasConfetti from 'canvas-confetti';

const AnniversaryModal = ({ isOpen, onClose, user, partnerName, socket, roomId }) => {
  const [activeTab, setActiveTab] = useState('celebrate');
  const [loveLetter, setLoveLetter] = useState('');
  const [savedLetter, setSavedLetter] = useState(localStorage.getItem(`anniversary_letter_${roomId}`) || '');
  const [isSent, setIsSent] = useState(!!localStorage.getItem(`anniversary_letter_${roomId}`));

  // Fire celebratory fireworks confetti when modal opens
  useEffect(() => {
    if (isOpen) {
      fireFireworks();
      const interval = setInterval(fireFireworks, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fireFireworks = () => {
    try {
      const count = 200;
      const defaults = { origin: { y: 0.7 } };
      function fire(particleRatio, opts) {
        canvasConfetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      }
      fire(0.25, { spread: 26, startVelocity: 55, colors: ['#f43f5e', '#fb7185', '#f59e0b'] });
      fire(0.2, { spread: 60, colors: ['#e11d48', '#d97706', '#ffffff'] });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#ff007f', '#ffd700'] });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, colors: ['#f43f5e', '#ffffff'] });
      fire(0.1, { spread: 120, startVelocity: 45, colors: ['#f59e0b', '#fb7185'] });
    } catch (e) {
      console.warn("Confetti error:", e);
    }
  };

  const handleSendToast = () => {
    fireFireworks();
    if (socket && roomId) {
      socket.emit("send_anniversary_toast", {
        roomId,
        senderName: user.name || "Your Love"
      });
    }
    toast.success("Anniversary Toast Sent! 🥂❤️ Partner will receive a fireworks notification!", {
      duration: 5000,
      icon: '🥂'
    });
  };

  const handleSaveLetter = (e) => {
    e.preventDefault();
    if (!loveLetter.trim()) return toast.error("Write a sweet note first! ✍️");
    localStorage.setItem(`anniversary_letter_${roomId}`, loveLetter);
    setSavedLetter(loveLetter);
    setIsSent(true);
    fireFireworks();
    if (socket && roomId) {
      socket.emit("send_anniversary_letter", {
        roomId,
        senderName: user.name || "Your Love",
        letter: loveLetter
      });
    }
    toast.success("1-Year Anniversary Love Letter Sealed & Sent! 💌💖");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
      {/* Golden Glowing Card */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#2d0916] via-[#1a040d] to-[#0d0106] border-2 border-amber-400/40 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl overflow-hidden my-8">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-rose-200/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-95 z-20"
        >
          <X size={20} />
        </button>

        {/* Header Badge */}
        <div className="text-center space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase shadow-lg">
            <Trophy size={14} className="text-amber-400 animate-bounce" />
            1-Year Anniversary Special
          </div>

          <h2 className="text-3xl md:text-4xl font-black italic tracking-tight bg-gradient-to-r from-amber-200 via-rose-200 to-amber-400 bg-clip-text text-transparent">
            Happy 1st Anniversary! 🎉
          </h2>
          <p className="text-xs md:text-sm text-rose-200/90 font-medium">
            365 Days of Togetherness with <span className="font-bold text-amber-300">{partnerName}</span>
          </p>
        </div>

        {/* 365 Days Stats Grid */}
        <div className="grid grid-cols-2 gap-3 my-6 relative z-10">
          <div className="p-3.5 bg-white/5 border border-amber-400/20 rounded-2xl text-center backdrop-blur-md">
            <span className="text-2xl md:text-3xl font-black text-amber-300 block">365</span>
            <span className="text-[10px] font-bold text-rose-200/70 uppercase tracking-widest">Days of Pure Love</span>
          </div>

          <div className="p-3.5 bg-white/5 border border-rose-400/20 rounded-2xl text-center backdrop-blur-md">
            <span className="text-2xl md:text-3xl font-black text-rose-300 block">8,760</span>
            <span className="text-[10px] font-bold text-rose-200/70 uppercase tracking-widest">Hours Together</span>
          </div>

          <div className="p-3.5 bg-white/5 border border-rose-400/20 rounded-2xl text-center backdrop-blur-md">
            <span className="text-2xl md:text-3xl font-black text-pink-300 block">525,600</span>
            <span className="text-[10px] font-bold text-rose-200/70 uppercase tracking-widest">Minutes Connected</span>
          </div>

          <div className="p-3.5 bg-white/5 border border-amber-400/20 rounded-2xl text-center backdrop-blur-md">
            <span className="text-2xl md:text-3xl font-black text-amber-400 block">31.5M+</span>
            <span className="text-[10px] font-bold text-rose-200/70 uppercase tracking-widest">Heartbeats Shared</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/10 p-1 rounded-2xl mb-6 relative z-10">
          <button
            onClick={() => setActiveTab('celebrate')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'celebrate' ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md' : 'text-rose-200/70 hover:text-white'
            }`}
          >
            <Sparkles size={14} /> Toast & Fireworks 🥂
          </button>
          <button
            onClick={() => setActiveTab('letter')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'letter' ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md' : 'text-rose-200/70 hover:text-white'
            }`}
          >
            <Gift size={14} /> Anniversary Letter 💌
          </button>
        </div>

        {/* Tab 1: Celebrate Toast */}
        {activeTab === 'celebrate' && (
          <div className="space-y-4 text-center relative z-10 animate-in fade-in duration-300">
            <div className="p-4 bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-amber-400/30 rounded-2xl text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Star size={16} className="fill-amber-400" />
                1-Year Milestone Achievement
              </div>
              <p className="text-xs text-rose-100/80 leading-relaxed">
                "One year ago today, two souls joined in Love-Verse. 365 days of laughter, late-night calls, shared movies, games, and infinite memories. Here's to forever!"
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={handleSendToast}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={18} /> Send Anniversary Toast & Fireworks 🥂
              </button>

              <button
                onClick={fireFireworks}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-rose-100 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Flame size={16} className="text-amber-400" /> Burst Celebration Fireworks 🎆
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Anniversary Love Letter */}
        {activeTab === 'letter' && (
          <div className="space-y-4 relative z-10 animate-in fade-in duration-300">
            {isSent ? (
              <div className="p-5 bg-gradient-to-tr from-amber-500/10 to-rose-500/10 border border-amber-400/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle size={16} className="text-emerald-400" /> Sealed 1-Year Love Letter
                </div>
                <p className="text-xs text-rose-100 italic leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/10">
                  "{savedLetter}"
                </p>
                <button
                  onClick={() => setIsSent(false)}
                  className="text-xs text-amber-300 font-bold underline hover:text-white"
                >
                  Edit Love Letter ✍️
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveLetter} className="space-y-3">
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-widest">
                  Write Your 1-Year Secret Anniversary Letter for {partnerName} 💌
                </label>
                <textarea
                  value={loveLetter}
                  onChange={(e) => setLoveLetter(e.target.value)}
                  placeholder={`Write your romantic thoughts, favorite memory from this 1 year, and promises for the future with ${partnerName}...`}
                  rows={5}
                  className="w-full p-3.5 bg-black/40 border border-amber-400/30 rounded-2xl text-xs text-rose-100 placeholder-rose-300/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white rounded-2xl font-black text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={14} /> Seal & Send 1-Year Letter 💌
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AnniversaryModal;

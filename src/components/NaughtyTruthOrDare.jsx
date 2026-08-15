import React, { useState, useEffect, useRef } from 'react';
import { Flame, Heart, Sparkles, ArrowLeft, RefreshCw, Trophy, Lock, CheckCircle2, RotateCw, Zap, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

const MODES = [
  { id: 'sweet', name: 'Sweet Romance 💖', color: 'from-pink-500 to-rose-500' },
  { id: 'flirty', name: 'Flirty & Naughty 🔥', color: 'from-purple-600 to-rose-600' },
  { id: 'passion', name: 'Extreme Passion 💋', color: 'from-red-600 to-pink-700' }
];

const PROMPTS = {
  sweet: {
    truths: [
      "What was the exact moment you realized you had feelings for me? 💖",
      "Which habit of mine do you secretly find super cute? 🙈",
      "What is your favorite memory of us together so far? 🌟",
      "If we could fly anywhere in the world right now, where would you take me? ✈️",
      "What outfit of mine makes your heart beat the fastest? 👗👔"
    ],
    dares: [
      "Give me a 20-second warm hug and whisper why you love me 💖",
      "Hold my hands, look into my eyes for 30 seconds without laughing 🙈",
      "Sing 2 lines of your favorite romantic song dedicated to me 🎶",
      "Give me 3 sweet kisses on my forehead, cheek, and lips 💋",
      "Whisper a cute secret nickname in my ear 🤫"
    ]
  },
  flirty: {
    truths: [
      "What is one romantic fantasy about us you haven't told me yet? 🔥",
      "Which part of my body do you find the most irresistible? 💋",
      "What was your first spicy thought about me? 🙈",
      "What would be your dream romantic date night scenario? 🥂",
      "When do you find me the most attractive during the day? ✨"
    ],
    dares: [
      "Give me a slow, passionate kiss for 10 seconds 💋",
      "Gently trace your fingers down my back and whisper something naughty 🤫",
      "Give me a 1-minute relaxing neck and shoulder massage 💆‍♀️💆‍♂️",
      "Nibble gently on my ear and whisper your favorite fantasy 🔥",
      "Do a 15-second seductive dance just for me 💃🕺"
    ]
  },
  passion: {
    truths: [
      "What is the wild romantic dream you want us to fulfill together? 💋🔥",
      "What turn-on makes you instantly crave my affection? 🌶️",
      "What is your favorite romantic secret about our relationship? 🔐",
      "Describe our most passionate moment together in 3 words 💖",
      "If you could whisper anything in my ear right now, what would it be? 🤫"
    ],
    dares: [
      "Give me a deep, unforgettable 15-second romantic kiss 💋🔥",
      "Hold me close and whisper 3 things you want to do with me tonight 🌙",
      "Give me a soft kiss on my neck and hold my waist tightly 💖",
      "Let me choose a romantic reward that you must fulfill tonight 🎁",
      "Feed me a piece of chocolate/fruit in the most romantic way possible 🍓"
    ]
  }
};

const WHEEL_SECTIONS = [
  { label: 'Truth 💖', type: 'truth', color: '#f43f5e' },
  { label: 'Naughty Dare 🔥', type: 'dare', color: '#9333ea' },
  { label: 'Sensual Truth 💋', type: 'truth', color: '#e11d48' },
  { label: 'Spicy Dare 🌶️', type: 'dare', color: '#c026d3' },
  { label: 'Sweet Truth 🙈', type: 'truth', color: '#fb7185' },
  { label: 'Romantic Dare 🌹', type: 'dare', color: '#be123c' },
  { label: 'Secret Reward 🎁', type: 'reward', color: '#a855f7' },
  { label: 'Wild Dare 💥', type: 'dare', color: '#e11d48' }
];

function NaughtyTruthOrDare({ user, roomId, socket, onBack }) {
  const [activeMode, setActiveMode] = useState('flirty');
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [score, setScore] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const userId = user._id || user.id;
  const partnerName = (typeof user?.partnerId === 'object' && user.partnerId?.name) || user?.partnerName || 'Partner';

  useEffect(() => {
    if (!socket) return;

    socket.emit("join_chat", roomId);

    const handleSpin = (data) => {
      if (data.senderId !== userId) {
        setIsSpinning(true);
        setRotationAngle(data.rotationAngle);
        setTimeout(() => {
          setIsSpinning(false);
          setCurrentPrompt(data.prompt);
          toast(`${data.senderName || 'Partner'} spun the wheel! 🎲`, { icon: '🔥' });
        }, 3500);
      }
    };

    const handleCompleted = (data) => {
      if (data.senderId !== userId) {
        toast.success(`${data.senderName || 'Partner'} completed the challenge! +${data.pts} pts 💖`, { duration: 4000 });
      }
    };

    socket.on("receive_naughty_spin", handleSpin);
    socket.on("receive_naughty_completed", handleCompleted);

    return () => {
      socket.off("receive_naughty_spin", handleSpin);
      socket.off("receive_naughty_completed", handleCompleted);
    };
  }, [socket, roomId, userId]);

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setCurrentPrompt(null);

    // Calculate random 5-8 full spins plus random section offset
    const randomSpins = 360 * (5 + Math.floor(Math.random() * 4));
    const sectionIndex = Math.floor(Math.random() * WHEEL_SECTIONS.length);
    const sectionAngle = 360 / WHEEL_SECTIONS.length;
    const finalAngle = rotationAngle + randomSpins + (sectionIndex * sectionAngle) + (sectionAngle / 2);

    setRotationAngle(finalAngle);

    // Pick prompt based on landed section
    const selectedSection = WHEEL_SECTIONS[sectionIndex];
    let promptText = "";
    const pool = PROMPTS[activeMode];

    if (selectedSection.type === 'reward') {
      promptText = "🎁 Secret Romance Reward: You get 1 Special Wish from your partner that they MUST fulfill tonight!";
    } else if (selectedSection.type === 'truth') {
      promptText = pool.truths[Math.floor(Math.random() * pool.truths.length)];
    } else {
      promptText = pool.dares[Math.floor(Math.random() * pool.dares.length)];
    }

    const resultPrompt = {
      section: selectedSection,
      text: promptText,
      mode: activeMode
    };

    // Emit Socket event to partner
    if (socket) {
      socket.emit("send_naughty_spin", {
        roomId,
        senderId: userId,
        senderName: user.name || 'Partner',
        rotationAngle: finalAngle,
        prompt: resultPrompt
      });
    }

    setTimeout(() => {
      setIsSpinning(false);
      setCurrentPrompt(resultPrompt);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }, 3500);
  };

  const handleCompleteChallenge = () => {
    const pts = activeMode === 'passion' ? 30 : activeMode === 'flirty' ? 20 : 10;
    setScore(prev => prev + pts);
    setCompletedCount(prev => prev + 1);

    if (socket) {
      socket.emit("send_naughty_completed", {
        roomId,
        senderId: userId,
        senderName: user.name || 'Partner',
        pts
      });
    }

    toast.success(`Challenge Completed! +${pts} Passion Points 💋🔥`);
    setCurrentPrompt(null);
  };

  const glassStyle = "bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[2.5rem]";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 animate-in fade-in duration-500 px-4">
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/80 hover:bg-white text-gray-800 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Games
        </button>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full font-black text-xs shadow-lg flex items-center gap-1.5">
            <Flame size={14} fill="currentColor" /> Passion Points: {score} pts
          </div>
          <div className="px-4 py-2 bg-purple-600/90 text-white rounded-full font-black text-xs shadow-lg">
            Dares Done: {completedCount} 💋
          </div>
        </div>
      </div>

      {/* Title & Mode Selection */}
      <div className={`${glassStyle} p-6 md:p-8 text-center text-white space-y-6 bg-gradient-to-b from-rose-950 via-purple-950 to-slate-950`}>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/20 text-rose-300 rounded-full font-black text-xs uppercase tracking-widest border border-rose-500/30">
            <Flame size={14} className="text-rose-400" /> Couples Naughty Edition
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-pink-400 to-purple-300">
            Love & Passion: Naughty Truth or Dare 💋🔥
          </h2>
          <p className="text-xs md:text-sm text-gray-300 font-bold max-w-md mx-auto italic">
            Spin the 3D wheel with {partnerName}, answer spicy truths, and complete romantic dares together!
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMode(m.id)}
              className={`px-5 py-2.5 rounded-full font-black text-xs transition-all shadow-md shrink-0 ${
                activeMode === m.id
                  ? `bg-gradient-to-r ${m.color} text-white scale-105 shadow-rose-500/30 ring-2 ring-white/30`
                  : 'bg-white/10 hover:bg-white/20 text-gray-300'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* 3D SPINNING WHEEL CONTAINER */}
        <div className="relative py-8 flex flex-col items-center justify-center">
          
          {/* Wheel Top Pointer */}
          <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-rose-500 z-30 filter drop-shadow-lg -mb-4 animate-bounce" />

          {/* Wheel Graphic */}
          <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-full border-8 border-white/20 shadow-2xl overflow-hidden flex items-center justify-center bg-slate-900">
            <div
              className="w-full h-full rounded-full transition-all duration-[3500ms] cubic-bezier(0.15, 0.9, 0.25, 1) relative"
              style={{ transform: `rotate(${rotationAngle}deg)` }}
            >
              {WHEEL_SECTIONS.map((sec, idx) => {
                const angle = 360 / WHEEL_SECTIONS.length;
                const rotateDeg = idx * angle;
                return (
                  <div
                    key={idx}
                    className="absolute w-1/2 h-1/2 top-0 right-0 origin-bottom-left flex items-center justify-center p-2 text-white font-black text-[10px] uppercase tracking-tighter"
                    style={{
                      transform: `rotate(${rotateDeg}deg)`,
                      backgroundColor: sec.color,
                      clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                    }}
                  >
                    <span className="transform -rotate-45 translate-x-2 -translate-y-2 drop-shadow-md">
                      {sec.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Center Spin Button */}
            <button
              onClick={spinWheel}
              disabled={isSpinning}
              className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-rose-500 via-pink-600 to-purple-600 text-white font-black text-xs shadow-2xl flex flex-col items-center justify-center border-4 border-white/80 hover:scale-110 active:scale-95 transition-all z-20 disabled:opacity-50"
            >
              <RotateCw size={20} className={isSpinning ? "animate-spin" : ""} />
              <span>SPIN 🔥</span>
            </button>
          </div>
        </div>

        {/* CHALLENGE RESULT MODAL / CARD */}
        {currentPrompt && (
          <div className="p-6 md:p-8 bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-rose-500/50 space-y-4 shadow-2xl animate-in zoom-in-95 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500 text-white rounded-full font-black text-xs uppercase tracking-widest">
              <span>{currentPrompt.section.label}</span>
            </div>

            <p className="text-lg md:text-xl font-black text-amber-200 leading-relaxed italic">
              "{currentPrompt.text}"
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleCompleteChallenge}
                className="px-8 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Challenge Accepted & Completed! 💖
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NaughtyTruthOrDare;

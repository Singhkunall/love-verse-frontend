import React, { useState, useEffect } from 'react';
import { RefreshCw, Brain, Trophy, ArrowLeft } from 'lucide-react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const socket = io.connect(import.meta.env.VITE_API_URL);
const EMOJIS = ['💖', '🐱', '🍕', '🌈', '🍦', '🎁'];

function MemoryPairs({ user, roomId, onBack }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [myScore, setMyScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);

  // Normalize ID to string to prevent comparison bugs
  const userId = String(user._id || user.id);

  const initGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji }));
    
    socket.emit("initiate_memory_game", { 
      roomId, 
      cards: shuffled, 
      starter: userId 
    });
  };

  useEffect(() => {
    if (!roomId) return;
    socket.emit("join_chat", roomId);

    const handleStart = (data) => {
      setCards(data.cards);
      setSolved([]);
      setFlipped([]);
      setMyScore(0);
      setPartnerScore(0);
      // Strict string comparison to fix the 'false' turn bug
      const starting = String(data.starter) === userId;
      setIsMyTurn(starting);
      toast.success(starting ? "Your Turn! ✨" : "Partner's Turn!");
    };

    const handleFlip = (data) => {
      setFlipped(prev => [...prev, data.cardId]);
    };

    const handleScoreSync = (data) => {
      setPartnerScore(data.score);
      setSolved(prev => [...prev, ...data.matchedIds]);
      setFlipped([]);
      setIsMyTurn(true); // After partner's turn ends or match happens (logic dependent)
    };

    const handleTurnChange = () => {
      setTimeout(() => {
        setFlipped([]);
        setIsMyTurn(true);
      }, 1000);
    };

    socket.on("start_memory_game", handleStart);
    socket.on("partner_card_flip", handleFlip);
    socket.on("partner_score_sync", handleScoreSync);
    socket.on("turn_change", handleTurnChange);

    return () => {
      socket.off("start_memory_game", handleStart);
      socket.off("partner_card_flip", handleFlip);
      socket.off("partner_score_sync", handleScoreSync);
      socket.off("turn_change", handleTurnChange);
    };
  }, [roomId, userId]);

  const handleCardClick = (index) => {
    if (cards.length === 0) return;
    
    if (!isMyTurn) {
        toast.error("Wait for your turn! 🌸", { id: 'turn-error' });
        return;
    }

    if (flipped.length >= 2 || solved.includes(index) || flipped.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    socket.emit("card_flip", { roomId, cardId: index });

    if (newFlipped.length === 2) {
      const [firstIdx, secondIdx] = newFlipped;
      
      if (cards[firstIdx].emoji === cards[secondIdx].emoji) {
        // MATCH!
        setTimeout(() => {
          const matched = [firstIdx, secondIdx];
          setSolved(prev => [...prev, ...matched]);
          setFlipped([]);
          const updatedScore = myScore + 1;
          setMyScore(updatedScore);
          socket.emit("memory_score_update", { 
            roomId, 
            score: updatedScore, 
            matchedIds: matched 
          });
          toast.success("Nice! Match found! ❤️");
        }, 600);
      } else {
        // NO MATCH
        setTimeout(() => {
          setFlipped([]);
          setIsMyTurn(false);
          socket.emit("no_match_turn_change", { roomId });
        }, 1200);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white/80 backdrop-blur-lg rounded-[3rem] shadow-2xl border border-rose-100 transition-all">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-rose-50 rounded-full transition-colors text-rose-400"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex flex-col items-center">
            <div className={`px-6 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm ${
                isMyTurn 
                ? 'bg-rose-500 text-white ring-4 ring-rose-100 animate-pulse' 
                : 'bg-gray-100 text-gray-400'
            }`}>
                {isMyTurn ? "Your Magic Turn" : "Partner's Magic"}
            </div>
        </div>

        <button 
          onClick={initGame} 
          className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl hover:rotate-180 transition-all duration-700 shadow-sm"
        >
          <RefreshCw size={20}/>
        </button>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {cards.length > 0 ? (
          cards.map((card, i) => {
            const isOpened = flipped.includes(i) || solved.includes(i);
            const isSolved = solved.includes(i);
            
            return (
              <div 
                key={i} 
                onClick={() => handleCardClick(i)} 
                className={`h-20 sm:h-24 rounded-2xl flex items-center justify-center text-3xl cursor-pointer transition-all duration-500 transform ${
                  isOpened 
                    ? 'bg-white rotate-y-180 shadow-inner border-2 border-rose-100' 
                    : 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-lg hover:-translate-y-1 active:scale-90'
                } ${isSolved ? 'opacity-60 scale-95' : ''}`}
              >
                <span className={`transition-all duration-300 ${isOpened ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                  {card.emoji}
                </span>
                {!isOpened && <span className="text-white/80 font-bold text-xl">?</span>}
              </div>
            );
          })
        ) : (
          <div className="col-span-4 py-16 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center animate-bounce">
                <Brain className="text-rose-400" size={40} />
            </div>
            <button 
              onClick={initGame} 
              className="group bg-rose-500 text-white px-10 py-4 rounded-3xl font-black shadow-xl shadow-rose-200 hover:bg-rose-600 transition-all flex items-center gap-3 active:scale-95"
            >
              PLAY MEMORY <Trophy size={20} className="group-hover:rotate-12" />
            </button>
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-4 bg-white/50 p-5 rounded-[2.5rem] border border-rose-50">
        <div className="flex flex-col items-center p-2">
            <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">Me</span>
            <span className="text-4xl font-black text-rose-500">{myScore}</span>
        </div>
        <div className="flex flex-col items-center p-2 border-l border-rose-50">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Partner</span>
            <span className="text-4xl font-black text-gray-700">{partnerScore}</span>
        </div>
      </div>
    </div>
  );
}

export default MemoryPairs;
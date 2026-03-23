import React, { useState, useEffect, useRef } from 'react';
import { Timer, Zap, Trophy, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const socket = io.connect('http://localhost:8000');

function FastestFinger({ user, roomId, onBack }) {
  const [gameState, setGameState] = useState('idle'); // idle, waiting, clickNow, finished
  const [startTime, setStartTime] = useState(null);
  const [reactionTime, setReactionTime] = useState(null);
  const [partnerTime, setPartnerTime] = useState(null);
  const [winner, setWinner] = useState(null);
  
  const timeoutRef = useRef(null);
  const userId = user._id || user.id;

  useEffect(() => {
    socket.emit("join_chat", roomId);

    // Jab partner game start kare
    socket.on("start_reaction_game", () => {
      prepareGame();
    });

    // Jab partner apna score bheje
    socket.on("partner_reaction_score", (data) => {
      if (data.senderId !== userId) {
        setPartnerTime(data.time);
      }
    });

    return () => {
      socket.off("start_reaction_game");
      socket.off("partner_reaction_score");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [roomId]);

  // Winner decide karne ka logic
  useEffect(() => {
    if (reactionTime && partnerTime) {
      if (reactionTime < partnerTime) setWinner("Me");
      else if (partnerTime < reactionTime) setWinner("Partner");
      else setWinner("Draw");
    }
  }, [reactionTime, partnerTime]);

  const initGame = () => {
    socket.emit("initiate_reaction_game", { roomId });
  };

  const prepareGame = () => {
    setGameState('waiting');
    setReactionTime(null);
    setPartnerTime(null);
    setWinner(null);

    // Random delay between 2 to 5 seconds
    const delay = Math.floor(Math.random() * 3000) + 2000;

    timeoutRef.current = setTimeout(() => {
      setGameState('clickNow');
      setStartTime(Date.now());
    }, delay);
  };

  const handleMainClick = () => {
    if (gameState === 'waiting') {
      // Jaldi click kar diya (Early click)
      clearTimeout(timeoutRef.current);
      setGameState('idle');
      toast.error("Oye! Itni jaldi nahi... wait for green!");
      return;
    }

    if (gameState === 'clickNow') {
      const timeTaken = Date.now() - startTime;
      setReactionTime(timeTaken);
      setGameState('finished');
      socket.emit("send_reaction_score", { roomId, senderId: userId, time: timeTaken });
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-8 bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white space-y-8 animate-in zoom-in-95">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-gray-400 hover:text-rose-500 font-bold text-sm flex items-center gap-2 transition-colors">
           ← Back to Games
        </button>
        <div className="flex items-center gap-4">
            <button onClick={initGame} className="p-3 bg-rose-500 text-white rounded-2xl hover:rotate-180 transition-all duration-500 shadow-lg shadow-rose-200">
                <RefreshCw size={20} />
            </button>
        </div>
      </div>

      {/* GAME AREA */}
      <div 
        onClick={handleMainClick}
        className={`h-80 w-full rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden shadow-inner border-4 ${
          gameState === 'idle' ? 'bg-gray-50 border-gray-100' : 
          gameState === 'waiting' ? 'bg-amber-400 border-amber-300 animate-pulse' : 
          gameState === 'clickNow' ? 'bg-emerald-500 border-emerald-400' : 
          'bg-gray-900 border-gray-800'
        }`}
      >
        {gameState === 'idle' && (
          <div className="text-center space-y-4">
            <Zap size={60} className="mx-auto text-rose-500 fill-current" />
            <h2 className="text-2xl font-black text-gray-800">Ready to Race?</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Click anywhere to start</p>
            <button onClick={(e) => {e.stopPropagation(); initGame();}} className="mt-4 px-8 py-3 bg-rose-500 text-white rounded-2xl font-black text-sm">Challenge Partner</button>
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="text-center space-y-2">
            <AlertCircle size={60} className="mx-auto text-white animate-bounce" />
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">WAIT FOR GREEN...</h2>
          </div>
        )}

        {gameState === 'clickNow' && (
          <div className="text-center space-y-2">
            <Zap size={80} className="mx-auto text-white fill-current animate-ping" />
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">CLICK NOW!!!</h2>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="text-center text-white space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Your Time</p>
              <h2 className="text-6xl font-black">{reactionTime} ms</h2>
            </div>
            
            <div className="flex gap-10 items-center justify-center border-t border-white/10 pt-6">
                <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-gray-400">Partner</p>
                    <p className="font-bold text-xl">{partnerTime ? `${partnerTime}ms` : '...'}</p>
                </div>
                {winner && (
                    <div className="bg-white text-gray-900 px-6 py-2 rounded-2xl font-black text-sm uppercase flex items-center gap-2 scale-110">
                       <Trophy size={16} className="text-yellow-500" /> {winner === 'Me' ? 'You Won!' : winner === 'Partner' ? 'Partner Won' : 'Draw!'}
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest text-center mb-2">How to play</p>
        <p className="text-xs text-rose-600 font-bold text-center leading-relaxed italic">"Game start hone ke baad yellow screen hogi, jaise hi screen GREEN ho, turant click karna. Dekhte hain kiske reflexes fast hain! ⚡"</p>
      </div>
    </div>
  );
}

export default FastestFinger;
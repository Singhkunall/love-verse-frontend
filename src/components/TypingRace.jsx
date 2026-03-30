import React, { useState, useEffect } from 'react';
import { Trophy, Zap, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const socket = io.connect(import.meta.env.VITE_API_URL);

// Iska naam fix kar diya hai taaki niche error na aaye
const BACKUP_SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "Persistence is the path to success in everything you do.",
  "Coding is the language of the future, start learning today.",
  "Small steps every day lead to big results over time.",
  "Love is not about how many days you have been together.",
  "Believe in yourself and all that you are capable of.",
  "Every problem is a gift, without problems we would not grow.",
  "The only way to do great work is to love what you do.",
  "Innovation distinguishes between a leader and a follower.",
  "Your time is limited, so don't waste it living someone else's life."
];

function TypingRace({ user, roomId, onBack }) {
  const [targetText, setTargetText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [partnerProgress, setPartnerProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [winner, setWinner] = useState(null);
  const [correctCharCount, setCorrectCharCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const userId = user._id || user.id;

  useEffect(() => {
    socket.emit("join_chat", roomId);
    socket.on("start_typing_game", (data) => {
      setTargetText(data.sentence);
      resetGameState();
    });

    socket.on("partner_typing_progress", (data) => {
      if (data.senderId !== userId) {
        setPartnerProgress(data.progress);
        if (data.finished) setWinner("Partner");
      }
    });

    return () => {
      socket.off("start_typing_game");
      socket.off("partner_typing_progress");
    };
  }, [roomId]);

  const resetGameState = () => {
    setUserInput("");
    setStartTime(null);
    setWpm(0);
    setPartnerProgress(0);
    setIsFinished(false);
    setWinner(null);
    setCorrectCharCount(0);
  };

  const startNewGame = async () => {
    setIsLoading(true);
    try {
      // Nayi API: Bacon Ipsum (Ye bahut stable hai)
      const response = await fetch("https://baconipsum.com/api/?type=all-meat&sentences=1&start-with-lorem=0");
      const data = await response.json();
      
      if (data && data[0]) {
        // Text ko thoda chhota aur clean kar rahe hain
        const rawText = data[0];
        const cleanText = rawText.split(' ').slice(0, 12).join(' ') + ".";
        socket.emit("initiate_typing_game", { roomId, sentence: cleanText });
      } else {
        throw new Error("API call returned empty");
      }
    } catch (err) {
      console.log("API Fail, picking from BACKUP_SENTENCES...");
      // Ab variable name match hoga, toh crash nahi hoga
      const randomBackup = BACKUP_SENTENCES[Math.floor(Math.random() * BACKUP_SENTENCES.length)];
      socket.emit("initiate_typing_game", { roomId, sentence: randomBackup });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (!startTime) setStartTime(Date.now());

    const isMatchingSoFar = targetText.startsWith(val);

    if (isMatchingSoFar) {
      setUserInput(val);
      const newCorrectCount = val.length;
      setCorrectCharCount(newCorrectCount);

      const progress = (newCorrectCount / targetText.length) * 100;

      if (val === targetText) {
        setIsFinished(true);
        const timeTaken = (Date.now() - startTime) / 1000 / 60;
        const words = targetText.split(" ").length;
        setWpm(Math.round(words / timeTaken));
        if (!winner) setWinner("Me");
        
        socket.emit("typing_progress", { roomId, senderId: userId, progress: 100, finished: true });
        toast.success("Kamal kar diya! 🏁");
      } else {
        socket.emit("typing_progress", { roomId, senderId: userId, progress, finished: false });
      }
    } else {
      setUserInput(val);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full p-8 bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white space-y-8 animate-in zoom-in-95">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-gray-400 hover:text-rose-500 font-bold text-sm flex items-center gap-2 transition-colors">
           ← Back to Games
        </button>
        <div className="flex items-center gap-4">
            {winner && <div className="bg-yellow-100 text-yellow-600 px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm border border-yellow-200 animate-bounce">
                <Trophy size={16}/> Winner: {winner}
            </div>}
            <button 
              onClick={startNewGame} 
              disabled={isLoading}
              className="p-3 bg-rose-500 text-white rounded-2xl hover:rotate-180 transition-all duration-500 shadow-lg shadow-rose-200 disabled:opacity-50"
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      {!targetText ? (
        <div className="py-20 text-center space-y-4">
            <Zap size={48} className="mx-auto text-yellow-400 fill-current" />
            <h4 className="text-xl font-black text-gray-800 tracking-tight">Ready for a Speed Battle?</h4>
            <button 
              onClick={startNewGame} 
              disabled={isLoading}
              className="px-10 py-4 bg-gray-900 text-white rounded-[2rem] font-black hover:bg-rose-500 transition-all shadow-xl disabled:bg-gray-400"
            >
              {isLoading ? 'Starting...' : 'Start New Race'}
            </button>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">
                    <span>My Speed: {wpm > 0 ? wpm : '--'} WPM</span>
                    <span>Me</span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50 p-1">
                    <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-300 shadow-sm" style={{ width: `${(correctCharCount / targetText.length) * 100}%` }}></div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">
                    <span>Partner's Progress</span>
                    <span>Partner</span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50 p-1">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 shadow-sm" style={{ width: `${partnerProgress}%` }}></div>
                </div>
            </div>
          </div>

          <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 relative overflow-hidden">
             <p className="text-2xl font-bold text-gray-300 leading-relaxed tracking-tight break-words">
               {targetText.split("").map((char, index) => {
                 let color = "text-gray-300";
                 if (index < userInput.length) {
                   color = userInput[index] === targetText[index] ? "text-rose-500" : "text-red-500 underline decoration-wavy";
                 }
                 return <span key={index} className={`${color} transition-colors`}>{char}</span>;
               })}
             </p>
          </div>

          <textarea
            autoFocus
            disabled={isFinished || !targetText}
            value={userInput}
            onChange={handleInputChange}
            placeholder="Type exactly as shown above..."
            className={`w-full h-32 p-6 bg-white border-2 rounded-[2.5rem] outline-none transition-all font-bold text-lg text-gray-700 shadow-inner ${
                userInput.length > 0 && !targetText.startsWith(userInput) ? 'border-red-200 bg-red-50/30' : 'border-gray-100 focus:border-rose-300'
            }`}
          />
        </div>
      )}
    </div>
  );
}

export default TypingRace;
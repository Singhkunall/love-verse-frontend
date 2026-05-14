import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RotateCw, Star, Gift, Music, Camera, Heart, CheckCircle, Zap } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const tasks = [
  { text: "Send a 1-min Voice Note 🎙️", icon: <Music size={20}/>, difficulty: 'Easy', xp: 30 },
  { text: "Share a random selfie NOW 📸", icon: <Camera size={20}/>, difficulty: 'Easy', xp: 30 },
  { text: "Tell 1 thing you love about them ❤️", icon: <Heart size={20}/>, difficulty: 'Easy', xp: 30 },
  { text: "Order a small surprise for them 🍕", icon: <Gift size={20}/>, difficulty: 'Hard', xp: 100 },
  { text: "Sing 2 lines of any song 🎵", icon: <Star size={20}/>, difficulty: 'Medium', xp: 50 },
  { text: "Plan a date for next weekend 🗓️", icon: <RotateCw size={20}/>, difficulty: 'Medium', xp: 50 }
];

function LoveRoulette({ user, roomId, socket }) {
  const [spinning, setSpinning] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [completing, setCompleting] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    fetchTodayTask();
    
    socket.on("roulette_spun", (data) => {
      setCurrentTask({ lastTask: data.task, spunBy: { name: data.userName } });
    });

    socket.on("task_completed", (data) => {
      toast.success(`${data.completedBy} ne task complete kar diya! +${data.xp} XP 🎉`);
      fetchTodayTask();
    });

    return () => {
      socket.off("roulette_spun");
      socket.off("task_completed");
    };
  }, []);

  const fetchTodayTask = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/roulette/${roomId}`);
      if (res.data) setCurrentTask(res.data);
    } catch (err) { console.error(err); }
  };

  const spinWheel = async () => {
    if (currentTask || spinning) return;
    setSpinning(true);

    await controls.start({
      rotate: [0, 1800],
      transition: { duration: 4, ease: "circOut" }
    });

    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/roulette/spin`, {
        roomId, userId: user._id || user.id, task: randomTask.text
      });
      socket.emit("spin_wheel", { roomId, task: randomTask.text, userName: user.name });
      setCurrentTask({ lastTask: randomTask.text, spunBy: { name: user.name }, isCompleted: false });
      toast.success("Task Assigned! 🎯");
    } catch (err) {
      toast.error("Error spinning!");
    }
    setSpinning(false);
  };

  const completeTask = async () => {
    setCompleting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/roulette/complete`, {
        roomId, userId: user._id || user.id
      });
      toast.success("Task Complete! +50 XP 🎉");
      fetchTodayTask();
    } catch (err) {
      toast.error("Error!");
    }
    setCompleting(false);
  };

  const getDifficultyColor = (task) => {
    if (task?.includes('surprise') || task?.includes('date')) return 'text-red-500 bg-red-50';
    if (task?.includes('song') || task?.includes('plan')) return 'text-yellow-500 bg-yellow-50';
    return 'text-green-500 bg-green-50';
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-xl text-center overflow-hidden relative">
      
      {/* Header */}
      <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center justify-center gap-2">
        <RotateCw className={spinning ? "animate-spin text-rose-500" : "text-rose-500"} /> 
        Love Roulette
      </h3>
      <p className="text-xs text-gray-400 font-bold mb-6">One spin per day. No cheating! 😉</p>

      {!currentTask ? (
        <div className="space-y-6">
          <motion.div 
            animate={controls} 
            className="w-48 h-48 bg-gradient-to-tr from-rose-400 to-pink-500 rounded-full mx-auto border-8 border-white shadow-2xl flex items-center justify-center relative"
          >
            <Heart className="text-white fill-white" size={40} />
          </motion.div>
          
          <button 
            onClick={spinWheel}
            disabled={spinning}
            className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-rose-500 transition-colors disabled:opacity-50"
          >
            {spinning ? "Spinning..." : "What's our task today? 🎯"}
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="space-y-6"
        >
          {/* Task Card */}
          <div className={`p-6 rounded-[2rem] border-2 border-dashed ${currentTask.isCompleted ? 'bg-green-50 border-green-200' : 'bg-rose-50 border-rose-200'}`}>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">
              Today's Challenge
            </p>
            <h4 className="text-2xl font-black text-gray-800 mb-3 italic">
              "{currentTask.lastTask}"
            </h4>
            <p className="text-xs font-bold text-gray-400 italic mb-4">
              Spun by: {currentTask.spunBy?.name}
            </p>

            {/* XP Badge */}
            <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-black mb-4">
              <Zap size={12} /> +50 XP on completion
            </div>

            {/* Completion Status */}
            {currentTask.isCompleted ? (
              <div className="flex items-center justify-center gap-2 bg-green-100 text-green-600 p-3 rounded-2xl">
                <CheckCircle size={20} />
                <span className="font-black text-sm">
                  Completed by {currentTask.completedBy?.name || 'you'}! 🎉
                </span>
              </div>
            ) : (
              <button
                onClick={completeTask}
                disabled={completing}
                className="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl font-black hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                {completing ? "Marking..." : "Mark as Complete ✅"}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default LoveRoulette;
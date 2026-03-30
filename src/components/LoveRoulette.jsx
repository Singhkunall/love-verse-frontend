import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RotateCw, Star, Gift, Music, Camera, Heart } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const tasks = [
  { text: "Send a 1-min Voice Note 🎙️", icon: <Music size={20}/> },
  { text: "Share a random selfie NOW 📸", icon: <Camera size={20}/> },
  { text: "Tell 1 thing you love about them ❤️", icon: <Heart size={20}/> },
  { text: "Order a small surprise for them 🍕", icon: <Gift size={20}/> },
  { text: "Sing 2 lines of any song 🎵", icon: <Star size={20}/> },
  { text: "Plan a date for next weekend 🗓️", icon: <RotateCw size={20}/> }
];

function LoveRoulette({ user, roomId, socket }) {
  const [spinning, setSpinning] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const controls = useAnimation();

  useEffect(() => {
    fetchTodayTask();
    socket.on("roulette_spun", (data) => {
      setCurrentTask({ lastTask: data.task, spunBy: { name: data.userName } });
    });
    return () => socket.off("roulette_spun");
  }, []);

  const fetchTodayTask = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/roulette/${roomId}`);
    if (res.data) setCurrentTask(res.data);
  };

  const spinWheel = async () => {
    if (currentTask || spinning) return;
    
    setSpinning(true);
    // Animation: Wheel ghumne ka effect
    await controls.start({
      rotate: [0, 1800],
      transition: { duration: 4, ease: "circOut" }
    });

    const randomTask = tasks[Math.floor(Math.random() * tasks.length)].text;
    
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/roulette/spin`, {
        roomId, userId: user._id || user.id, task: randomTask
      });
      
      socket.emit("spin_wheel", { roomId, task: randomTask, userName: user.name });
      setCurrentTask({ lastTask: randomTask, spunBy: { name: user.name } });
      toast.success("Task Assigned!");
    } catch (err) {
      toast.error("Error spinning!");
    }
    setSpinning(false);
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-xl text-center overflow-hidden relative">
      <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center justify-center gap-2">
        <RotateCw className={spinning ? "animate-spin" : ""} /> Love Roulette
      </h3>

      {!currentTask ? (
        <div className="space-y-6">
          <motion.div animate={controls} className="w-48 h-48 bg-gradient-to-tr from-rose-400 to-pink-500 rounded-full mx-auto border-8 border-white shadow-2xl flex items-center justify-center relative">
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-24 bg-white origin-bottom transform -translate-y-12"></div>
             </div>
             <Heart className="text-white fill-white" size={40} />
          </motion.div>
          
          <button 
            onClick={spinWheel}
            disabled={spinning}
            className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-rose-500 transition-colors disabled:opacity-50"
          >
            {spinning ? "Spinning..." : "What's our task today?"}
          </button>
        </div>
      ) : (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6">
          <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-dashed border-rose-200">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Today's Challenge</p>
            <h4 className="text-2xl font-black text-gray-800 mb-4 italic">"{currentTask.lastTask}"</h4>
            <p className="text-xs font-bold text-gray-400 italic">Spun by: {currentTask.spunBy?.name}</p>
          </div>
        </motion.div>
      )}
      
      <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase">One spin per day. No cheating! 😉</p>
    </div>
  );
}

export default LoveRoulette;
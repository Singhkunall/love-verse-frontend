import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RotateCw, Star, Gift, Music, Camera, Heart, CheckCircle, Zap, Upload, Image } from 'lucide-react';
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
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [showProofForm, setShowProofForm] = useState(false);
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setProofImage(reader.result);
        setProofPreview(reader.result);
      };
    }
  };

  const completeTask = async () => {
    if (!proofImage) {
      toast.error("Photo proof upload karo pehle! 📸");
      return;
    }
    setCompleting(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/roulette/complete`, {
        roomId,
        userId: user._id || user.id,
        proofImage
      });
      toast.success("Task Complete! +50 XP 🎉");
      setShowProofForm(false);
      setProofImage(null);
      setProofPreview(null);
      fetchTodayTask();
    } catch (err) {
      toast.error("Error!");
    }
    setCompleting(false);
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-xl text-center overflow-hidden relative">
      
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

            <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-xs font-black mb-4">
              <Zap size={12} /> +50 XP on completion
            </div>

            {currentTask.isCompleted ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 bg-green-100 text-green-600 p-3 rounded-2xl">
                  <CheckCircle size={20} />
                  <span className="font-black text-sm">
                    Completed by {currentTask.completedBy?.name || 'you'}! 🎉
                  </span>
                </div>
                {/* Show proof photo */}
                {currentTask.proofImage && (
                  <div className="mt-4">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">Photo Proof 📸</p>
                    <img 
                      src={currentTask.proofImage} 
                      alt="proof" 
                      className="w-full rounded-2xl object-cover max-h-48"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!showProofForm ? (
                  <button
                    onClick={() => setShowProofForm(true)}
                    className="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl font-black hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Mark as Complete ✅
                  </button>
                ) : (
                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-gray-100">
                    <p className="text-sm font-black text-gray-700">Upload Photo Proof 📸</p>
                    
                    {/* Photo Preview */}
                    {proofPreview ? (
                      <div className="relative">
                        <img 
                          src={proofPreview} 
                          alt="preview" 
                          className="w-full rounded-2xl object-cover max-h-48"
                        />
                        <button
                          onClick={() => { setProofImage(null); setProofPreview(null); }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-xs"
                        >✕</button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-rose-200 rounded-2xl cursor-pointer bg-rose-50 hover:bg-rose-100 transition-all">
                        <Camera size={24} className="text-rose-400 mb-2" />
                        <span className="text-xs font-bold text-rose-400">Click to upload photo</span>
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      </label>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowProofForm(false); setProofImage(null); setProofPreview(null); }}
                        className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={completeTask}
                        disabled={completing || !proofImage}
                        className="flex-1 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl font-black text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Upload size={14} />
                        {completing ? "Submitting..." : "Submit Proof"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default LoveRoulette;
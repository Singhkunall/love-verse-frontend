import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, Heart, Bell, X, Sparkles, ChevronRight } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function Calendar({ user, roomId, socket }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    type: 'Other',
    description: ''
  });

  const userId = user._id || user.id;

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/events/${roomId}`);
      setEvents(res.data);
    } catch (err) {
      toast.error("Calendar sync failed!");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchEvents();
    if (socket) {
      socket.on("calendar_updated", fetchEvents);
      return () => socket.off("calendar_updated");
    }
  }, [fetchEvents, socket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Saving special moment...");
    try {
      const res = await axios.post(`${API_URL}/api/events/add`, {
        ...formData,
        roomId,
        addedBy: userId
      });
      fetchEvents();
      setShowModal(false);
      setFormData({ title: '', date: '', type: 'Other', description: '' });
      if (socket) socket.emit("new_calendar_event", { roomId });
      toast.success("Event Saved! ❤️", { id: toastId });
    } catch (err) {
      toast.error("Could not save", { id: toastId });
    }
  };

  const deleteEvent = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/events/${id}`);
      setEvents(events.filter(e => e._id !== id));
      if (socket) socket.emit("new_calendar_event", { roomId });
      toast.success("Memory deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  // NAYA: Days Left Calculator
  const getDaysLeft = (eventDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(eventDate);
    target.setHours(0, 0, 0, 0);
    const diff = target - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const glassStyle = "bg-white/80 backdrop-blur-xl border border-white shadow-xl";

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 font-sans min-h-screen">
      
      {/* Header */}
      <div className={`${glassStyle} flex justify-between items-center mb-10 p-8 rounded-[2.5rem]`}>
        <div>
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <div className="p-3 bg-rose-500 rounded-2xl shadow-lg shadow-rose-200">
                <CalendarIcon className="text-white" size={24} />
            </div>
            Love Calendar
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 ml-1">Days we'll never forget</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gray-900 text-white p-4 rounded-[1.5rem] shadow-xl hover:bg-rose-500 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Upcoming Highligh (Countdown) */}
        <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest ml-2">Coming Up Next</h3>
            {events.filter(e => getDaysLeft(e.date) >= 0).slice(0, 1).map(event => (
                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} key={event._id} className="bg-gradient-to-br from-rose-500 to-pink-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                    <Heart className="absolute -bottom-10 -right-10 opacity-20 group-hover:scale-110 transition-transform duration-700" size={200} fill="white" />
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{event.type}</p>
                        <h4 className="text-4xl font-black mb-6 leading-tight">{event.title}</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black tracking-tighter">{getDaysLeft(event.date)}</span>
                            <span className="text-xl font-bold opacity-80 uppercase italic">Days To Go</span>
                        </div>
                    </div>
                </motion.div>
            ))}
            {events.filter(e => getDaysLeft(e.date) >= 0).length === 0 && (
                 <div className="bg-white/40 border-2 border-dashed border-rose-200 p-12 rounded-[3rem] text-center">
                    <Clock className="mx-auto text-rose-200 mb-4" size={40} />
                    <p className="text-rose-300 font-bold italic">No upcoming plans...</p>
                 </div>
            )}
        </div>

        {/* Right Side: All Events List */}
        <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Our Timeline</h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {events.map((event) => {
                    const days = getDaysLeft(event.date);
                    const isPast = days < 0;
                    return (
                        <motion.div 
                            layout initial={{opacity:0}} animate={{opacity:1}}
                            key={event._id} 
                            className={`${glassStyle} p-6 rounded-[2rem] flex items-center justify-between group transition-all hover:border-rose-200`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${isPast ? 'bg-gray-100 text-gray-400' : 'bg-rose-50 text-rose-500'}`}>
                                    {new Date(event.date).getDate()}
                                    <br/>
                                    <span className="text-[8px] uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                </div>
                                <div>
                                    <h5 className={`font-black tracking-tight ${isPast ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{event.title}</h5>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{event.type}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                {isPast ? (
                                    <span className="text-[10px] font-black text-gray-300 uppercase italic">Completed</span>
                                ) : (
                                    <span className="bg-green-50 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                        In {days} Days
                                    </span>
                                )}
                                <button onClick={() => deleteEvent(event._id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* --- MODAL (Same as before but with better styling) --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative z-10 border border-white">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter italic flex items-center gap-2">
                    <Sparkles className="text-rose-500" /> New Memory
                </h3>
                <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-rose-500 transition-colors"><X size={20}/></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-4">What's the occasion?</label>
                    <input type="text" placeholder="First Date, Trip to Goa..." required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-5 bg-gray-50 rounded-[1.5rem] outline-none focus:ring-2 ring-rose-100 font-bold border-none" />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Pick a date</label>
                    <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-5 bg-gray-50 rounded-[1.5rem] outline-none focus:ring-2 ring-rose-100 font-bold border-none" />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Category</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full p-5 bg-gray-50 rounded-[1.5rem] outline-none focus:ring-2 ring-rose-100 font-bold border-none appearance-none">
                        <option value="Anniversary">Anniversary ❤️</option>
                        <option value="Birthday">Birthday 🎂</option>
                        <option value="Trip">Trip ✈️</option>
                        <option value="Date Night">Date Night ✨</option>
                        <option value="Other">Special Moment 🌟</option>
                    </select>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-rose-200 hover:scale-[1.02] transition-all uppercase tracking-widest text-xs mt-4">
                  Lock This Date 🔒
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Calendar;
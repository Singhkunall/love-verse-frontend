import React, { useState, useEffect } from 'react';
import { Award, Heart, Calendar, Sparkles, Plus, Star, Trophy, Flame, CheckCircle2, Clock, Image, Globe, Gift, Lock, Unlock, Eye, Trash2, Camera, Compass } from 'lucide-react';
import Confetti from 'react-confetti';
import toast from 'react-hot-toast';

const INITIAL_BADGES = [
  { id: 'linked', name: 'Love Pioneers 💍', desc: 'Link partner account in Love-Verse', target: 1, current: 1, icon: Heart, color: 'from-rose-500 to-pink-600' },
  { id: 'memories', name: 'Memory Keepers 📸', desc: 'Upload 5+ romantic photos', target: 5, current: 4, icon: Image, color: 'from-blue-500 to-indigo-600' },
  { id: 'universe', name: 'Globe Trotters 🌍', desc: 'Pin 3+ places on Our Universe', target: 3, current: 3, icon: Globe, color: 'from-purple-500 to-pink-500' },
  { id: 'games', name: 'Arcade Champions 🎲', desc: 'Play 5+ couple arcade battles', target: 5, current: 5, icon: Trophy, color: 'from-amber-500 to-orange-600' },
  { id: 'streak', name: '100 Days Together 🔥', desc: 'Complete 100 days of love journey', target: 100, current: 85, icon: Flame, color: 'from-emerald-500 to-teal-600' },
  { id: 'beats', name: 'Music Soulmates 🎧', desc: 'Listen to 10+ synced songs on Beats', target: 10, current: 7, icon: Sparkles, color: 'from-cyan-500 to-blue-600' }
];

const INITIAL_TIMELINE = [
  {
    id: 1,
    date: 'Day 1',
    title: 'The First Spark ✨',
    desc: 'The magical day our eyes met and our story officially began.',
    icon: '❤️',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&q=80'
  },
  {
    id: 2,
    date: 'Day 15',
    title: 'First Official Date 🌹',
    desc: 'Coffee, long conversations, and laughter that lasted for hours.',
    icon: '☕',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80'
  },
  {
    id: 3,
    date: 'Day 30',
    title: 'Partner Link in Love-Verse 🔐',
    desc: 'Linked our accounts and created our private digital sanctuary.',
    icon: '💍',
    image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80'
  },
  {
    id: 4,
    date: 'Day 50',
    title: 'First Trip Together ✈️',
    desc: 'Exploring new sights, eating delicious food, and making memories.',
    icon: '✈️',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80'
  }
];

export default function OurStory({ user, daysTogether }) {
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [activeBadgeFilter, setActiveBadgeFilter] = useState('all');
  const [showConfetti, setShowConfetti] = useState(false);

  // Time Capsule State
  const [capsuleNote, setCapsuleNote] = useState('');
  const [capsuleLocked, setCapsuleLocked] = useState(false);

  // New Milestone Form State
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    date: '',
    desc: '',
    icon: '💖',
    image: ''
  });

  // Countdown timer to next 100-day milestone
  const nextMilestoneDays = 100 - (daysTogether % 100);

  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newMilestone.title || !newMilestone.date) {
      return toast.error("Please enter a title and date!");
    }

    const item = {
      id: Date.now(),
      title: newMilestone.title,
      date: newMilestone.date,
      desc: newMilestone.desc || 'A sweet moment locked in our story.',
      icon: newMilestone.icon || '💖',
      image: newMilestone.image || ''
    };

    setTimeline([item, ...timeline]);
    setNewMilestone({ title: '', date: '', desc: '', icon: '💖', image: '' });
    setShowAddForm(false);
    setShowConfetti(true);
    toast.success("New Milestone Added to Our Story! 🎉");
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleDeleteMilestone = (id) => {
    setTimeline(timeline.filter(t => t.id !== id));
    setSelectedMilestone(null);
    toast.success("Milestone removed!");
  };

  const handleLockCapsule = (e) => {
    e.preventDefault();
    if (!capsuleNote) return toast.error("Write a secret note!");
    setCapsuleLocked(true);
    toast.success("Time Capsule Sealed! Will unlock on next milestone! 🔒");
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-500 pb-16 px-4">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md">
          <Trophy size={16} /> Our Story & Milestones
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 italic">
          The Story of Us 💖
        </h2>
        <p className="text-gray-500 font-bold text-sm max-w-md mx-auto italic">
          "Celebrating every milestone, memory badge, and chapter of our love journey."
        </p>
      </div>

      {/* HERO BANNER & MILESTONE COUNTDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Days Together Counter */}
        <div className="lg:col-span-8 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 rounded-[3rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="space-y-2 z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-4 py-1.5 rounded-full border border-white/30">
              Relationship Counter
            </span>
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-6xl md:text-7xl font-black leading-none tracking-tight drop-shadow-lg">
                {daysTogether}
              </span>
              <span className="text-xl font-bold opacity-90 italic">Days of Love</span>
            </div>
            <p className="text-xs font-bold text-rose-100 italic pt-1">
              "Every single day spent with you is my absolute favorite."
            </p>
          </div>

          <div className="flex gap-4 pt-4 z-10 border-t border-white/20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-100">Timeline Chapters</p>
              <p className="text-2xl font-black">{timeline.length}</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-100">Badges Unlocked</p>
              <p className="text-2xl font-black">
                {INITIAL_BADGES.filter(b => b.current >= b.target).length}/{INITIAL_BADGES.length}
              </p>
            </div>
          </div>
        </div>

        {/* Next Milestone Countdown Box */}
        <div className={`${glassStyle} lg:col-span-4 p-8 flex flex-col justify-between text-center space-y-4`}>
          <div className="w-14 h-14 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Clock size={28} />
          </div>
          <div>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
              Next Milestone
            </span>
            <h4 className="text-3xl font-black text-gray-800 mt-2">{nextMilestoneDays} Days</h4>
            <p className="text-xs text-gray-500 font-bold mt-1">Until Next 100-Day Milestone 🎉</p>
          </div>
        </div>
      </div>

      {/* SECTION 1: DYNAMIC COUPLE ACHIEVEMENT BADGES */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Award className="text-rose-500" size={26} /> Achievement Badges & Quests
          </h3>

          {/* Filter Pills */}
          <div className="flex bg-white/60 backdrop-blur-xl p-1 rounded-full border border-rose-100">
            <button
              onClick={() => setActiveBadgeFilter('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeBadgeFilter === 'all' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600'
              }`}
            >
              All Badges
            </button>
            <button
              onClick={() => setActiveBadgeFilter('unlocked')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeBadgeFilter === 'unlocked' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600'
              }`}
            >
              Unlocked ✨
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INITIAL_BADGES.filter(b => activeBadgeFilter === 'all' || (activeBadgeFilter === 'unlocked' && b.current >= b.target)).map((b) => {
            const Icon = b.icon;
            const isUnlocked = b.current >= b.target;
            const progressPct = Math.min(100, Math.round((b.current / b.target) * 100));

            return (
              <div
                key={b.id}
                className={`${glassStyle} p-6 space-y-4 relative overflow-hidden group hover:scale-[1.02] transition-all border-2 ${
                  isUnlocked ? 'border-green-200/80 shadow-green-50/50' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${b.color} text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform`}>
                    <Icon size={28} />
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                    isUnlocked
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {isUnlocked ? 'Unlocked ✨' : 'In Progress 🔒'}
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-black text-gray-800">{b.name}</h4>
                  <p className="text-xs text-gray-500 font-bold mt-1 leading-relaxed">{b.desc}</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[10px] font-black text-gray-400">
                    <span>Progress</span>
                    <span>{b.current}/{b.target} ({progressPct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isUnlocked ? 'bg-green-500' : 'bg-rose-400'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: TIMELINE ROADMAP */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Sparkles className="text-rose-500" size={26} /> Timeline & Story Chapters
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-xs shadow-lg hover:shadow-rose-200 hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Add Chapter
          </button>
        </div>

        {/* ADD MILESTONE FORM */}
        {showAddForm && (
          <form onSubmit={handleAddMilestone} className={`${glassStyle} p-8 space-y-4 animate-in zoom-in-95 border-2 border-rose-200`}>
            <h4 className="text-lg font-black text-gray-800">✨ Create New Story Chapter</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. First Trip to Paris 🗼"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Date or Day</label>
                <input
                  type="text"
                  placeholder="e.g. Day 45 or June 12"
                  value={newMilestone.date}
                  onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Emoji Icon</label>
                <input
                  type="text"
                  placeholder="e.g. 💍, ✈️, 🌹"
                  value={newMilestone.icon}
                  onChange={(e) => setNewMilestone({ ...newMilestone, icon: e.target.value })}
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Romantic Story / Note</label>
              <textarea
                placeholder="Write a sweet memory note..."
                value={newMilestone.desc}
                onChange={(e) => setNewMilestone({ ...newMilestone, desc: e.target.value })}
                rows={2}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100 resize-none mt-1"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Photo Image URL (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={newMilestone.image}
                onChange={(e) => setNewMilestone({ ...newMilestone, image: e.target.value })}
                className="w-full p-3.5 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100 mt-1"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all"
            >
              Lock Chapter in Our Story 🔒
            </button>
          </form>
        )}

        {/* TIMELINE LIST WITH PHOTO PREVIEWS */}
        <div className="relative border-l-4 border-rose-300 ml-4 md:ml-8 space-y-8 pl-6 md:pl-10">
          {timeline.map((item) => (
            <div key={item.id} className="relative group">
              {/* Node Icon */}
              <div className="absolute -left-[35px] md:-left-[53px] top-4 w-11 h-11 md:w-13 md:h-13 bg-white rounded-full border-4 border-rose-400 shadow-lg flex items-center justify-center text-xl font-black text-rose-500 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>

              <div className={`${glassStyle} p-6 md:p-8 space-y-4 transition-all hover:scale-[1.01]`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100">
                    {item.date}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedMilestone(item)}
                      className="p-2 bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-500 rounded-xl transition-all"
                      title="Inspect Chapter"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteMilestone(item.id)}
                      className="p-2 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500 rounded-xl transition-all"
                      title="Delete Chapter"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-gray-800">{item.title}</h4>
                  <p className="text-sm font-bold text-gray-600 leading-relaxed italic">"{item.desc}"</p>
                </div>

                {item.image && (
                  <div
                    onClick={() => setSelectedMilestone(item)}
                    className="rounded-3xl overflow-hidden border border-gray-100 max-h-64 cursor-pointer shadow-md group-hover:shadow-xl transition-all"
                  >
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: TIME CAPSULE FEATURE */}
      <div className={`${glassStyle} p-8 md:p-10 space-y-6 relative overflow-hidden`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center font-black">
            <Gift size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800">Love Time Capsule 🔒</h3>
            <p className="text-xs text-gray-500 font-bold">Lock a secret note to unlock on your next major anniversary!</p>
          </div>
        </div>

        {!capsuleLocked ? (
          <form onSubmit={handleLockCapsule} className="space-y-4">
            <textarea
              placeholder="Write a secret message to your partner..."
              value={capsuleNote}
              onChange={(e) => setCapsuleNote(e.target.value)}
              rows={3}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100 resize-none"
            />
            <button
              type="submit"
              className="px-8 py-3.5 bg-purple-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2"
            >
              <Lock size={16} /> Seal Time Capsule
            </button>
          </form>
        ) : (
          <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100 flex items-center gap-4">
            <Lock size={24} className="text-purple-600 shrink-0" />
            <div>
              <p className="text-sm font-black text-purple-900">Time Capsule Sealed!</p>
              <p className="text-xs text-purple-600 font-bold">Will unlock in {nextMilestoneDays} days! 🎁</p>
            </div>
          </div>
        )}
      </div>

      {/* MILESTONE INSPECTOR MODAL */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedMilestone(null)}
              className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-50 text-rose-500 rounded-full border border-rose-100">
                {selectedMilestone.icon} {selectedMilestone.date}
              </span>
              <h3 className="text-2xl font-black text-gray-800 mt-2">{selectedMilestone.title}</h3>
            </div>

            {selectedMilestone.image && (
              <div className="rounded-3xl overflow-hidden max-h-64 border border-gray-100 shadow-inner">
                <img src={selectedMilestone.image} alt={selectedMilestone.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 font-serif italic text-sm text-gray-700 leading-relaxed">
              "{selectedMilestone.desc}"
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedMilestone(null)}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-xs shadow-md hover:bg-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

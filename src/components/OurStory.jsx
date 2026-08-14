import React, { useState } from 'react';
import { Award, Heart, Calendar, Sparkles, Plus, Star, Trophy, Flame, CheckCircle2, Clock, Image, Globe, Gift } from 'lucide-react';
import toast from 'react-hot-toast';

const BADGES = [
  { id: 'linked', name: 'Love Pioneers 💍', desc: 'Linked partner accounts in Love-Verse', icon: Heart, color: 'from-rose-400 to-pink-600', isUnlocked: true },
  { id: 'memories', name: 'Memory Keepers 📸', desc: 'Uploaded 5+ romantic memories', icon: Image, color: 'from-blue-400 to-indigo-600', isUnlocked: true },
  { id: 'universe', name: 'Globe Trotters 🌍', desc: 'Pinned 3+ locations on Our Universe', icon: Globe, color: 'from-purple-400 to-pink-500', isUnlocked: true },
  { id: 'games', name: 'Arcade Champions 🎲', desc: 'Played 1v1 couple arcade games', icon: Trophy, color: 'from-amber-400 to-orange-500', isUnlocked: true },
  { id: 'streak', name: '100 Days Together 🔥', desc: 'Completed 100 days of love journey', icon: Flame, color: 'from-emerald-400 to-teal-600', isUnlocked: true }
];

const INITIAL_TIMELINE = [
  { id: 1, date: 'Day 1', title: 'The First Spark ✨', desc: 'The magical day our eyes met and our journey officially began.', type: 'meet', icon: '❤️' },
  { id: 2, date: 'Day 15', title: 'First Official Date 🌹', desc: 'Coffee, long conversations, and laughter that lasted for hours.', type: 'date', icon: '☕' },
  { id: 3, date: 'Day 30', title: 'Partner Link in Love-Verse 🔐', desc: 'Linked our accounts and created our private digital sanctuary.', type: 'milestone', icon: '💍' },
  { id: 4, date: 'Day 50', title: 'First Trip Together ✈️', desc: 'Exploring new sights, eating good food, and making memories.', type: 'trip', icon: '✈️' }
];

function OurStory({ user, daysTogether }) {
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '', desc: '', icon: '💖' });

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
      type: 'custom'
    };

    setTimeline([item, ...timeline]);
    setNewMilestone({ title: '', date: '', desc: '', icon: '💖' });
    setShowAddForm(false);
    toast.success("New Milestone Added to Our Story! 🎉");
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-5xl mx-auto w-full space-y-10 animate-in fade-in duration-500 pb-16 px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md">
          <Trophy size={16} /> Our Story & Milestones
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 italic">
          The Story of Us 💖
        </h2>
        <p className="text-gray-500 font-bold text-sm max-w-md mx-auto italic">
          "Celebrating every milestone, memory, and chapter of our love journey."
        </p>
      </div>

      {/* TOP HERO BANNER */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-4 py-1.5 rounded-full border border-white/30">
            Journey Milestone
          </span>
          <h3 className="text-3xl md:text-4xl font-black">{daysTogether} Days of Love</h3>
          <p className="text-xs font-bold text-rose-100 italic">
            "And every single day gets better than the last."
          </p>
        </div>

        <div className="flex gap-3 z-10">
          <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/30 text-center">
            <p className="text-3xl font-black leading-none">{timeline.length}</p>
            <p className="text-[10px] font-black uppercase tracking-wider mt-1 opacity-90">Chapters</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/30 text-center">
            <p className="text-3xl font-black leading-none">{BADGES.length}</p>
            <p className="text-[10px] font-black uppercase tracking-wider mt-1 opacity-90">Badges</p>
          </div>
        </div>
      </div>

      {/* SECTION 1: COUPLE ACHIEVEMENT BADGES */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Award className="text-rose-500" size={24} /> Couple Achievement Gallery
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`${glassStyle} p-5 text-center flex flex-col items-center justify-between space-y-3 group hover:scale-[1.03] transition-all`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${b.color} text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform`}>
                  <Icon size={26} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-800">{b.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-1 leading-tight">{b.desc}</p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
                  Unlocked ✨
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: TIMELINE ROADMAP */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Sparkles className="text-rose-500" size={24} /> Milestone Timeline
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-5 py-2.5 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-rose-600 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Add Milestone
          </button>
        </div>

        {/* ADD MILESTONE FORM */}
        {showAddForm && (
          <form onSubmit={handleAddMilestone} className={`${glassStyle} p-6 space-y-4 animate-in zoom-in-95`}>
            <h4 className="text-base font-black text-gray-800">✨ Add New Relationship Milestone</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Milestone Title (e.g. First Kiss 💋)"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                className="p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100"
              />
              <input
                type="text"
                placeholder="Date or Day (e.g. May 14 or Day 45)"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                className="p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100"
              />
              <input
                type="text"
                placeholder="Emoji (e.g. 💍, ✈️, 🌹)"
                value={newMilestone.icon}
                onChange={(e) => setNewMilestone({ ...newMilestone, icon: e.target.value })}
                className="p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100"
              />
            </div>

            <textarea
              placeholder="Write a sweet memory note about this milestone..."
              value={newMilestone.desc}
              onChange={(e) => setNewMilestone({ ...newMilestone, desc: e.target.value })}
              rows={2}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs border border-gray-100 resize-none"
            />

            <button
              type="submit"
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black"
            >
              Save Milestone to Timeline 🔒
            </button>
          </form>
        )}

        {/* TIMELINE LIST */}
        <div className="relative border-l-2 border-rose-200 ml-4 md:ml-8 space-y-8 pl-6 md:pl-10">
          {timeline.map((item) => (
            <div key={item.id} className="relative group">
              {/* Timeline Icon Node */}
              <div className="absolute -left-[35px] md:-left-[51px] top-1 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full border-4 border-rose-400 shadow-md flex items-center justify-center text-lg font-black text-rose-500 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>

              <div className={`${glassStyle} p-6 space-y-2 transition-all hover:scale-[1.01]`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                    {item.date}
                  </span>
                  <Heart size={16} className="text-rose-400 fill-rose-100" />
                </div>
                <h4 className="text-xl font-black text-gray-800">{item.title}</h4>
                <p className="text-xs font-bold text-gray-600 leading-relaxed italic">"{item.desc}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OurStory;

import React, { useState } from 'react';
import { Heart, Home, MessageCircle, Zap, Image as ImageIcon, Calendar as CalendarIcon, Gamepad2, ShoppingBag, ShieldCheck, LogOut } from 'lucide-react';

// Sidebar Button Sub-component
function SidebarBtn({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all duration-300 ${
                active
                    ? 'bg-white shadow-md text-rose-500 scale-[1.02] border border-white'
                    : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'
            }`}
        >
            <div className={`${active ? 'text-rose-500' : 'text-gray-400'}`}>
                {icon}
            </div>
            <span className="text-sm tracking-tight">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>}
        </button>
    );
}

const Sidebar = ({ activeTab, setActiveTab, user, handleLogout, sendNudge }) => {
    const glassStyle = "bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl";
    const [isNudging, setIsNudging] = useState(false);

    // Nudge handler with visual feedback
    const handleNudgeClick = () => {
        if (isNudging) return;
        setIsNudging(true);
        sendNudge(); // Dashboard wala function call hoga
        
        // 2 seconds cooldown for animation
        setTimeout(() => setIsNudging(false), 2000);
    };

    return (
        <aside className={`w-[320px] ${glassStyle} rounded-[3rem] p-6 hidden lg:flex flex-col gap-8 sticky top-8 h-[92vh]`}>
            {/* Logo Section */}
            <div className="flex items-center gap-3 px-4">
                <div className="bg-gradient-to-tr from-rose-500 to-pink-500 p-2.5 rounded-2xl shadow-lg shadow-rose-200">
                    <Heart className="text-white fill-white" size={22} />
                </div>
                <h1 className="text-xl font-black tracking-tighter text-gray-800 italic">Love-Verse</h1>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mb-2">The Essentials</p>
                    <SidebarBtn icon={<Home size={20} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <SidebarBtn icon={<MessageCircle size={20} />} label="Chat & Call" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mb-2">Our Connection</p>
                    <SidebarBtn icon={<Zap size={20} />} label="Daily Routine" active={activeTab === 'routine'} onClick={() => setActiveTab('routine')} />
                    <SidebarBtn icon={<ImageIcon size={20} />} label="Memories" active={activeTab === 'memories_tab'} onClick={() => setActiveTab('memories_tab')} />
                    <SidebarBtn icon={<CalendarIcon size={20} />} label="Love Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mb-2">Playground</p>
                    <SidebarBtn icon={<Gamepad2 size={20} />} label="Games" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />
                    <SidebarBtn icon={<ShoppingBag size={20} />} label="Wishlist" active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} />
                </div>

                {/* --- NUDGE SECTION --- */}
                <div className="pt-4">
                    <button
                        onClick={handleNudgeClick}
                        disabled={isNudging}
                        className={`w-full py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-[1.5rem] font-black text-xs shadow-lg shadow-rose-100 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2 group ${isNudging ? 'opacity-80' : ''}`}
                    >
                        <Heart 
                            size={16} 
                            fill="white" 
                            className={`${isNudging ? 'animate-bounce' : 'group-hover:animate-ping'}`} 
                        />
                        {isNudging ? 'HUG SENT! ✨' : 'SEND A HUG ❤️'}
                    </button>
                </div>
            </div>

            {/* User & Footer Section */}
            <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="bg-rose-50/50 p-4 rounded-3xl flex items-center justify-between border border-rose-100">
                    <div className="flex items-center gap-2 text-rose-500">
                        <ShieldCheck size={18} /><span className="text-xs font-black tracking-tight">Nazar Na Lage</span>
                    </div>
                    <div className="w-10 h-5 bg-rose-500 rounded-full flex items-center px-1">
                        <div className="w-3 h-3 bg-white rounded-full ml-auto shadow-sm"></div>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-black border-2 border-white">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-800 truncate">{user?.name}</p>
                        <p className="text-[9px] font-bold text-green-500 uppercase">Active Now</p>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
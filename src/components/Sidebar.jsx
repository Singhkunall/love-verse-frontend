import React, { useState } from 'react';
import { Heart, Home, MessageCircle, Zap, Image as ImageIcon, Calendar as CalendarIcon, Gamepad2, ShoppingBag, LogOut, RotateCw, Menu, X, PlaySquare, Globe, Trophy, Radio, Touchpad } from 'lucide-react';
function SidebarBtn({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all duration-300 ${active
                    ? 'bg-white shadow-md text-rose-500 scale-[1.02] border border-white'
                    : 'text-gray-500 hover:bg-white/40 hover:text-gray-700'
                }`}
        >
            <div className={`${active ? 'text-rose-500' : 'text-gray-400'}`}>{icon}</div>
            <span className="text-sm tracking-tight">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>}
        </button>
    );
}

// Mobile bottom nav button
function BottomNavBtn({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${active ? 'text-rose-500' : 'text-gray-400'
                }`}
        >
            <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-rose-50' : ''}`}>
                {icon}
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
        </button>
    );
}

const Sidebar = ({ activeTab, setActiveTab, user, handleLogout, sendNudge }) => {
    const glassStyle = "bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl";
    const [isNudging, setIsNudging] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleNudgeClick = () => {
        if (isNudging) return;
        setIsNudging(true);
        sendNudge();
        setTimeout(() => setIsNudging(false), 2000);
    };

    const navItems = [
        { icon: <Home size={20} />, label: "Home", tab: 'home' },
        { icon: <MessageCircle size={20} />, label: "Chat", tab: 'chat' },
        { icon: <Gamepad2 size={20} />, label: "Games", tab: 'games' },
        { icon: <ImageIcon size={20} />, label: "Memories", tab: 'memories_tab' },
        { icon: <Menu size={20} />, label: "More", tab: 'more' },
        { icon: <Globe size={20} />, label: "Universe", tab: 'universe' },

    ];

    return (
        <>
            {/* DESKTOP SIDEBAR */}
            <aside className={`w-[320px] ${glassStyle} rounded-[3rem] p-6 hidden lg:flex flex-col gap-8 sticky top-8 h-[92vh]`}>
                <div className="flex items-center gap-3 px-4">
                    <div className="bg-gradient-to-tr from-rose-500 to-pink-500 p-2.5 rounded-2xl shadow-lg shadow-rose-200">
                        <Heart className="text-white fill-white" size={22} />
                    </div>
                    <h1 className="text-xl font-black tracking-tighter text-gray-800 italic">Love-Verse</h1>
                </div>

                <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mb-2">The Essentials</p>
                        <SidebarBtn icon={<Home size={20} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                        <SidebarBtn icon={<MessageCircle size={20} />} label="Chat & Call" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                        <SidebarBtn icon={<PlaySquare size={20} />} label="Watch Together" active={activeTab === 'watch_together'} onClick={() => setActiveTab('watch_together')} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mb-2">Our Connection</p>
                        <SidebarBtn icon={<Radio size={20} />} label="Couple Beats Radio" active={activeTab === 'couple_beats'} onClick={() => setActiveTab('couple_beats')} />
                        <SidebarBtn icon={<Touchpad size={20} />} label="Virtual Touch" active={activeTab === 'virtual_touch'} onClick={() => setActiveTab('virtual_touch')} />
                        <SidebarBtn icon={<Zap size={20} />} label="Daily Routine" active={activeTab === 'routine'} onClick={() => setActiveTab('routine')} />
                        <SidebarBtn icon={<ImageIcon size={20} />} label="Memories" active={activeTab === 'memories_tab'} onClick={() => setActiveTab('memories_tab')} />
                        <SidebarBtn icon={<CalendarIcon size={20} />} label="Love Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
                        <SidebarBtn icon={<Globe size={20} />} label="Our Universe" active={activeTab === 'universe'} onClick={() => setActiveTab('universe')} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mb-2">Playground</p>
                        <SidebarBtn icon={<Gamepad2 size={20} />} label="Games" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />
                        <SidebarBtn icon={<RotateCw size={20} />} label="Love Roulette" active={activeTab === 'roulette'} onClick={() => setActiveTab('roulette')} />
                        <SidebarBtn icon={<ShoppingBag size={20} />} label="Wishlist" active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} />
                    </div>
                    <div className="pt-4">
                        <button
                            onClick={handleNudgeClick}
                            disabled={isNudging}
                            className={`w-full py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-[1.5rem] font-black text-xs shadow-lg hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-2 group ${isNudging ? 'opacity-80' : ''}`}
                        >
                            <Heart size={16} fill="white" className={`${isNudging ? 'animate-bounce' : 'group-hover:animate-ping'}`} />
                            {isNudging ? 'HUG SENT! ✨' : 'SEND A HUG ❤️'}
                        </button>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
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

            {/* MOBILE BOTTOM NAV */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-rose-100 shadow-2xl">
                <div className="flex items-center px-2 py-1">
                    <BottomNavBtn icon={<Home size={20} />} label="Home" active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }} />
                    <BottomNavBtn icon={<MessageCircle size={20} />} label="Chat" active={activeTab === 'chat'} onClick={() => { setActiveTab('chat'); setMobileMenuOpen(false); }} />

                    {/* Center Hug Button */}
                    <button
                        onClick={handleNudgeClick}
                        className="flex flex-col items-center justify-center flex-1 py-1"
                    >
                        <div className={`w-12 h-12 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 -mt-6 border-4 border-white transition-all ${isNudging ? 'scale-90' : 'scale-100'}`}>
                            <Heart size={20} className="text-white fill-white" />
                        </div>
                        <span className="text-[9px] font-black text-rose-500 uppercase mt-1">{isNudging ? 'Sent!' : 'Hug'}</span>
                    </button>

                    <BottomNavBtn icon={<Gamepad2 size={20} />} label="Games" active={activeTab === 'games'} onClick={() => { setActiveTab('games'); setMobileMenuOpen(false); }} />
                    <BottomNavBtn icon={<Menu size={20} />} label="More" active={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
                </div>
            </div>

            {/* MOBILE MORE MENU */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
                    <div
                        className="absolute bottom-20 left-4 right-4 bg-white rounded-[2rem] p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* User Info */}
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white font-black">
                                {user?.name?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-800">{user?.name}</p>
                                <p className="text-[10px] font-bold text-green-500 uppercase">Active Now</p>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="ml-auto text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: <Radio size={20} />, label: "Beats Radio", tab: 'couple_beats' },
                                { icon: <Touchpad size={20} />, label: "Virtual Touch", tab: 'virtual_touch' },
                                { icon: <Zap size={20} />, label: "Routine", tab: 'routine' },
                                { icon: <ImageIcon size={20} />, label: "Memories", tab: 'memories_tab' },
                                { icon: <CalendarIcon size={20} />, label: "Calendar", tab: 'calendar' },
                                { icon: <RotateCw size={20} />, label: "Roulette", tab: 'roulette' },
                                { icon: <ShoppingBag size={20} />, label: "Wishlist", tab: 'wishlist' },
                                { icon: <PlaySquare size={20} />, label: "Watch Together", tab: 'watch_together' },

                                { icon: <LogOut size={20} />, label: "Logout", tab: 'logout' },
                            ].map((item) => (
                                <button
                                    key={item.tab}
                                    onClick={() => {
                                        if (item.tab === 'logout') {
                                            handleLogout();
                                        } else {
                                            setActiveTab(item.tab);
                                        }
                                        setMobileMenuOpen(false);
                                    }}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${activeTab === item.tab
                                            ? 'bg-rose-50 text-rose-500'
                                            : 'bg-gray-50 text-gray-500'
                                        }`}
                                >
                                    {item.icon}
                                    <span className="text-[10px] font-black uppercase">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
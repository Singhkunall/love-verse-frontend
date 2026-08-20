import React, { useState } from 'react';
import { Bell, Heart, MessageSquare, Sparkles, CheckCircle2, User, X, Shield, Trash2 } from 'lucide-react';

function NotificationCenter({ isOpen, onClose, notifications, onClearAll }) {
  const [activeFilter, setActiveFilter] = useState('all');

  if (!isOpen) return null;

  const filteredNotifications = (notifications || []).filter(item => {
    if (activeFilter === 'chat') return item.type === 'chat' || item.type === 'voice';
    if (activeFilter === 'love') return item.type === 'hug' || item.type === 'mood' || item.type === 'memory';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in flex justify-end" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-white/95 backdrop-blur-2xl h-full shadow-2xl border-l border-white/80 p-5 flex flex-col gap-4 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100/80">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
              <Bell size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-800">Activity Hub</h4>
              <p className="text-[10px] text-gray-400 font-bold">Partner updates & missed activity</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {notifications && notifications.length > 0 && (
              <button 
                onClick={onClearAll}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title="Clear all"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'chat', label: 'Messages 💬' },
            { id: 'love', label: 'Love Nudges ❤️' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                activeFilter === filter.id ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-20 text-center text-gray-400 space-y-2">
              <Sparkles size={32} className="mx-auto text-rose-300 opacity-60" />
              <p className="text-xs font-bold italic">Sab Shant Hai! Everything is up to date ✨</p>
              <p className="text-[10px] text-gray-300 font-medium">Partner updates will appear right here.</p>
            </div>
          ) : (
            filteredNotifications.map((notif, idx) => (
              <div 
                key={idx}
                className="p-3 bg-white border border-rose-100/80 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-start gap-3"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base shadow-inner ${
                  notif.type === 'hug' ? 'bg-rose-50 text-rose-500 border border-rose-100' :
                  notif.type === 'mood' ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                  'bg-purple-50 text-purple-500 border border-purple-100'
                }`}>
                  {notif.type === 'hug' ? '❤️' : notif.type === 'mood' ? '😊' : '💬'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-gray-800 truncate">{notif.title}</h5>
                    <span className="text-[9px] font-bold text-gray-400 shrink-0">{notif.time || 'Just now'}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-medium leading-snug mt-0.5">{notif.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-2 border-t border-rose-100/60 text-center">
          <p className="text-[9px] text-gray-400 font-bold flex items-center justify-center gap-1">
            <Shield size={10} className="text-emerald-500" /> Private Connected Couple Sanctuary
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;

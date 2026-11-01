import React, { useState } from 'react';
import { X, Heart, Shield, User, Mail, AlertTriangle, Loader2, Sparkles, LogOut, Check } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

function SettingsModal({ isOpen, onClose, user, onPartnerUnlinked, onLogout }) {
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const partner = user?.partnerId;
  const isPartnerConnected = Boolean(partner);
  const partnerName = (typeof partner === 'object' && partner?.name) || user?.partnerName || 'Partner';
  const partnerEmail = (typeof partner === 'object' && partner?.email) || user?.partnerEmail;
  const partnerAvatar = typeof partner === 'object' ? partner?.avatar : null;

  const handleUnlink = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/unlink`, {
        userId: user._id || user.id
      });
      toast.success(res.data.message || "Partner unlinked successfully.");
      setConfirmUnlink(false);
      onPartnerUnlinked?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to disconnect partner.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-rose-100 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Sanctuary Settings</h3>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Account & Preferences</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full bg-rose-50 border border-rose-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Your Profile Card */}
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-3">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
            <User size={13} /> Your Account
          </p>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-black text-lg flex items-center justify-center shadow-md border-2 border-white overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black text-gray-800 truncate">{user?.name}</h4>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                <Mail size={12} className="text-rose-400 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Partner Connection Card */}
        <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
              <Heart size={13} className="fill-rose-500 text-rose-500" /> Linked Partner
            </p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPartnerConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
              {isPartnerConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {isPartnerConnected ? (
            <div className="flex items-center gap-3.5 pt-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-black text-base flex items-center justify-center shadow-md border-2 border-white overflow-hidden shrink-0">
                {partnerAvatar ? (
                  <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                ) : (
                  partnerName?.charAt(0) || 'P'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-gray-800 truncate">{partnerName}</h4>
                <p className="text-xs text-gray-500 truncate mt-0.5">{partnerEmail}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No partner linked yet. Share your email from Dashboard to link!</p>
          )}
        </div>

        {/* Security & App Info */}
        <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 space-y-2">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <Shield size={13} /> Private & Encrypted Sanctuary
          </p>
          <p className="text-xs text-gray-600 leading-relaxed font-medium">
            Your calls and messages in Love-Verse are strictly private between you and your partner.
          </p>
        </div>

        {/* Danger Zone: Unlink Partner */}
        {isPartnerConnected && (
          <div className="p-4 rounded-2xl border border-red-100 bg-red-50/40 space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={16} />
              <h5 className="text-xs font-black uppercase tracking-wider">Danger Zone</h5>
            </div>

            {!confirmUnlink ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Need to change or disconnect your partner? You can safely unlink below.
                </p>
                <button
                  onClick={() => setConfirmUnlink(true)}
                  className="w-full py-2.5 px-4 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  Disconnect from {partnerName}
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-white rounded-xl border border-red-200 shadow-sm animate-in fade-in">
                <p className="text-xs font-bold text-red-700">
                  Are you absolutely sure you want to disconnect?
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  This will unlink your accounts immediately. You can re-link anytime using partner email.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setConfirmUnlink(false)}
                    disabled={loading}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnlink}
                    disabled={loading}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : "Yes, Unlink"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-rose-100/70 text-xs text-gray-400">
          <span>Love-Verse v2.0</span>
          {onLogout && (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-red-500 font-bold hover:underline flex items-center gap-1"
            >
              <LogOut size={13} /> Log out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Send, X, Heart, Sparkles, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';

export default function WidgetSnapModal({ isOpen, onClose, user, partnerName, daysTogether }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Photo size should be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSnap = async () => {
    if (!photoPreview) {
      toast.error('Pehle ek selfie ya photo select karein 📸');
      return;
    }

    try {
      setIsUploading(true);
      const userId = user?._id || user?.id;
      const res = await axios.post(`${API_BASE}/api/auth/widget/upload-snap`, {
        userId,
        photo: photoPreview,
        caption: caption.trim()
      });

      if (res.data?.success) {
        toast.success(`Photo sent to ${partnerName}'s Home Screen! 💖`);
        // If running in Android App, sync local widget as well
        if (typeof window !== 'undefined' && window.LoveVerseWidget?.syncWidget) {
          window.LoveVerseWidget.syncWidget(
            userId,
            partnerName,
            res.data.photoUrl,
            String(daysTogether),
            user?.mood || 'Romantic ❤️'
          );
        }
        setPhotoPreview(null);
        setCaption('');
        onClose();
      }
    } catch (err) {
      console.error('Widget upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to update widget');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-white overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30 text-white">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Send Home Screen Snap</h2>
              <p className="text-xs text-rose-300">Will appear on {partnerName}'s phone widget</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Photo Selection / Preview Area */}
        <div className="mt-5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="user"
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-white/20 bg-black group">
              <img
                src={photoPreview}
                alt="Snap preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>

              {/* Retake Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/20 text-xs font-semibold hover:bg-black/80 flex items-center gap-1.5"
              >
                <Camera size={13} />
                <span>Change</span>
              </button>

              <div className="absolute bottom-3 inset-x-3 text-xs text-white/90 font-medium">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/80 font-bold text-[11px] mr-2">
                  Widget Preview
                </span>
                {caption ? `"${caption}"` : 'Your photo ready to send!'}
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-52 rounded-2xl border-2 border-dashed border-rose-500/40 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer p-4 text-center group"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/20 group-hover:bg-rose-500/30 flex items-center justify-center text-rose-400 text-2xl transition-all">
                <Camera size={26} />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Take a Selfie or Pick Photo</p>
                <p className="text-xs text-slate-400 mt-1">Tap to capture a moment for {partnerName}'s Home Screen</p>
              </div>
            </div>
          )}
        </div>

        {/* Romantic Caption Input */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Add a cute note:
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Thinking of you at work ☕❤️"
            maxLength={60}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm text-white placeholder-slate-500"
          />
        </div>

        {/* Action Button */}
        <div className="mt-5">
          <button
            onClick={handleUploadSnap}
            disabled={!photoPreview || isUploading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 font-bold text-sm text-white shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending to Home Screen...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send to {partnerName}'s Home Screen</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

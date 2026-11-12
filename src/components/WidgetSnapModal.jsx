import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Send, X, RotateCcw, SwitchCamera, Sparkles } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';

export default function WidgetSnapModal({ isOpen, onClose, user, partnerName, daysTogether }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const systemCameraInputRef = useRef(null);

  // Start camera when modal opens and photoPreview is null
  useEffect(() => {
    if (isOpen && !photoPreview) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, photoPreview, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setCameraActive(true);
      }
    } catch (err) {
      console.warn("Live camera init error, fallback to system camera:", err);
      setCameraError(true);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Capture current frame from live video
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      // Mirror if front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      setPhotoPreview(dataUrl);
    } catch (err) {
      console.error("Snapshot error:", err);
      toast.error("Failed to capture snapshot");
    }
  };

  // Handle Gallery Pick or System Camera file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error('Photo size should be less than 15MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        stopCamera();
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setPhotoPreview(null);
    setCaption('');
  };

  const handleUploadSnap = async () => {
    if (!photoPreview) {
      toast.error('Pehle photo capture ya select karein 📸');
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
        
        // Sync local widget as well
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl p-5 shadow-2xl text-white overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow">
              <Camera size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Home Screen Snap 📸</h2>
              <p className="text-[11px] text-rose-300">Will reflect on {partnerName}'s phone widget</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={systemCameraInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="user"
          className="hidden"
        />

        {/* VIEW AREA: CAMERA VIEWFINDER OR PHOTO PREVIEW */}
        <div className="mt-4">
          {photoPreview ? (
            /* Snapshot Preview Mode */
            <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-white/20 bg-black">
              <img
                src={photoPreview}
                alt="Captured Snap"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

              {/* Retake Button */}
              <button
                onClick={retakePhoto}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/20 text-xs font-semibold hover:bg-black/80 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RotateCcw size={13} />
                <span>Retake</span>
              </button>

              <div className="absolute bottom-3 inset-x-3 text-xs text-white/90">
                <span className="px-2 py-0.5 rounded bg-rose-500 font-bold text-[10px] mr-1.5 shadow">
                  Widget View
                </span>
                <span>{caption ? `"${caption}"` : 'Ready to send to widget!'}</span>
              </div>
            </div>
          ) : !cameraError ? (
            /* Live Camera Viewfinder Mode */
            <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-rose-500/40 bg-black shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Guidelines */}
              <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none"></div>

              {/* Flip Camera Button */}
              <button
                onClick={toggleCameraFacing}
                title="Switch Camera"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white flex items-center justify-center shadow active:scale-90 transition-all"
              >
                <SwitchCamera size={16} />
              </button>

              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] font-bold text-rose-300 flex items-center gap-1 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Live Camera</span>
              </div>

              {/* Bottom Bar with Big Shutter & Gallery Buttons */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-around px-6">
                {/* Gallery Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload from Gallery"
                  className="w-11 h-11 rounded-2xl bg-black/60 backdrop-blur border border-white/20 text-white hover:text-rose-400 flex flex-col items-center justify-center text-xs shadow active:scale-90 transition-all"
                >
                  <ImageIcon size={18} />
                </button>

                {/* Big Shutter Button */}
                <button
                  onClick={takeSnapshot}
                  title="Take Photo"
                  className="w-16 h-16 rounded-full p-1 bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl active:scale-95 transition-all group"
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 border-2 border-white flex items-center justify-center text-white group-hover:scale-95 transition-transform shadow-lg">
                    <Camera size={22} />
                  </div>
                </button>

                {/* System Camera Fallback Button */}
                <button
                  onClick={() => systemCameraInputRef.current?.click()}
                  title="Phone Camera App"
                  className="w-11 h-11 rounded-2xl bg-black/60 backdrop-blur border border-white/20 text-white hover:text-rose-400 flex flex-col items-center justify-center text-xs shadow active:scale-90 transition-all"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>
          ) : (
            /* Fallback Card if Live Camera is blocked */
            <div className="w-full h-72 rounded-2xl border-2 border-dashed border-rose-500/40 bg-rose-500/5 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 text-xl">
                <Camera size={24} />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Choose How to Take Photo</p>
                <p className="text-xs text-slate-400 mt-0.5">Direct phone camera or gallery</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
                <button
                  onClick={() => systemCameraInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 font-bold text-xs text-white shadow flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Camera size={14} />
                  <span>Open Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-xs text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <ImageIcon size={14} />
                  <span>From Gallery</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Romantic Caption & Send Button (Only shown when photoPreview is ready) */}
        {photoPreview && (
          <div className="mt-3.5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Add a cute note for {partnerName}:
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Thinking of you ☕❤️"
                maxLength={60}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-xs text-white placeholder-slate-500"
              />
            </div>

            <button
              onClick={handleUploadSnap}
              disabled={isUploading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 font-bold text-xs text-white shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending to Widget...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Send to {partnerName}'s Home Screen 🚀</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

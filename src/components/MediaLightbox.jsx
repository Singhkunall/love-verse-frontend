import React, { useEffect } from 'react';
import { X, Download, Share2, Sparkles } from 'lucide-react';

function MediaLightbox({ isOpen, onClose, media }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !media || !media.url) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const extension = media.type === 'video' ? 'mp4' : 'jpg';
      a.download = `love_verse_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(media.url, '_blank');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/92 backdrop-blur-2xl flex flex-col justify-between p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div 
        className="flex items-center justify-between z-10 w-full max-w-5xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-bold">
          <Sparkles size={14} className="text-rose-400" />
          <span className="truncate max-w-[200px] md:max-w-md">{media.caption || 'Love Memory'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Download Media"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Media Container */}
      <div 
        className="flex-1 flex items-center justify-center p-2 md:p-4 min-h-0"
        onClick={onClose}
      >
        <div 
          className="relative max-w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {media.type === 'video' ? (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-h-[80vh] max-w-[92vw] rounded-2xl shadow-2xl object-contain border border-white/10"
            />
          ) : (
            <img
              src={media.url}
              alt={media.caption || "Preview"}
              className="max-h-[80vh] max-w-[92vw] rounded-2xl shadow-2xl object-contain border border-white/10 transition-transform duration-300"
            />
          )}
        </div>
      </div>

      {/* Bottom Metadata Info */}
      <div 
        className="text-center text-xs text-gray-400 font-medium z-10 pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {media.date && <span>Captured on {new Date(media.date).toLocaleDateString()} • </span>}
        <span>Tap anywhere outside to close</span>
      </div>
    </div>
  );
}

export default MediaLightbox;

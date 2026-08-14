import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Disc, Volume2, VolumeX, Sparkles, Heart, Radio } from 'lucide-react';
import toast from 'react-hot-toast';

const PLAYLIST = [
  {
    id: 1,
    title: 'Cozy Lo-Fi Love 🎧',
    artist: 'LoveVerse Chill Beats',
    duration: '2:45',
    src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80'
  },
  {
    id: 2,
    title: 'Romantic Acoustic Sunset 🎸',
    artist: 'Acoustic Dreams',
    duration: '3:10',
    src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sweet-love-12156.mp3',
    cover: 'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?w=400&q=80'
  },
  {
    id: 3,
    title: 'Midnight Piano Romance 🎹',
    artist: 'Moonlight Serenade',
    duration: '2:30',
    src: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a14b3d.mp3?filename=romantic-piano-10656.mp3',
    cover: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80'
  }
];

function CoupleBeats({ user, roomId, socket }) {
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const audioRef = useRef(null);
  const currentTrack = PLAYLIST[currentTrackIdx];

  // Socket Synchronization Handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('beats_play_sync', (data) => {
      if (data.trackIdx !== currentTrackIdx) {
        setCurrentTrackIdx(data.trackIdx);
      }
      if (audioRef.current) {
        audioRef.current.currentTime = data.currentTime || 0;
        audioRef.current.play().catch(e => console.log(e));
      }
      setIsPlaying(true);
      toast.success("Partner started music sync! 🎶");
    });

    socket.on('beats_pause_sync', () => {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    });

    socket.on('beats_track_sync', (data) => {
      setCurrentTrackIdx(data.trackIdx);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log(e));
      }
    });

    return () => {
      socket.off('beats_play_sync');
      socket.off('beats_pause_sync');
      socket.off('beats_track_sync');
    };
  }, [socket, currentTrackIdx]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (socket) socket.emit('beats_pause', { roomId });
    } else {
      audioRef.current.play().catch(e => console.log(e));
      setIsPlaying(true);
      if (socket) {
        socket.emit('beats_play', {
          roomId,
          trackIdx: currentTrackIdx,
          currentTime: audioRef.current.currentTime
        });
      }
    }
  };

  const handleNextTrack = () => {
    const nextIdx = (currentTrackIdx + 1) % PLAYLIST.length;
    setCurrentTrackIdx(nextIdx);
    setIsPlaying(true);
    if (socket) socket.emit('beats_change_track', { roomId, trackIdx: nextIdx });
  };

  const handlePrevTrack = () => {
    const prevIdx = (currentTrackIdx - 1 + PLAYLIST.length) % PLAYLIST.length;
    setCurrentTrackIdx(prevIdx);
    setIsPlaying(true);
    if (socket) socket.emit('beats_change_track', { roomId, trackIdx: prevIdx });
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500 pb-16 px-4">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleNextTrack}
        autoPlay={isPlaying}
      />

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md">
          <Radio size={16} /> Couple Beats & Synced Music
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 italic">
          Synchronized Radio 🎶
        </h2>
        <p className="text-gray-500 font-bold text-sm max-w-md mx-auto italic">
          "Listen to romantic lo-fi beats together in real-time."
        </p>
      </div>

      {/* MAIN VINYL PLAYER CARD */}
      <div className={`${glassStyle} p-8 md:p-12 text-center space-y-8 relative overflow-hidden`}>
        
        {/* Vinyl Record Visualizer */}
        <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto group">
          <div className={`w-full h-full rounded-full bg-slate-900 border-4 border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center transition-transform duration-1000 ${
            isPlaying ? 'animate-spin-slow shadow-rose-300' : ''
          }`}>
            <img
              src={currentTrack.cover}
              alt={currentTrack.title}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-slate-900 shadow-md"
            />
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-rose-500 rounded-full border-2 border-white shadow-inner" />
        </div>

        {/* Track Title & Artist */}
        <div className="space-y-1">
          <h3 className="text-2xl md:text-3xl font-black text-gray-800">{currentTrack.title}</h3>
          <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">{currentTrack.artist}</p>
        </div>

        {/* Time Progress Bar */}
        <div className="space-y-2 max-w-md mx-auto">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-black text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Media Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handlePrevTrack}
            className="p-4 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-500 rounded-full transition-all shadow-sm"
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all"
          >
            {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>

          <button
            onClick={handleNextTrack}
            className="p-4 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-500 rounded-full transition-all shadow-sm"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Volume Control Bar */}
        <div className="flex items-center justify-center gap-3 pt-2 max-w-xs mx-auto">
          <button onClick={() => setVolume(v => v > 0 ? 0 : 0.7)} className="text-gray-400">
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-rose-500 cursor-pointer"
          />
        </div>
      </div>

      {/* PLAYLIST SELECTION GRID */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Synced Playlist Tracks</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAYLIST.map((track, idx) => {
            const isSelected = currentTrackIdx === idx;
            return (
              <div
                key={track.id}
                onClick={() => {
                  setCurrentTrackIdx(idx);
                  setIsPlaying(true);
                  if (socket) socket.emit('beats_change_track', { roomId, trackIdx: idx });
                }}
                className={`${glassStyle} p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] ${
                  isSelected ? 'border-2 border-rose-500 bg-rose-50/50' : ''
                }`}
              >
                <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-gray-800 truncate">{track.title}</p>
                  <p className="text-[10px] font-bold text-gray-400">{track.artist}</p>
                </div>
                {isSelected && isPlaying && (
                  <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CoupleBeats;

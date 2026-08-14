import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Flame, Waves, Coffee, Sparkles, Moon, Play, Pause, Heart, Music } from 'lucide-react';
import toast from 'react-hot-toast';

const ambientTracks = [
  {
    id: 'rain',
    name: 'Cozy Rain',
    icon: CloudRain,
    color: 'from-blue-400 to-indigo-600',
    // High-quality public web audio synth simulation
    freq: 220,
    type: 'pink'
  },
  {
    id: 'fire',
    name: 'Campfire Night',
    icon: Flame,
    color: 'from-amber-400 to-orange-600',
    freq: 180,
    type: 'brown'
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: Waves,
    color: 'from-teal-400 to-cyan-600',
    freq: 150,
    type: 'sine'
  },
  {
    id: 'cafe',
    name: 'Cafe Ambience',
    icon: Coffee,
    color: 'from-amber-600 to-yellow-800',
    freq: 260,
    type: 'triangle'
  }
];

const romanticQuotes = [
  "In all the world, there is no heart for me like yours. In all the world, there is no love for you like mine.",
  "You are my today and all of my tomorrows.",
  "I loved you yesterday, love you still, always have, always will.",
  "Whatever our souls are made of, yours and mine are the same.",
  "Together is a wonderful place to be."
];

function AmbientRoom({ user }) {
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef(null);
  const oscNodeRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    // Rotate quotes every 10 seconds
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % romanticQuotes.length);
    }, 10000);

    return () => {
      clearInterval(interval);
      stopAudio();
    };
  }, []);

  const startAudio = (track) => {
    try {
      stopAudio();
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = track.type === 'pink' ? 'triangle' : track.type;
      osc.frequency.setValueAtTime(track.freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscNodeRef.current = osc;
      gainNodeRef.current = gain;

      setActiveTrackId(track.id);
      setIsPlaying(true);
      toast.success(`Playing ${track.name} Ambiance ✨`);
    } catch (err) {
      console.error("Audio synth error", err);
      toast.error("Audio playback not supported on browser!");
    }
  };

  const stopAudio = () => {
    if (oscNodeRef.current) {
      try { oscNodeRef.current.stop(); } catch (e) {}
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
    }
    setIsPlaying(false);
    setActiveTrackId(null);
  };

  const handleToggleTrack = (track) => {
    if (activeTrackId === track.id && isPlaying) {
      stopAudio();
    } else {
      startAudio(track);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(newVol * 0.2, audioCtxRef.current.currentTime);
    }
  };

  const glassStyle = "bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-500 pb-16 px-4">
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md">
          <Moon size={16} /> Lo-Fi & Relaxation Haven
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 italic">
          Ambient Date Room 🌌
        </h2>
        <p className="text-gray-500 font-bold text-sm max-w-md mx-auto italic">
          "Turn on ambient soundscapes, relax together, and cherish quiet moments."
        </p>
      </div>

      {/* Main Quote Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] p-10 text-white text-center shadow-2xl relative overflow-hidden group border border-indigo-900">
        <div className="absolute top-4 left-4 text-indigo-400 opacity-20">
          <Sparkles size={80} />
        </div>
        <div className="absolute bottom-4 right-4 text-purple-400 opacity-20">
          <Heart size={80} fill="currentColor" />
        </div>

        <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.3em] bg-indigo-900/60 px-4 py-1.5 rounded-full border border-indigo-700">
            Quote of the Hour
          </span>
          <p className="text-xl md:text-2xl font-serif italic text-indigo-100 leading-relaxed drop-shadow-md">
            "{romanticQuotes[quoteIndex]}"
          </p>
        </div>
      </div>

      {/* Soundscape Track Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ambientTracks.map((track) => {
          const Icon = track.icon;
          const isActive = activeTrackId === track.id && isPlaying;

          return (
            <div
              key={track.id}
              onClick={() => handleToggleTrack(track)}
              className={`${glassStyle} p-6 cursor-pointer group transition-all duration-300 hover:scale-[1.03] relative overflow-hidden flex flex-col justify-between min-h-[200px] ${
                isActive ? 'border-2 border-indigo-500 shadow-indigo-100' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${track.color} text-white flex items-center justify-center shadow-md`}>
                  <Icon size={28} />
                </div>

                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'
                }`}>
                  {isActive ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </div>
              </div>

              <div>
                <h4 className="text-xl font-black text-gray-800">{track.name}</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                  {isActive ? 'Playing Live ✨' : 'Click to Play'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Volume & Master Control Bar */}
      <div className={`${glassStyle} p-6 flex flex-col md:flex-row items-center justify-between gap-6`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <Music size={20} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-800">
              {isPlaying ? `Playing ${ambientTracks.find(t => t.id === activeTrackId)?.name}` : 'Audio Paused'}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase">Master Sound Control</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => setVolume((prev) => (prev > 0 ? 0 : 0.5))}
            className="text-gray-500 hover:text-indigo-600"
          >
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full md:w-48 accent-indigo-600 cursor-pointer"
          />

          {isPlaying && (
            <button
              onClick={stopAudio}
              className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black shadow-sm hover:bg-red-600 shrink-0"
            >
              Stop Sound
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AmbientRoom;

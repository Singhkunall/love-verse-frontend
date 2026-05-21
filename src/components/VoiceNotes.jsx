import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Mic, MicOff, Play, Pause, Heart, Send, Trash2 } from 'lucide-react';

function VoiceNotes({ user, roomId, socket }) {
  const [voiceNotes, setVoiceNotes] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRefs = useRef({});

  const userId = user._id || user.id;

  useEffect(() => {
    fetchVoiceNotes();

    socket.on("receive_voice_note", (data) => {
      setVoiceNotes(prev => [data, ...prev]);
      toast(`${data.senderName} ne Voice Note bheja! 🎙️`, {
        icon: '🎙️',
        style: { background: '#fff0f3', color: '#e11d48', border: '2px solid #fb7185' }
      });
    });

    socket.on("voice_reaction_update", (data) => {
      setVoiceNotes(prev => prev.map(vn =>
        vn._id === data.noteId ? { ...vn, reaction: data.reaction } : vn
      ));
    });

    return () => {
      socket.off("receive_voice_note");
      socket.off("voice_reaction_update");
    };
  }, []);

  const fetchVoiceNotes = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/voice-notes/${roomId}`);
      setVoiceNotes(res.data);
    } catch (err) {
      console.error("Voice notes fetch error:", err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      toast.error("Mic access denied!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendVoiceNote = async () => {
    if (!audioBlob) return;
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result;

        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/voice-notes/upload`, {
          roomId,
          senderId: userId,
          senderName: user.name,
          audio: base64Audio,
          duration: recordingTime,
        });

        socket.emit("new_voice_note", {
          ...res.data,
          roomId,
        });

        setVoiceNotes(prev => [res.data, ...prev]);
        setAudioBlob(null);
        setAudioPreview(null);
        setRecordingTime(0);
        toast.success("Voice Note bheja gaya! 🎙️");
      };
    } catch (err) {
      toast.error("Send failed!");
    }
    setUploading(false);
  };

  const handlePlay = (id, url) => {
    if (playingId === id) {
      audioRefs.current[id]?.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId].pause();
      }
      if (!audioRefs.current[id]) {
        audioRefs.current[id] = new Audio(url);
        audioRefs.current[id].onended = () => setPlayingId(null);
      }
      audioRefs.current[id].play();
      setPlayingId(id);

      // Mark as heard
      if (!voiceNotes.find(vn => vn._id === id)?.isHeard) {
        axios.put(`${import.meta.env.VITE_API_URL}/api/voice-notes/heard/${id}`);
        setVoiceNotes(prev => prev.map(vn =>
          vn._id === id ? { ...vn, isHeard: true } : vn
        ));
      }
    }
  };

  const handleReaction = async (id, reaction) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/voice-notes/react/${id}`, { reaction });
      socket.emit("voice_note_reaction", { roomId, noteId: id, reaction });
      setVoiceNotes(prev => prev.map(vn =>
        vn._id === id ? { ...vn, reaction } : vn
      ));
    } catch (err) {
      toast.error("Reaction failed!");
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const unheardCount = voiceNotes.filter(vn =>
    vn.senderId !== userId && !vn.isHeard
  ).length;

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-500">

      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          🎙️ Voice Notes
          {unheardCount > 0 && (
            <span className="bg-rose-500 text-white text-xs font-black px-2 py-1 rounded-full animate-pulse">
              {unheardCount} new
            </span>
          )}
        </h3>
      </div>

      {/* Recording Card */}
      <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-xl text-center">
        {!audioPreview ? (
          <div className="space-y-6">
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all ${recording ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200' : 'bg-rose-100'}`}>
              {recording ? <MicOff size={36} className="text-white" /> : <Mic size={36} className="text-rose-500" />}
            </div>

            {recording && (
              <p className="text-red-500 font-black text-2xl">{formatTime(recordingTime)}</p>
            )}

            <button
              onClick={recording ? stopRecording : startRecording}
              className={`px-8 py-3 rounded-2xl font-black text-white transition-all ${recording ? 'bg-red-500 hover:bg-red-600' : 'bg-rose-500 hover:bg-rose-600'}`}
            >
              {recording ? '⏹ Stop Recording' : '🎙️ Start Recording'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-black text-gray-400 uppercase">Preview</p>
            <audio src={audioPreview} controls className="w-full rounded-2xl" />
            <div className="flex gap-3">
              <button
                onClick={() => { setAudioBlob(null); setAudioPreview(null); }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold"
              >
                Discard
              </button>
              <button
                onClick={sendVoiceNote}
                disabled={uploading}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                {uploading ? "Sending..." : "Send 🎙️"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voice Notes List */}
      <div className="space-y-4">
        {voiceNotes.length === 0 && (
          <div className="text-center py-20 text-gray-400 font-bold italic">
            Koi voice note nahi hai abhi. Pehla record karo! 🎙️
          </div>
        )}
        {voiceNotes.map((vn) => {
          const isMine = vn.senderId === userId || vn.senderId?._id === userId;
          return (
            <div key={vn._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-5 rounded-[2rem] shadow-sm border space-y-3 ${isMine ? 'bg-rose-500 text-white border-rose-400' : 'bg-white border-gray-100'}`}>

                {/* Sender name + unheard dot */}
                <div className="flex items-center gap-2">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isMine ? 'text-rose-100' : 'text-rose-400'}`}>
                    {isMine ? 'You' : vn.senderName}
                  </p>
                  {!isMine && !vn.isHeard && (
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  )}
                </div>

                {/* Play button + waveform */}
                <button
                  onClick={() => handlePlay(vn._id, vn.audioUrl)}
                  className={`flex items-center gap-3 w-full p-3 rounded-2xl transition-all ${isMine ? 'bg-rose-400/50 hover:bg-rose-400' : 'bg-rose-50 hover:bg-rose-100'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-rose-500'}`}>
                    {playingId === vn._id
                      ? <Pause size={18} className={isMine ? 'text-white' : 'text-white'} />
                      : <Play size={18} className={isMine ? 'text-white' : 'text-white'} />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1 items-center h-8">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-full w-1 ${isMine ? 'bg-white/60' : 'bg-rose-300'}`}
                          style={{ height: `${Math.random() * 24 + 8}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${isMine ? 'text-rose-100' : 'text-gray-400'}`}>
                    {formatTime(vn.duration || 0)}
                  </span>
                </button>

                {/* Reactions */}
                {!isMine && (
                  <div className="flex gap-2">
                    {['❤️', '😍', '😢', '😂', '🔥'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(vn._id, emoji)}
                        className={`text-lg p-1.5 rounded-xl transition-all hover:scale-125 ${vn.reaction === emoji ? 'bg-rose-100 scale-125' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Show reaction if exists */}
                {vn.reaction && isMine && (
                  <p className="text-right text-lg">{vn.reaction}</p>
                )}

                <p className={`text-[9px] font-bold ${isMine ? 'text-rose-200 text-right' : 'text-gray-400'}`}>
                  {new Date(vn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VoiceNotes;
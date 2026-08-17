import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { User, Mail, Sparkles, ArrowRight, Heart } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isMobile, setIsMobile] = useState(Capacitor.isNativePlatform());

  // Agar already logged in hai toh dashboard pe bhejo
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/dashboard');
  }, [navigate]);

  const handleGoogleSuccess = async (credentialResponse) => {
    const loadId = toast.loading('Signing in...');
    try {
      const token = credentialResponse?.credential;
      if (!token) throw new Error('Google credential not received');

      // Decode JWT token to get user info
      const decoded = JSON.parse(atob(token.split('.')[1]));

      const apiUrl = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';
      const backendUrl = apiUrl.startsWith('http://localhost') ? 'https://love-verse-backend.onrender.com' : apiUrl;

      const res = await axios.post(
        `${backendUrl}/api/auth/google-login`,
        { 
          name: decoded.name, 
          email: decoded.email, 
          picture: decoded.picture 
        }
      );

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      toast.success(`Welcome, ${res.data.name}! ✨`, { id: loadId });
      navigate('/dashboard');
    } catch (error) {
      console.error('Login Error:', error);
      toast.error('Google Login Failed! 😢', { id: loadId });
    }
  };

  const handleDirectLogin = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      toast.error("Please enter both Name and Email!");
      return;
    }

    const loadId = toast.loading('Connecting to Love-Verse... (Waking up server 🚀)');
    try {
      const backendUrl = 'https://love-verse-backend.onrender.com';

      const res = await axios.post(
        `${backendUrl}/api/auth/google-login`,
        { 
          name: name.trim(), 
          email: email.trim().toLowerCase(), 
          picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}` 
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000
        }
      );

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      toast.success(`Welcome back, ${res.data.name}! ✨`, { id: loadId });
      navigate('/dashboard');
    } catch (error) {
      console.error('Direct Login Error:', error);
      const errMsg = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'Server waking up, tap button again!' : error.message);
      toast.error(`Login issue: ${errMsg}`, { id: loadId, duration: 6000 });
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Animated background orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-rose-600/20 blur-[120px] top-[-100px] left-[-100px] animate-pulse" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-pink-500/15 blur-[100px] bottom-[-80px] right-[-80px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-red-500/10 blur-[80px] top-[40%] left-[40%] animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Floating hearts background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {['❤️', '💖', '💗', '💓', '💞'].map((h, i) => (
          <span
            key={i}
            className="absolute text-2xl opacity-10 animate-bounce"
            style={{
              left: `${10 + i * 20}%`,
              top: `${15 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + i * 0.4}s`
            }}
          >{h}</span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_0_80px_rgba(244,63,94,0.15)]">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/40 rotate-12 hover:rotate-0 transition-all duration-500 cursor-pointer">
                <span className="text-4xl">❤️</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-[#0d0d0d] animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Love-Verse</h1>
            <p className="text-white/40 text-sm mt-2 font-medium italic tracking-wide">"Where hearts meet digitally"</p>
          </div>

          {/* Direct Mobile & Web Form */}
          <form onSubmit={handleDirectLogin} className="space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300 ml-1 flex items-center gap-1.5">
                <User size={14} className="text-rose-400" /> Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-2xl text-white placeholder-gray-500 text-sm font-semibold focus:outline-none focus:border-rose-500 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300 ml-1 flex items-center gap-1.5">
                <Mail size={14} className="text-rose-400" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-2xl text-white placeholder-gray-500 text-sm font-semibold focus:outline-none focus:border-rose-500 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Enter Love-Verse</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">or Google Auth</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google Login Button */}
          <div className="flex justify-center mb-6 min-h-[44px]">
            <div className="transform scale-105">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google Login Failed! 😢")}
                useOneTap
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/40 text-xs font-semibold">Instant Secure Access • 100% In-App</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 mb-6" />

          {/* Register link */}
          <p className="text-center text-white/40 text-sm">
            Naye ho?{' '}
            <Link
              to="/register"
              className="text-rose-400 font-bold hover:text-rose-300 transition-colors underline underline-offset-4"
            >
              Account banao
            </Link>
          </p>
        </div>

        {/* Bottom text */}
        <p className="text-center text-white/20 text-xs mt-6 font-medium flex items-center justify-center gap-1">
          Made with <Heart size={12} className="text-rose-500 fill-rose-500 inline" /> for couples
        </p>
      </div>
    </div>
  );
};

export default Login;
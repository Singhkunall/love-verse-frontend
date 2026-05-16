import React, { useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/dashboard');
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const user = params.get('user');
      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', user);
        navigate('/dashboard');
      }
    }
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    const loadId = toast.loading('Signing in...');
    try {
      const token = credentialResponse?.credential;
      if (!token) throw new Error('Google credential not received');
      const res = await axios.post(
        'https://love-verse-backend.onrender.com/api/auth/google-login',
        { token }
      );
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      toast.success(`Welcome, ${res.data.name}! ✨`, { id: loadId });
      navigate('/dashboard');
    } catch (error) {
      console.error('Web Login Error:', error);
      toast.error('Google Login Failed! 😢', { id: loadId });
    }
  };

  const handleMobileGoogleLogin = () => {
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=36124091072-k7t809qm7ttdvjf0c306qmblbvlqo622.apps.googleusercontent.com' +
      '&redirect_uri=https://love-verse-backend.onrender.com/api/auth/google-callback' +
      '&response_type=code' +
      '&scope=openid%20email%20profile' +
      '&prompt=select_account';
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] rounded-full bg-rose-600/20 blur-[120px] top-[-100px] left-[-100px] animate-pulse" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-pink-500/15 blur-[100px] bottom-[-80px] right-[-80px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-red-500/10 blur-[80px] top-[40%] left-[40%] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {['❤️', '💖', '💗', '💓', '💞'].map((h, i) => (
          <span key={i} className="absolute text-2xl opacity-10 animate-bounce"
            style={{ left: `${10 + i * 20}%`, top: `${15 + (i % 3) * 25}%`, animationDelay: `${i * 0.5}s`, animationDuration: `${2 + i * 0.4}s` }}
          >{h}</span>
        ))}
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_0_80px_rgba(244,63,94,0.15)]">
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/40 rotate-12 hover:rotate-0 transition-all duration-500 cursor-pointer">
                <span className="text-4xl">❤️</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-[#0d0d0d] animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Love-Verse</h1>
            <p className="text-white/40 text-sm mt-2 font-medium italic tracking-wide">"Where hearts meet digitally"</p>
          </div>
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Login with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="flex justify-center mb-8">
            {Capacitor.isNativePlatform() ? (
              <button onClick={handleMobileGoogleLogin}
                className="flex items-center gap-3 bg-white text-gray-800 font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all">
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
                Continue with Google
              </button>
            ) : (
              <div className="transform scale-110">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error("Google Login Failed! 😢")}
                  useOneTap theme="filled_black" shape="pill" size="large" text="continue_with" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/40 text-xs font-semibold">No password required • Secure Google Auth</span>
          </div>
          <div className="h-px bg-white/10 mb-6" />
          <p className="text-center text-white/40 text-sm">
            Naye ho?{' '}
            <Link to="/register" className="text-rose-400 font-bold hover:text-rose-300 transition-colors underline underline-offset-4">
              Account banao
            </Link>
          </p>
        </div>
        <p className="text-center text-white/20 text-xs mt-6 font-medium">Made with ❤️ for couples</p>
      </div>
    </div>
  );
};

export default Login;

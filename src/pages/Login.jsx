import React, { useState } from 'react';
import { Heart, Mail, Lock, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const loadId = toast.loading("Checking credentials... ❤️");
    try {
      const res = await axios.post('http://localhost:8000/api/auth/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      
      toast.success(`Welcome back! ✨`, { id: loadId });
      navigate('/dashboard'); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Login fail ho gaya!", { id: loadId });
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-rose-200 blur-[120px] rounded-full opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-200 blur-[120px] rounded-full opacity-50"></div>

      <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white w-full max-w-md relative z-10">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-rose-500 p-4 rounded-3xl shadow-lg shadow-rose-200 mb-4 transform rotate-12">
             <Heart className="text-white fill-white" size={32} />
          </div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tighter text-center">Love-Verse Login</h2>
          <p className="text-gray-400 text-sm mt-1 font-medium">Welcome back, lover!</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-500 transition-colors" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 outline-none transition-all" 
              required 
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-500 transition-colors" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 outline-none transition-all" 
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Login ❤️
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 font-medium">
          Naye ho? <Link to="/register" className="text-rose-500 font-bold hover:underline underline-offset-4">Register karo</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
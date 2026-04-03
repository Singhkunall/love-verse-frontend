import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();

  // Google Login Success Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    const loadId = toast.loading("Connecting to Love-Verse... ❤️");
    try {
      // Backend request
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/google-login`, {
        token: credentialResponse.credential
      });

      // Data store karna
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));

      toast.success(`Welcome back! ✨`, { id: loadId });
      navigate('/dashboard'); 
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(error.response?.data?.message || "Login fail ho gaya!", { id: loadId });
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-rose-200 blur-[120px] rounded-full opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-200 blur-[120px] rounded-full opacity-50"></div>

      <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white w-full max-w-md relative z-10">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-rose-500 p-4 rounded-3xl shadow-lg shadow-rose-200 mb-4 transform rotate-12 transition-transform hover:rotate-0 cursor-pointer">
             <Heart className="text-white fill-white" size={32} />
          </div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tighter text-center">Love-Verse</h2>
          <p className="text-gray-400 text-sm mt-1 font-medium italic">"Where hearts meet digitally"</p>
        </div>

        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-700">Welcome Back!</h3>
            <p className="text-gray-500 text-sm mt-2">Login karne ke liye niche diye gaye button ka use karein.</p>
          </div>

          {/* --- Google Login Button --- */}
          <div className="flex justify-center scale-125 transform transition-all hover:scale-110 py-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google Login Failed")}
              useOneTap
              theme="filled_blue"
              shape="pill"
            />
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <Sparkles size={16} />
                <span>No password required</span>
             </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 font-medium text-sm">
            Naye ho? <Link to="/register" className="text-rose-500 font-bold hover:underline underline-offset-4">Register/Sign up karein</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
import React from 'react';
import { Heart, Sparkles } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
  const navigate = useNavigate();

  // Google Success Handler (Same as Login)
  const handleGoogleSuccess = async (credentialResponse) => {
    const loadId = toast.loading("Creating your Love-Verse... ✨");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/google-login`, {
        token: credentialResponse.credential
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));

      toast.success(`Account created successfully! ❤️`, { id: loadId });
      
      // Naya user hai toh use partner connect karne ke liye bhej sakte ho
      navigate('/dashboard'); 
    } catch (error) {
      console.error(error);
      toast.error("Google Registration fail ho gaya!", { id: loadId });
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-rose-200 blur-[120px] rounded-full opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-200 blur-[120px] rounded-full opacity-50"></div>

      <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white w-full max-w-md relative z-10 text-center">
        
        {/* Logo & Welcome */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-rose-500 p-4 rounded-3xl shadow-lg shadow-rose-200 mb-4 animate-bounce">
             <Heart className="text-white fill-white" size={32} />
          </div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tighter">Join Love-Verse</h2>
          <p className="text-gray-500 mt-2 font-medium">Connect your hearts in one click! ✨</p>
        </div>

        <div className="space-y-6">
          <p className="text-sm text-gray-400">Humein aapka naam ya password yaad rakhne ki zaroorat nahi hai. Bas apne Google account se shuru karein.</p>
          
          {/* Google Button */}
          <div className="flex justify-center scale-110 transform transition-all hover:scale-105 py-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Registration Failed")}
              theme="filled_blue"
              shape="pill"
              text="signup_with" // Button par "Sign up with Google" dikhayega
            />
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-gray-500 font-medium">
            Pehle se account hai? <Link to="/login" className="text-rose-500 font-bold hover:underline underline-offset-4">Login karo</Link>
          </p>
        </div>

        {/* Benefits Info */}
        <div className="mt-8 flex justify-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1"><Sparkles size={12}/> Secure</span>
            <span className="flex items-center gap-1"><Sparkles size={12}/> Fast</span>
            <span className="flex items-center gap-1"><Sparkles size={12}/> Easy</span>
        </div>
      </div>
    </div>
  );
};

export default Register;
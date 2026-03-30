import React, { useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Heart, Lock, Mail, User, ArrowLeft, Sparkles } from 'lucide-react';
import Dashboard from './pages/Dashboard'; 

// Backend URL variable
const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const [isRegistering, setIsRegistering] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadId = toast.loading("Sending secret code... 💌");
    try {
      // ✅ Fixed: Localhost hataya
      await axios.post(`${API_URL}/api/auth/send-otp`, { email });
      toast.success("Code tumhare email par bhej diya! Check karo.", { id: loadId });
      setShowOtpScreen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP nahi bhej paye!", { id: loadId });
    } finally { setLoading(false); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = isRegistering ? 'register' : 'login';
    // Partner1 role default rakha hai, backend logic ke hisab se adjust kar sakte ho
    const payload = isRegistering ? { name, email, password, otp, role: 'partner1' } : { email, password };

    try {
      // ✅ Fixed: Localhost hataya
      const res = await axios.post(`${API_URL}/api/auth/${endpoint}`, payload);
      
      if (isRegistering) {
        toast.success("Account ban gaya! Ab login karo ❤️");
        setIsRegistering(false); 
        setShowOtpScreen(false);
      } else {
        // Backend se res.data.token aur res.data (user info) aana chahiye
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        setToken(res.data.token);
        setUser(res.data);
        toast.success(`Welcome to the Verse, ${res.data.name}! ✨`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Credentials galat hain!");
    } finally { setLoading(false); }
  };

  if (token) return <Dashboard user={user} token={token} />;

  return (
    <div className="min-h-screen bg-[#fff5f7] flex items-center justify-center p-4 font-sans selection:bg-rose-200 relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-rose-200 rounded-full blur-[150px] opacity-50 -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-200 rounded-full blur-[150px] opacity-50 -z-10"></div>

      <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-12 rounded-[3.5rem] shadow-[0_20px_60px_rgba(251,113,133,0.15)] w-full max-w-md border border-white relative z-10 transition-all">
        
        {showOtpScreen && (
          <button onClick={() => setShowOtpScreen(false)} className="absolute left-8 top-12 text-gray-400 hover:text-rose-500 transition-all">
            <ArrowLeft size={24} />
          </button>
        )}

        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-rose-500 to-pink-400 rounded-3xl rotate-12 flex items-center justify-center shadow-lg shadow-rose-200 mb-6 group hover:rotate-0 transition-all duration-500">
             <Heart className="text-white -rotate-12 group-hover:rotate-0 transition-all" fill="currentColor" size={38} />
          </div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tighter">
            {showOtpScreen ? "Verify" : (isRegistering ? "Join Verse" : "Love-Verse")}
          </h2>
          <p className="text-gray-400 mt-2 font-medium italic">
            {isRegistering ? "Start your beautiful journey" : "Connect with your favorite person"}
          </p>
        </div>

        <form onSubmit={showOtpScreen || !isRegistering ? handleAuth : handleSendOtp} className="space-y-5">
          {!showOtpScreen && isRegistering && (
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-400 transition-colors" size={20} />
              <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/50 rounded-2xl border border-gray-100 focus:border-rose-300 focus:ring-4 focus:ring-rose-50 outline-none transition-all shadow-sm" required />
            </div>
          )}
          
          {!showOtpScreen && (
            <>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-400 transition-colors" size={20} />
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/50 rounded-2xl border border-gray-100 focus:border-rose-300 focus:ring-4 focus:ring-rose-50 outline-none transition-all shadow-sm" required />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rose-400 transition-colors" size={20} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white/50 rounded-2xl border border-gray-100 focus:border-rose-300 focus:ring-4 focus:ring-rose-50 outline-none transition-all shadow-sm" required />
              </div>
            </>
          )}

          {showOtpScreen && (
            <div className="space-y-4">
               <input type="text" placeholder="0 0 0 0 0 0" value={otp} maxLength={6} onChange={(e) => setOtp(e.target.value)} className="w-full py-5 bg-white rounded-[2rem] border-2 border-rose-100 focus:border-rose-400 outline-none transition-all text-center text-3xl font-black tracking-[10px] text-rose-600 shadow-inner" required />
               <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Enter the secret code</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-rose-200 hover:shadow-rose-300 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>{showOtpScreen ? "Confirm & Enter" : (isRegistering ? "Send OTP" : "Sign In")} <Sparkles size={18} /></>
            )}
          </button>
        </form>

        {!showOtpScreen && (
          <div className="mt-10 text-center">
            <button onClick={() => {setIsRegistering(!isRegistering); setShowOtpScreen(false);}} className="text-gray-500 font-bold text-sm hover:text-rose-500 transition-colors underline underline-offset-8 decoration-rose-200">
              {isRegistering ? "Already have a partner? Login" : "New here? Create your space"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
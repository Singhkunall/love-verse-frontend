// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import toast from 'react-hot-toast';
// import { useNavigate, Link } from 'react-router-dom';

// const API_URL = import.meta.env.VITE_API_URL;

// const Register = () => {
//   const navigate = useNavigate();
//   const [step, setStep] = useState(1); // Step 1: Form, Step 2: OTP
//   const [loading, setLoading] = useState(false);
//   const [form, setForm] = useState({ name: '', email: '', password: '' });
//   const [otp, setOtp] = useState('');
//   const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (token) navigate('/dashboard');
//   }, []);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   // OTP digit-by-digit input
//   const handleOtpChange = (index, value) => {
//     if (!/^\d*$/.test(value)) return; // sirf numbers
//     const newDigits = [...otpDigits];
//     newDigits[index] = value;
//     setOtpDigits(newDigits);
//     setOtp(newDigits.join(''));

//     // Auto focus next input
//     if (value && index < 5) {
//       document.getElementById(`otp-${index + 1}`)?.focus();
//     }
//   };

//   const handleOtpKeyDown = (index, e) => {
//     if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
//       document.getElementById(`otp-${index - 1}`)?.focus();
//     }
//   };

//   // Step 1: Send OTP
//   const handleSendOtp = async (e) => {
//     e.preventDefault();
//     if (!form.name || !form.email || !form.password) {
//       return toast.error("Saare fields bharo! 🙏");
//     }
//     if (form.password.length < 6) {
//       return toast.error("Password kam se kam 6 characters ka hona chahiye!");
//     }
//     setLoading(true);
//     const loadId = toast.loading("OTP bhej rahe hain... 💌");
//     try {
//       await axios.post(`${API_URL}/api/auth/send-otp`, { email: form.email });
//       toast.success("OTP bhej diya! Email check karo ✉️", { id: loadId });
//       setStep(2);
//     } catch (error) {
//       toast.error(error.response?.data?.message || "OTP nahi bhej paye!", { id: loadId });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Step 2: Verify OTP & Register
//   const handleRegister = async (e) => {
//     e.preventDefault();
//     if (otp.length < 6) return toast.error("6 digit OTP daalo!");
//     setLoading(true);
//     const loadId = toast.loading("Account ban raha hai... ⏳");
//     try {
//       await axios.post(`${API_URL}/api/auth/register`, {
//         name: form.name,
//         email: form.email,
//         password: form.password,
//         otp,
//         role: 'partner1'
//       });
//       toast.success("Account ban gaya! Ab Google se login karo ❤️", { id: loadId });
//       navigate('/');
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Registration fail ho gayi!", { id: loadId });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4 relative overflow-hidden">

//       {/* Background orbs */}
//       <div className="absolute w-[500px] h-[500px] rounded-full bg-pink-600/20 blur-[120px] top-[-100px] right-[-100px] animate-pulse" />
//       <div className="absolute w-[400px] h-[400px] rounded-full bg-rose-500/15 blur-[100px] bottom-[-80px] left-[-80px] animate-pulse" style={{ animationDelay: '1s' }} />

//       <div className="relative z-10 w-full max-w-md">

//         {/* Progress indicator */}
//         <div className="flex items-center justify-center gap-3 mb-8">
//           <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${step === 1 ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/40'}`}>
//             <span>1</span>
//             <span>Details</span>
//           </div>
//           <div className={`h-px w-8 transition-all ${step === 2 ? 'bg-rose-500' : 'bg-white/10'}`} />
//           <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${step === 2 ? 'bg-rose-500 text-white' : 'bg-white/10 text-white/40'}`}>
//             <span>2</span>
//             <span>Verify</span>
//           </div>
//         </div>

//         {/* Card */}
//         <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_0_80px_rgba(244,63,94,0.15)]">

//           {/* Header */}
//           <div className="flex flex-col items-center mb-10">
//             <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-500/40 rotate-12 hover:rotate-0 transition-all duration-500 mb-6">
//               <span className="text-4xl">{step === 1 ? '💝' : '🔐'}</span>
//             </div>
//             <h1 className="text-4xl font-black text-white tracking-tighter">
//               {step === 1 ? 'Join Verse' : 'Verify Email'}
//             </h1>
//             <p className="text-white/40 text-sm mt-2 italic">
//               {step === 1 ? 'Start your beautiful journey' : `OTP bheja gaya: ${form.email}`}
//             </p>
//           </div>

//           {/* Step 1 — Registration Form */}
//           {step === 1 && (
//             <form onSubmit={handleSendOtp} className="space-y-4">
//               {/* Name */}
//               <div className="relative">
//                 <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
//                 <input
//                   type="text"
//                   name="name"
//                   placeholder="Apna naam daalo"
//                   value={form.name}
//                   onChange={handleChange}
//                   required
//                   className="w-full bg-white/8 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all text-sm font-medium"
//                   style={{ background: 'rgba(255,255,255,0.05)' }}
//                 />
//               </div>

//               {/* Email */}
//               <div className="relative">
//                 <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
//                 <input
//                   type="email"
//                   name="email"
//                   placeholder="tumhara@email.com"
//                   value={form.email}
//                   onChange={handleChange}
//                   required
//                   className="w-full border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all text-sm font-medium"
//                   style={{ background: 'rgba(255,255,255,0.05)' }}
//                 />
//               </div>

//               {/* Password */}
//               <div className="relative">
//                 <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1 mb-1 block">Password</label>
//                 <input
//                   type="password"
//                   name="password"
//                   placeholder="Strong password daalo"
//                   value={form.password}
//                   onChange={handleChange}
//                   required
//                   className="w-full border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all text-sm font-medium"
//                   style={{ background: 'rgba(255,255,255,0.05)' }}
//                 />
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full mt-2 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-base shadow-xl shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
//               >
//                 {loading ? (
//                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                 ) : (
//                   <>Send OTP ✉️</>
//                 )}
//               </button>
//             </form>
//           )}

//           {/* Step 2 — OTP Verification */}
//           {step === 2 && (
//             <form onSubmit={handleRegister} className="space-y-6">
//               <div>
//                 <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block text-center mb-4">6-Digit OTP</label>
//                 <div className="flex justify-center gap-3">
//                   {otpDigits.map((digit, index) => (
//                     <input
//                       key={index}
//                       id={`otp-${index}`}
//                       type="text"
//                       maxLength={1}
//                       value={digit}
//                       onChange={(e) => handleOtpChange(index, e.target.value)}
//                       onKeyDown={(e) => handleOtpKeyDown(index, e)}
//                       className="w-12 h-14 text-center text-2xl font-black text-white border-2 rounded-2xl outline-none transition-all"
//                       style={{
//                         background: 'rgba(255,255,255,0.05)',
//                         borderColor: digit ? 'rgb(244,63,94)' : 'rgba(255,255,255,0.1)',
//                         boxShadow: digit ? '0 0 20px rgba(244,63,94,0.3)' : 'none'
//                       }}
//                     />
//                   ))}
//                 </div>
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading || otp.length < 6}
//                 className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-base shadow-xl shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
//               >
//                 {loading ? (
//                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                 ) : (
//                   <>Verify & Create Account 🚀</>
//                 )}
//               </button>

//               {/* Resend OTP */}
//               <button
//                 type="button"
//                 onClick={() => { setStep(1); setOtpDigits(['','','','','','']); setOtp(''); }}
//                 className="w-full text-white/30 text-sm font-bold hover:text-white/60 transition-colors"
//               >
//                 ← Wapas jao / OTP resend karo
//               </button>
//             </form>
//           )}

//           {/* Divider */}
//           <div className="h-px bg-white/10 mt-8 mb-6" />

//           {/* Login link */}
//           <p className="text-center text-white/40 text-sm">
//             Pehle se account hai?{' '}
//             <Link
//               to="/"
//               className="text-rose-400 font-bold hover:text-rose-300 transition-colors underline underline-offset-4"
//             >
//               Login karo
//             </Link>
//           </p>
//         </div>

//         <p className="text-center text-white/20 text-xs mt-6 font-medium">
//           Made with ❤️ for couples
//         </p>
//       </div>
//     </div>
//   );
// };

// export default Register;

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/');
  }, []);

  return null;
};

export default Register;
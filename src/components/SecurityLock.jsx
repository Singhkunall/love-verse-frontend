import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Shield, KeyRound, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

function SecurityLock({ isOpen, onClose, onUnlock }) {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState(localStorage.getItem('user_pin') || '');
  const [isSettingMode, setIsSettingMode] = useState(!savedPin);

  useEffect(() => {
    setSavedPin(localStorage.getItem('user_pin') || '');
    setIsSettingMode(!localStorage.getItem('user_pin'));
    setPin('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === 4) {
        setTimeout(() => {
          if (isSettingMode) {
            localStorage.setItem('user_pin', newPin);
            setSavedPin(newPin);
            toast.success("Security PIN Saved! 🔐");
            onUnlock();
          } else {
            if (newPin === savedPin) {
              toast.success("Sanctuary Unlocked! 💖");
              onUnlock();
            } else {
              toast.error("Incorrect PIN!");
              setPin('');
            }
          }
        }, 150);
      }
    }
  };

  const handleClear = () => setPin('');

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white/95 backdrop-blur-2xl border border-rose-100 rounded-[2.5rem] p-6 md:p-8 max-w-xs w-full text-center space-y-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100">
          <X size={16} />
        </button>

        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-rose-100">
          <Lock size={32} />
        </div>

        <div>
          <h3 className="text-xl font-black text-gray-800">
            {isSettingMode ? 'Set 4-Digit Security PIN 🔐' : 'Enter Security PIN'}
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-1">
            {isSettingMode ? 'Protect intimate chats, photos & memories' : 'Private Couple Sanctuary'}
          </p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 border ${
                pin.length > idx ? 'bg-rose-500 border-rose-600 scale-110 shadow-md' : 'bg-gray-100 border-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[220px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-14 h-14 rounded-2xl bg-rose-50/60 hover:bg-rose-100/80 active:scale-95 text-gray-800 font-black text-lg shadow-sm border border-rose-100/70 transition-all flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 hover:text-gray-600 font-bold text-xs active:scale-95 flex items-center justify-center mx-auto"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-14 h-14 rounded-2xl bg-rose-50/60 hover:bg-rose-100/80 active:scale-95 text-gray-800 font-black text-lg shadow-sm border border-rose-100/70 transition-all flex items-center justify-center mx-auto"
          >
            0
          </button>
          <div className="w-14 h-14" />
        </div>

        <p className="text-[10px] text-gray-400 font-bold flex items-center justify-center gap-1 pt-2 border-t border-rose-100/60">
          <Shield size={12} className="text-emerald-500" /> End-to-End Encrypted Access
        </p>
      </div>
    </div>
  );
}

export default SecurityLock;

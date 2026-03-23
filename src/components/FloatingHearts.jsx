// components/FloatingHearts.jsx
import React, { useEffect, useState } from 'react';

const FloatingHearts = () => {
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    const newHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + 'vw',
      delay: Math.random() * 3 + 's',
      duration: Math.random() * 3 + 2 + 's'
    }));
    setHearts(newHearts);
    const timer = setTimeout(() => setHearts([]), 6000); // 6 sec baad khatam
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {hearts.map(h => (
        <span key={h.id} className="absolute bottom-[-10%] text-rose-500 animate-float-up opacity-0"
          style={{ left: h.left, animationDelay: h.delay, animationDuration: h.duration }}>
          ❤️
        </span>
      ))}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-120vh) scale(1.5); opacity: 0; }
        }
        .animate-float-up { animation-name: float-up; animation-timing-function: ease-in; }
      `}</style>
    </div>
  );
};

export default FloatingHearts;
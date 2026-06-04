import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { ArrowLeft, RotateCcw, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
import toast from 'react-hot-toast';

// Board path - 52 squares
const PATH = [
  // Bottom row left to right
  {x:6,y:13},{x:6,y:12},{x:6,y:11},{x:6,y:10},{x:6,y:9},{x:6,y:8},
  // Left column bottom to top  
  {x:5,y:8},{x:4,y:8},{x:3,y:8},{x:2,y:8},{x:1,y:8},{x:0,y:8},
  // Top-left corner
  {x:0,y:7},{x:0,y:6},
  // Top row
  {x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6},
  // Up
  {x:6,y:5},{x:6,y:4},{x:6,y:3},{x:6,y:2},{x:6,y:1},{x:6,y:0},
  // Top right
  {x:7,y:0},{x:8,y:0},
  // Right column
  {x:8,y:1},{x:8,y:2},{x:8,y:3},{x:8,y:4},{x:8,y:5},
  // Right side
  {x:9,y:6},{x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},
  // Corner
  {x:14,y:7},{x:14,y:8},
  // Bottom right
  {x:13,y:8},{x:12,y:8},{x:11,y:8},{x:10,y:8},{x:9,y:8},
  // Down
  {x:8,y:9},{x:8,y:10},{x:8,y:11},{x:8,y:12},{x:8,y:13},{x:8,y:14},
  // Bottom
  {x:7,y:14},{x:6,y:14},
];

const HOME_POSITIONS = {
  red:   [{x:2,y:2},{x:3,y:2},{x:2,y:3},{x:3,y:3}],
  blue:  [{x:11,y:2},{x:12,y:2},{x:11,y:3},{x:12,y:3}],
};

const START_INDEX = { red: 0, blue: 26 };
const HOME_STRETCH = {
  red:  [{x:7,y:13},{x:7,y:12},{x:7,y:11},{x:7,y:10},{x:7,y:9},{x:7,y:8}],
  blue: [{x:7,y:1},{x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6}],
};

const CELL_SIZE = 36;

const DiceIcon = ({ value, size = 24 }) => {
  const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Icon = icons[(value || 1) - 1];
  return <Icon size={size} />;
};

export default function Ludo({ user, roomId, socket, onBack }) {
  const userId = user._id || user.id;
  const partnerId = user.partnerId?._id?.toString() || user.partnerId?.toString() || "";
  const myColor = userId < partnerId ? 'red' : 'blue';
  const opponentColor = myColor === 'red' ? 'blue' : 'red';

  const initTokens = () => ({
    red:  [{ id:'r0', pos:-1, done:false }, { id:'r1', pos:-1, done:false }],
    blue: [{ id:'b0', pos:-1, done:false }, { id:'b1', pos:-1, done:false }],
  });

  const [tokens, setTokens]         = useState(initTokens);
  const [turn, setTurn]             = useState('red');
  const [dice, setDice]             = useState(null);
  const [rolled, setRolled]         = useState(false);
  const [winner, setWinner]         = useState(null);
  const [rolling, setRolling]       = useState(false);
  const [movable, setMovable]       = useState([]);

  // Socket sync
  useEffect(() => {
    socket.emit('join_ludo', { roomId });

    socket.on('ludo_state', ({ tokens: t, turn: tr, dice: d }) => {
      setTokens(t); setTurn(tr); setDice(d); setRolled(!!d);
    });

    socket.on('ludo_rolled', ({ color, value, movable: mv }) => {
      setDice(value); setRolled(true);
      if (color === myColor) setMovable(mv);
    });

    socket.on('ludo_moved', ({ tokens: t, turn: tr }) => {
      setTokens(t); setTurn(tr); setDice(null); setRolled(false); setMovable([]);
    });

    socket.on('ludo_winner', ({ color }) => setWinner(color));

    socket.on('ludo_reset', () => {
      setTokens(initTokens()); setTurn('red'); setDice(null);
      setRolled(false); setWinner(null); setMovable([]);
    });

    return () => {
      socket.off('ludo_state');
      socket.off('ludo_rolled');
      socket.off('ludo_moved');
      socket.off('ludo_winner');
      socket.off('ludo_reset');
    };
  }, [roomId, myColor]);

  const rollDice = () => {
    if (turn !== myColor || rolled || rolling) return;
    setRolling(true);
    setTimeout(() => {
      const value = Math.floor(Math.random() * 6) + 1;
      const mv = getMovableTokens(tokens, myColor, value);
      setDice(value); setRolled(true); setMovable(mv); setRolling(false);
      socket.emit('ludo_roll', { roomId, color: myColor, value, movable: mv });
      if (mv.length === 0) {
        setTimeout(() => {
          const nextTurn = myColor === 'red' ? 'blue' : 'red';
          setTurn(nextTurn); setDice(null); setRolled(false);
          socket.emit('ludo_move', { roomId, tokens, turn: nextTurn });
        }, 1200);
      }
    }, 600);
  };

  const getMovableTokens = (toks, color, val) => {
    return toks[color]
      .filter(t => !t.done)
      .filter(t => {
        if (t.pos === -1) return val === 6;
        const newPos = t.pos + val;
        return newPos <= 57;
      })
      .map(t => t.id);
  };

  const moveToken = (tokenId) => {
    if (!movable.includes(tokenId)) return;
    const color = myColor;
    const val = dice;
    const newTokens = JSON.parse(JSON.stringify(tokens));
    const token = newTokens[color].find(t => t.id === tokenId);

    if (token.pos === -1) {
      token.pos = 0;
    } else {
      token.pos += val;
      if (token.pos >= 57) { token.pos = 57; token.done = true; }
    }

    // Check cut
    if (token.pos >= 0 && token.pos < 52) {
      const myCell = PATH[token.pos];
      const oppColor = color === 'red' ? 'blue' : 'red';
      newTokens[oppColor].forEach(ot => {
        if (!ot.done && ot.pos >= 0 && ot.pos < 52) {
          const oppCell = PATH[(ot.pos + START_INDEX[oppColor]) % 52];
          const myAbsCell = PATH[(token.pos + START_INDEX[color]) % 52];
          if (myAbsCell.x === oppCell.x && myAbsCell.y === oppCell.y) {
            ot.pos = -1;
            toast.success(`Cut! 🎉`);
          }
        }
      });
    }

    const won = newTokens[color].every(t => t.done);
    const nextTurn = (val === 6 && !won) ? color : (color === 'red' ? 'blue' : 'red');

    setTokens(newTokens); setTurn(nextTurn);
    setDice(null); setRolled(false); setMovable([]);

    socket.emit('ludo_move', { roomId, tokens: newTokens, turn: nextTurn });

    if (won) {
      setWinner(color);
      socket.emit('ludo_winner', { roomId, color });
    }
  };

  const getTokenScreenPos = (color, token) => {
    if (token.pos === -1) {
      const idx = tokens[color].indexOf(token);
      const hp = HOME_POSITIONS[color][idx];
      return { x: hp.x * CELL_SIZE + 4, y: hp.y * CELL_SIZE + 4 };
    }
    if (token.pos >= 52) {
      const si = token.pos - 52;
      const hs = HOME_STRETCH[color][Math.min(si, 5)];
      return { x: hs.x * CELL_SIZE + 4, y: hs.y * CELL_SIZE + 4 };
    }
    const absIdx = (token.pos + START_INDEX[color]) % 52;
    const cell = PATH[absIdx];
    return { x: cell.x * CELL_SIZE + 4, y: cell.y * CELL_SIZE + 4 };
  };

  const resetGame = () => {
    socket.emit('ludo_reset', { roomId });
  };

  const boardSize = 15 * CELL_SIZE;

  const colorMap = {
    red:  { bg: 'bg-rose-500',  text: 'text-rose-500',  fill: '#f43f5e', light: '#fff1f2' },
    blue: { bg: 'bg-blue-500',  text: 'text-blue-500',  fill: '#3b82f6', light: '#eff6ff' },
  };

  return (
    <div className="flex flex-col items-center gap-6 pb-20 px-4 animate-in fade-in duration-500">
      {winner && <Confetti recycle={false} numberOfPieces={300} />}

      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-rose-500 transition-colors font-bold">
          <ArrowLeft size={20} /> Back
        </button>
        <h2 className="text-2xl font-black text-gray-800 italic">🎲 Love Ludo</h2>
        <button onClick={resetGame} className="flex items-center gap-2 text-gray-400 hover:text-rose-500 transition-colors font-bold">
          <RotateCcw size={18} /> Reset
        </button>
      </div>

      {/* Turn indicator */}
      <div className={`px-6 py-2 rounded-full font-black text-sm ${turn === myColor ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {turn === myColor ? '🎲 Your Turn!' : `⏳ Partner's Turn...`}
      </div>

      {/* Board */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl overflow-hidden border-4 border-white" style={{ width: boardSize, height: boardSize }}>
        <svg width={boardSize} height={boardSize} className="absolute inset-0">
          {/* Grid lines */}
          {Array.from({length:15}).map((_,i) => (
            <g key={i}>
              <line x1={i*CELL_SIZE} y1={0} x2={i*CELL_SIZE} y2={boardSize} stroke="#e5e7eb" strokeWidth="0.5"/>
              <line x1={0} y1={i*CELL_SIZE} x2={boardSize} y2={i*CELL_SIZE} stroke="#e5e7eb" strokeWidth="0.5"/>
            </g>
          ))}

          {/* Home zones */}
          <rect x={0} y={0} width={6*CELL_SIZE} height={6*CELL_SIZE} fill={colorMap.red.light} rx="8"/>
          <rect x={9*CELL_SIZE} y={0} width={6*CELL_SIZE} height={6*CELL_SIZE} fill={colorMap.blue.light} rx="8"/>
          <rect x={0} y={9*CELL_SIZE} width={6*CELL_SIZE} height={6*CELL_SIZE} fill="#f0fdf4" rx="8"/>
          <rect x={9*CELL_SIZE} y={9*CELL_SIZE} width={6*CELL_SIZE} height={6*CELL_SIZE} fill="#fefce8" rx="8"/>

          {/* Center home */}
          <polygon points={`${7*CELL_SIZE},${7*CELL_SIZE} ${8*CELL_SIZE},${7*CELL_SIZE} ${7.5*CELL_SIZE},${7.5*CELL_SIZE}`} fill={colorMap.red.fill} opacity="0.3"/>
          <polygon points={`${7*CELL_SIZE},${8*CELL_SIZE} ${8*CELL_SIZE},${8*CELL_SIZE} ${7.5*CELL_SIZE},${7.5*CELL_SIZE}`} fill={colorMap.blue.fill} opacity="0.3"/>

          {/* Home stretch colors */}
          {HOME_STRETCH.red.map((c,i) => (
            <rect key={i} x={c.x*CELL_SIZE+1} y={c.y*CELL_SIZE+1} width={CELL_SIZE-2} height={CELL_SIZE-2} fill={colorMap.red.fill} opacity="0.2" rx="2"/>
          ))}
          {HOME_STRETCH.blue.map((c,i) => (
            <rect key={i} x={c.x*CELL_SIZE+1} y={c.y*CELL_SIZE+1} width={CELL_SIZE-2} height={CELL_SIZE-2} fill={colorMap.blue.fill} opacity="0.2" rx="2"/>
          ))}

          {/* Star safe squares */}
          {[8,13,21,26,34,39,47].map(idx => {
            const c = PATH[idx];
            return <text key={idx} x={c.x*CELL_SIZE+CELL_SIZE/2} y={c.y*CELL_SIZE+CELL_SIZE/2+5} textAnchor="middle" fontSize="14">⭐</text>;
          })}
        </svg>

        {/* Tokens */}
        {['red','blue'].map(color =>
          tokens[color].map(token => {
            const pos = getTokenScreenPos(color, token);
            const isMovable = movable.includes(token.id);
            return (
              <motion.div
                key={token.id}
                animate={{ x: pos.x, y: pos.y }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ position:'absolute', width: CELL_SIZE-8, height: CELL_SIZE-8 }}
                onClick={() => isMovable && moveToken(token.id)}
                className={`rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer
                  ${color === 'red' ? 'bg-rose-500' : 'bg-blue-500'}
                  ${isMovable ? 'ring-4 ring-yellow-400 ring-offset-1 scale-110 animate-bounce cursor-pointer' : ''}
                  ${token.done ? 'opacity-50' : ''}
                `}
              >
                <span className="text-white text-xs font-black">{token.id.slice(1)}</span>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Dice & Controls */}
      <div className="flex items-center gap-6">
        <motion.button
          onClick={rollDice}
          disabled={turn !== myColor || rolled || rolling}
          whileTap={{ scale: 0.9 }}
          animate={rolling ? { rotate: [0, 180, 360] } : {}}
          transition={{ duration: 0.6 }}
          className={`p-5 rounded-[1.5rem] font-black text-white shadow-xl transition-all
            ${turn === myColor && !rolled ? 'bg-rose-500 hover:bg-rose-600 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          {dice ? <DiceIcon value={dice} size={36} /> : <Dice1 size={36} />}
        </motion.button>

        {dice && (
          <div className="text-center">
            <p className="text-3xl font-black text-gray-800">{dice}</p>
            <p className="text-xs text-gray-400 font-bold">{turn === myColor ? 'Click a token!' : 'Partner moving...'}</p>
          </div>
        )}
      </div>

      {/* Winner Modal */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-white rounded-[3rem] p-10 text-center shadow-2xl max-w-sm mx-4">
              <div className="text-6xl mb-4">{winner === myColor ? '🏆' : '💔'}</div>
              <h3 className="text-3xl font-black text-gray-800 mb-2">
                {winner === myColor ? 'You Won! 🎉' : 'Partner Won! 💙'}
              </h3>
              <p className="text-gray-400 font-bold mb-6">
                {winner === myColor ? 'Shabash! Tum champion ho! ❤️' : 'Next time tumhari baari! 💪'}
              </p>
              <button
                onClick={resetGame}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black hover:bg-rose-600 transition-all"
              >
                Play Again! 🎲
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
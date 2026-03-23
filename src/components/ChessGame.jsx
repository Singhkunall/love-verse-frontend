import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import io from 'socket.io-client';
import { RotateCcw, ArrowLeft, Swords } from 'lucide-react';
import toast from 'react-hot-toast';

function ChessGame({ user, roomId, onBack, isWhite }) {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [promotionPiece, setPromotionPiece] = useState('q');
  const [showPromotion, setShowPromotion] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:8000');
    const socket = socketRef.current;
    socket.emit("join_chat", roomId);

    socket.on("receive_chess_move", (move) => {
      setGame((prevGame) => {
        const newGame = new Chess(prevGame.fen());
        try {
          newGame.move(move);
          if (newGame.isCheckmate()) toast.success("💀 CHECKMATE! Aap haar gaye!");
          else if (newGame.isStalemate()) toast("🤝 Stalemate! Draw!", { icon: "♟️" });
          else if (newGame.isDraw()) toast("🤝 Draw!", { icon: "🏳️" });
          else if (newGame.isCheck()) toast("⚠️ Aapko Check hai!", { icon: "👑" });
          return newGame;
        } catch (e) {
          return prevGame;
        }
      });
    });

    socket.on("restart_chess_game", () => {
      setGame(new Chess());
      setSelectedSquare(null);
      setHighlightedSquares({});
      toast.success("Game Restart ho gaya! ✨");
    });

    return () => {
      socket.emit("leave_chat", roomId);
      socket.off("receive_chess_move");
      socket.off("restart_chess_game");
      socket.disconnect();
    };
  }, [roomId]);

  // ✅ Highlight valid moves when a square is selected
  function getHighlightedSquares(square, currentGame) {
    const moves = currentGame.moves({ square, verbose: true });
    const highlights = {};
    // Highlight selected square
    highlights[square] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
    // Highlight valid destination squares
    moves.forEach((move) => {
      highlights[move.to] = {
        backgroundColor: currentGame.get(move.to)
          ? 'rgba(244, 63, 94, 0.5)' // capture square — red
          : 'rgba(0, 0, 0, 0.15)',    // empty valid square — grey dot
        borderRadius: currentGame.get(move.to) ? '0%' : '50%',
      };
    });
    return highlights;
  }

  function executeMove(sourceSquare, targetSquare, promotion = 'q') {
    const socket = socketRef.current;
    const userColor = isWhite ? 'w' : 'b';

    if (game.turn() !== userColor) return false;

    const moveData = { from: sourceSquare, to: targetSquare, promotion };

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move(moveData);
      if (move === null) return false;

      setGame(gameCopy);
      setSelectedSquare(null);
      setHighlightedSquares({});
      socket.emit("send_chess_move", { roomId, move: moveData });

      if (gameCopy.isCheckmate()) toast.success("🏆 CHECKMATE! Aap jeet gaye!");
      else if (gameCopy.isStalemate()) toast("🤝 Stalemate! Draw!", { icon: "♟️" });
      else if (gameCopy.isDraw()) toast("🤝 Draw!", { icon: "🏳️" });
      else if (gameCopy.isCheck()) toast("⚠️ Check!", { icon: "👑" });

      return true;
    } catch (e) {
      return false;
    }
  }

  // ✅ Check if move is a pawn promotion
  function isPawnPromotion(sourceSquare, targetSquare, currentGame) {
    const piece = currentGame.get(sourceSquare);
    if (!piece || piece.type !== 'p') return false;
    const targetRank = targetSquare[1];
    return (piece.color === 'w' && targetRank === '8') ||
           (piece.color === 'b' && targetRank === '1');
  }

  // ✅ Handle drag and drop
  function onDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare) return false;
    if (game.isGameOver()) return false;

    const userColor = isWhite ? 'w' : 'b';
    if (game.turn() !== userColor) return false;

    // Check if it's a promotion move
    if (isPawnPromotion(sourceSquare, targetSquare, game)) {
      setPendingMove({ sourceSquare, targetSquare });
      setShowPromotion(true);
      return false; // Don't execute yet, wait for promotion choice
    }

    return executeMove(sourceSquare, targetSquare);
  }

  // ✅ Click-to-move support
  function onSquareClick({ square, piece }) {
    if (game.isGameOver()) return;
    const userColor = isWhite ? 'w' : 'b';

    // If a square is already selected
    if (selectedSquare) {
      // Try to move to clicked square
      if (isPawnPromotion(selectedSquare, square, game)) {
        setPendingMove({ sourceSquare: selectedSquare, targetSquare: square });
        setShowPromotion(true);
        setSelectedSquare(null);
        setHighlightedSquares({});
        return;
      }

      const moved = executeMove(selectedSquare, square);
      if (!moved) {
        // If move failed, check if clicking own piece to reselect
        const clickedPiece = game.get(square);
        if (clickedPiece && clickedPiece.color === userColor) {
          setSelectedSquare(square);
          setHighlightedSquares(getHighlightedSquares(square, game));
        } else {
          setSelectedSquare(null);
          setHighlightedSquares({});
        }
      }
      return;
    }

    // No square selected yet — select if it's user's piece
    const clickedPiece = game.get(square);
    if (clickedPiece && clickedPiece.color === userColor && game.turn() === userColor) {
      setSelectedSquare(square);
      setHighlightedSquares(getHighlightedSquares(square, game));
    }
  }

  function handleReset() {
    socketRef.current?.emit("restart_chess_request", { roomId });
  }

  const isGameOver = game.isGameOver();
  const currentTurn = game.turn();

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-[3rem] shadow-2xl border border-rose-100 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all text-gray-500">
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center">
          <h3 className="text-xl font-black text-gray-800 italic flex items-center gap-2">
            <Swords className="text-rose-500" size={24} /> Chess Arena
          </h3>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase mt-1 ${
            isGameOver ? 'bg-purple-100 text-purple-600'
            : currentTurn === 'w' ? 'bg-orange-100 text-orange-600'
            : 'bg-gray-800 text-white'
          }`}>
            {isGameOver
              ? game.isCheckmate() ? '🏆 Game Over' : '🤝 Draw'
              : currentTurn === 'w' ? "White's Turn" : "Black's Turn"}
          </span>
        </div>

        <button onClick={handleReset} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:rotate-180 transition-all duration-500">
          <RotateCcw size={20} />
        </button>
      </div>

      {/* ✅ Promotion picker UI */}
      {showPromotion && (
        <div className="mb-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
          <p className="text-xs font-black text-rose-500 uppercase mb-3">Promote Pawn To:</p>
          <div className="flex justify-center gap-3">
            {['q', 'r', 'b', 'n'].map((p) => {
              const labels = { q: '♛ Queen', r: '♜ Rook', b: '♝ Bishop', n: '♞ Knight' };
              return (
                <button
                  key={p}
                  onClick={() => {
                    setShowPromotion(false);
                    if (pendingMove) {
                      executeMove(pendingMove.sourceSquare, pendingMove.targetSquare, p);
                      setPendingMove(null);
                    }
                  }}
                  className="px-3 py-2 bg-white rounded-xl text-sm font-bold shadow-sm border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full aspect-square shadow-2xl rounded-xl overflow-hidden border-8 border-gray-50">
        <Chessboard
          options={{
            position: game.fen(),
            boardOrientation: isWhite ? 'white' : 'black',
            darkSquareStyle: { backgroundColor: '#f43f5e' },
            lightSquareStyle: { backgroundColor: '#fff1f2' },
            onPieceDrop: onDrop,
            onSquareClick: onSquareClick,
            squareStyles: highlightedSquares,
            allowDragging: true,
          }}
        />
      </div>

      <div className="mt-6 flex justify-center gap-4">
        <div className="px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase text-center">Your Side</p>
          <p className="text-sm font-bold text-gray-700">
            {isWhite ? '⚪ White (First)' : '⚫ Black'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChessGame;
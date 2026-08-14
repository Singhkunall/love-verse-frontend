import React, { useState, useEffect } from 'react';
import { HelpCircle, Award, CheckCircle2, RefreshCw, ArrowLeft, Heart, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import toast from 'react-hot-toast';

const defaultQuizQuestions = [
  {
    id: 1,
    question: "Who usually takes longer to get ready before going out? 👗👔",
    options: ["Me, 100%!", "My Partner, definitely!", "Equal time for both", "Whoever woke up later"]
  },
  {
    id: 2,
    question: "Who falls asleep first during a late night movie? 😴",
    options: ["Me (I pass out in 5 mins)", "My Partner (always snoring)", "Both of us stay awake", "Depends on the movie"]
  },
  {
    id: 3,
    question: "What is our ideal weekend getaway style? 🏖️",
    options: ["Cozy mountain cabin", "Sunny beach resort", "Exploring a bustling new city", "Staying at home in bed"]
  },
  {
    id: 4,
    question: "Who is more likely to buy impulse gifts or snacks? 🎁",
    options: ["Me!", "My Partner!", "Both of us equally", "Neither, we budget strict"]
  },
  {
    id: 5,
    question: "Who initiates hugs and romantic nudges more often? 🤗",
    options: ["Me, I'm the hugger!", "My Partner, always needy!", "50-50 perfect balance", "Secretly a tie!"]
  }
];

function CoupleQuiz({ user, roomId, socket, onBack }) {
  const [currentRound, setCurrentRound] = useState(0);
  const [myAnswer, setMyAnswer] = useState(null);
  const [partnerAnswer, setPartnerAnswer] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [partnerScore, setPartnerScore] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showWinnerConfetti, setShowWinnerConfetti] = useState(false);

  const userId = user._id || user.id;
  const currentQ = defaultQuizQuestions[currentRound];

  useEffect(() => {
    if (!socket) return;

    socket.on("partner_quiz_answer", (data) => {
      setPartnerAnswer(data.optionIndex);
      toast.success("Partner has submitted their answer! 🤫");
    });

    socket.on("quiz_round_sync", (data) => {
      setIsRevealed(true);
      if (data.myScore !== undefined) setMyScore(data.myScore);
      if (data.partnerScore !== undefined) setPartnerScore(data.partnerScore);
    });

    socket.on("quiz_next_round_trigger", (data) => {
      setCurrentRound(data.nextRound);
      setMyAnswer(null);
      setPartnerAnswer(null);
      setIsRevealed(false);
    });

    socket.on("quiz_game_over_sync", () => {
      setGameOver(true);
      setShowWinnerConfetti(true);
    });

    socket.on("quiz_reset_trigger", () => {
      setCurrentRound(0);
      setMyAnswer(null);
      setPartnerAnswer(null);
      setMyScore(0);
      setPartnerScore(0);
      setIsRevealed(false);
      setGameOver(false);
      setShowWinnerConfetti(false);
    });

    return () => {
      socket.off("partner_quiz_answer");
      socket.off("quiz_round_sync");
      socket.off("quiz_next_round_trigger");
      socket.off("quiz_game_over_sync");
      socket.off("quiz_reset_trigger");
    };
  }, [socket]);

  const handleSelectOption = (idx) => {
    if (myAnswer !== null || isRevealed) return;
    setMyAnswer(idx);
    
    // Broadcast answer to partner
    if (socket) {
      socket.emit("send_quiz_answer", {
        roomId,
        userId,
        optionIndex: idx
      });
    }
  };

  const handleRevealAnswers = () => {
    if (myAnswer === null || partnerAnswer === null) {
      return toast.error("Wait for partner to pick their choice!");
    }

    let newMyScore = myScore;
    let newPartnerScore = partnerScore;

    if (myAnswer === partnerAnswer) {
      newMyScore += 20;
      newPartnerScore += 20;
      setMyScore(newMyScore);
      setPartnerScore(newPartnerScore);
      toast.success("Perfect Match! Both picked the same! 🎉");
    } else {
      toast("Different choices! Great minds think differently! 😄");
    }

    setIsRevealed(true);

    if (socket) {
      socket.emit("sync_quiz_round", {
        roomId,
        myScore: newMyScore,
        partnerScore: newPartnerScore
      });
    }
  };

  const handleNextRound = () => {
    if (currentRound + 1 >= defaultQuizQuestions.length) {
      setGameOver(true);
      setShowWinnerConfetti(true);
      if (socket) socket.emit("quiz_game_over", { roomId });
    } else {
      const nextR = currentRound + 1;
      setCurrentRound(nextR);
      setMyAnswer(null);
      setPartnerAnswer(null);
      setIsRevealed(false);
      if (socket) socket.emit("trigger_next_quiz_round", { roomId, nextRound: nextR });
    }
  };

  const handleRestartQuiz = () => {
    setCurrentRound(0);
    setMyAnswer(null);
    setPartnerAnswer(null);
    setMyScore(0);
    setPartnerScore(0);
    setIsRevealed(false);
    setGameOver(false);
    setShowWinnerConfetti(false);
    if (socket) socket.emit("trigger_quiz_reset", { roomId });
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-500 pb-16 px-4">
      {showWinnerConfetti && <Confetti recycle={false} numberOfPieces={300} />}

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-rose-500 font-black text-xs bg-white/70 px-4 py-2.5 rounded-full border border-gray-100 shadow-sm"
        >
          <ArrowLeft size={16} /> Back to Games
        </button>

        <div className="flex items-center gap-4">
          <div className="bg-rose-50 border border-rose-100 px-4 py-2 rounded-2xl text-center">
            <p className="text-[9px] font-black text-rose-400 uppercase">My Score</p>
            <p className="text-lg font-black text-rose-600">{myScore} pts</p>
          </div>
          <div className="bg-pink-50 border border-pink-100 px-4 py-2 rounded-2xl text-center">
            <p className="text-[9px] font-black text-pink-400 uppercase">Partner Score</p>
            <p className="text-lg font-black text-pink-600">{partnerScore} pts</p>
          </div>
        </div>
      </div>

      {!gameOver ? (
        <div className={`${glassStyle} p-8 space-y-8 relative overflow-hidden`}>
          {/* Progress Bar */}
          <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-widest">
            <span>Round {currentRound + 1} of {defaultQuizQuestions.length}</span>
            <span>Couple Quiz Battle ❓</span>
          </div>

          <div className="h-3 bg-rose-50 rounded-full border border-rose-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentRound + 1) / defaultQuizQuestions.length) * 100}%` }}
            ></div>
          </div>

          {/* Question Text */}
          <div className="text-center space-y-3 py-4">
            <span className="w-12 h-12 bg-rose-100 text-rose-500 rounded-2xl inline-flex items-center justify-center font-black text-xl mb-2 shadow-inner">
              ❓
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-gray-800 leading-snug">
              {currentQ.question}
            </h3>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQ.options.map((opt, idx) => {
              const isSelectedByMe = myAnswer === idx;
              const isSelectedByPartner = partnerAnswer === idx;

              let optionStyle = "bg-gray-50 border-gray-100 text-gray-700 hover:border-rose-300";

              if (isSelectedByMe && !isRevealed) {
                optionStyle = "bg-rose-50 border-rose-500 text-rose-600 shadow-md ring-2 ring-rose-200";
              }

              if (isRevealed) {
                if (isSelectedByMe && isSelectedByPartner) {
                  optionStyle = "bg-green-100 border-green-500 text-green-800 shadow-lg ring-2 ring-green-300 font-black";
                } else if (isSelectedByMe) {
                  optionStyle = "bg-rose-100 border-rose-400 text-rose-700 font-bold";
                } else if (isSelectedByPartner) {
                  optionStyle = "bg-purple-100 border-purple-400 text-purple-700 font-bold";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isRevealed}
                  className={`p-5 rounded-2xl border font-bold text-sm text-left transition-all relative flex justify-between items-center ${optionStyle}`}
                >
                  <span>{opt}</span>
                  {isRevealed && isSelectedByMe && isSelectedByPartner && (
                    <span className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-black">
                      MATCH! ✨
                    </span>
                  )}
                  {isRevealed && isSelectedByMe && !isSelectedByPartner && (
                    <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-black">
                      You
                    </span>
                  )}
                  {isRevealed && isSelectedByPartner && !isSelectedByMe && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-black">
                      Partner
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-500">
              {myAnswer === null ? (
                "Select your answer above!"
              ) : partnerAnswer === null ? (
                "Waiting for partner to answer..."
              ) : (
                "Both answered! Ready to reveal!"
              )}
            </div>

            {!isRevealed ? (
              <button
                onClick={handleRevealAnswers}
                disabled={myAnswer === null || partnerAnswer === null}
                className={`px-8 py-4 rounded-2xl font-black text-xs shadow-lg transition-all ${
                  myAnswer !== null && partnerAnswer !== null
                    ? 'bg-rose-500 text-white hover:bg-rose-600 hover:scale-[1.02]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Reveal Both Choices 🔒
              </button>
            ) : (
              <button
                onClick={handleNextRound}
                className="px-8 py-4 bg-gray-900 text-white hover:bg-black rounded-2xl font-black text-xs shadow-lg hover:scale-[1.02] transition-all"
              >
                Next Round →
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Game Over View */
        <div className={`${glassStyle} p-10 text-center space-y-6`}>
          <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">
            🏆
          </div>

          <h3 className="text-3xl font-black text-gray-800 italic">Quiz Complete!</h3>
          <p className="text-gray-500 font-bold text-sm">
            Total Compatibility Score: {myScore + partnerScore} pts!
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={handleRestartQuiz}
              className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-rose-600 flex items-center gap-2"
            >
              <RefreshCw size={16} /> Play Again
            </button>
            <button
              onClick={onBack}
              className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black"
            >
              Back to Arcade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoupleQuiz;

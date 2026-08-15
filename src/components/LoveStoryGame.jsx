import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Heart, Compass, ArrowLeft, RefreshCw, Trophy, Award, Gift, Star, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';

const STORY_CHAPTERS = [
  {
    id: 1,
    title: 'Chapter 1: The Unexpected Encounter ☕',
    subtitle: 'A rainy afternoon at a cozy corner café...',
    bgGradient: 'from-amber-950 via-rose-950 to-slate-950',
    storyText: "It was a pouring Sunday afternoon. You stepped into a dimly lit coffee shop, shaking raindrops off your umbrella. Looking around for a table, you noticed your partner sitting by the window, lost in a book. Your eyes met, and a warm smile lit up the room.",
    question: "How do you break the ice and start your first conversation?",
    choices: [
      {
        id: 'A',
        text: 'Offer to share your favorite warm cinnamon latte and sit together ☕',
        score: 25,
        outcomeText: "You shared a warm latte! The conversation flowed effortlessly as hours passed like seconds."
      },
      {
        id: 'B',
        text: 'Playfully comment on the book they are reading with a cute joke 📖',
        score: 30,
        outcomeText: "Your joke made them laugh out loud! A spark ignited right then and there."
      },
      {
        id: 'C',
        text: 'Gently ask if the empty seat across from them is taken 🙈',
        score: 20,
        outcomeText: "They happily invited you to sit down. A sweet blush appeared on both your cheeks."
      }
    ]
  },
  {
    id: 2,
    title: 'Chapter 2: Midnight Under the Stars ✨',
    subtitle: 'A hilltop view overlooking the glowing city lights...',
    bgGradient: 'from-indigo-950 via-purple-950 to-slate-950',
    storyText: "Months later, you both drove up to a scenic hilltop overlooking the twinkling city below. A soft summer breeze blew past as music played softly from the car radio. Millions of stars glittered above in the deep night sky.",
    question: "What unforgettable gesture do you make under the stars?",
    choices: [
      {
        id: 'A',
        text: 'Gently hold their hand and whisper how grateful you are for them 💖',
        score: 30,
        outcomeText: "Hand in hand, your fingers intertwined perfectly. They leaned in close to your shoulder."
      },
      {
        id: 'B',
        text: 'Point out a shooting star and make a secret wish together 🌠',
        score: 25,
        outcomeText: "Both of you closed your eyes and made a wish. A sweet smile spread across your faces."
      },
      {
        id: 'C',
        text: 'Pull them in for a romantic slow dance under the moonlight 💃🕺',
        score: 35,
        outcomeText: "Dancing under the moonlight, the world around you melted away completely."
      }
    ]
  },
  {
    id: 3,
    title: 'Chapter 3: The Rainy Day Secret 🌧️',
    subtitle: 'Trapped indoors during a sudden thunderstorm...',
    bgGradient: 'from-cyan-950 via-slate-950 to-rose-950',
    storyText: "A heavy thunderstorm knocked out the power in your apartment. Candles flickering softly across the room, the sound of rain tapping against the window pane created an intimate, cozy sanctuary just for the two of you.",
    question: "How do you spend this candlelight rainy evening?",
    choices: [
      {
        id: 'A',
        text: 'Build a giant cozy blanket fort and share deep secrets 🏰',
        score: 35,
        outcomeText: "Inside the blanket fort, you revealed dreams and secrets you had never told anyone before."
      },
      {
        id: 'B',
        text: 'Cook a candlelit instant noodle feast together with romantic music 🍜',
        score: 25,
        outcomeText: "Cooking together by candlelight turned a simple meal into a 5-star memory!"
      },
      {
        id: 'C',
        text: 'Challenge each other to a playful truth or dare session 🔥',
        score: 30,
        outcomeText: "Laughter echoed through the dark room. You discovered hilarious new sides of each other."
      }
    ]
  },
  {
    id: 4,
    title: 'Chapter 4: Escape to Paradise 🏖️',
    subtitle: 'A spontaneous surprise weekend getaway...',
    bgGradient: 'from-teal-950 via-rose-950 to-slate-950',
    storyText: "You packed a surprise weekend bag and took off on a road trip toward a private beach bungalow. The ocean waves crashed softly against the shore, and the golden hour sun began setting over the horizon.",
    question: "What surprise adventure do you plan for sunset?",
    choices: [
      {
        id: 'A',
        text: 'Set up a romantic beach picnic with fairy lights & handwritten notes 💌',
        score: 35,
        outcomeText: "Reading handwritten notes by the ocean brought happy tears to your eyes."
      },
      {
        id: 'B',
        text: 'Run into the warm ocean waves together holding hands 🌊',
        score: 30,
        outcomeText: "Splashing into the waves together created pure, carefree joy."
      },
      {
        id: 'C',
        text: 'Watch the sunset quietly while sharing your favorite music 🎧',
        score: 25,
        outcomeText: "Sharing earbuds as the sun set created a serene moment of pure harmony."
      }
    ]
  },
  {
    id: 5,
    title: 'Chapter 5: The Forever Vow 💍',
    subtitle: 'The crowning chapter of your eternal love journey...',
    bgGradient: 'from-rose-950 via-pink-950 to-amber-950',
    storyText: "Standing together at the peak of your shared adventure, reflecting on every smile, laugh, and memory built together. The journey of love has brought you closer than ever before.",
    question: "What eternal promise do you make for your future together?",
    choices: [
      {
        id: 'A',
        text: 'Promise to always love, support, and cherish each other through every storm 💖',
        score: 40,
        outcomeText: "A vow forged in heart and soul! Your love story shines brighter than ever."
      },
      {
        id: 'B',
        text: 'Promise to keep exploring new places and creating unforgettable memories ✈️',
        score: 35,
        outcomeText: "An endless adventure awaits! Your future together is filled with joy."
      },
      {
        id: 'C',
        text: 'Promise to always laugh together and never let the romance fade 🌹',
        score: 35,
        outcomeText: "Forever young at heart! Your romance will flourish eternally."
      }
    ]
  }
];

function LoveStoryGame({ user, roomId, socket, onBack }) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [choicesMade, setChoicesMade] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [partnerSelectedChoice, setPartnerSelectedChoice] = useState(null);

  const currentChapter = STORY_CHAPTERS[currentChapterIndex];
  const partnerName = (typeof user?.partnerId === 'object' && user.partnerId?.name) || user?.partnerName || 'Partner';

  // Listen to Socket events for real-time multiplayer choices
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_chat", roomId);

    const handleStoryChoice = (data) => {
      if (data.senderId !== (user._id || user.id)) {
        setPartnerSelectedChoice(data.choice);
        toast(`${data.senderName || 'Partner'} chose Option ${data.choice.id}! 📖`, { icon: '✨' });
      }
    };

    const handleStoryReset = () => {
      setCurrentChapterIndex(0);
      setChoicesMade([]);
      setTotalScore(0);
      setIsCompleted(false);
      setPartnerSelectedChoice(null);
      toast.success("Story Mode restarted!");
    };

    socket.on("receive_story_choice", handleStoryChoice);
    socket.on("receive_story_reset", handleStoryReset);

    return () => {
      socket.off("receive_story_choice", handleStoryChoice);
      socket.off("receive_story_reset", handleStoryReset);
    };
  }, [socket, roomId, user]);

  const handleMakeChoice = (choice) => {
    const newChoices = [...choicesMade, { chapterId: currentChapter.id, choice }];
    const newScore = totalScore + choice.score;

    setChoicesMade(newChoices);
    setTotalScore(newScore);

    // Emit Socket event to sync choice with partner
    if (socket) {
      socket.emit("send_story_choice", {
        roomId,
        senderId: user._id || user.id,
        senderName: user.name || 'Partner',
        chapterId: currentChapter.id,
        choice
      });
    }

    toast.success(choice.outcomeText, { duration: 4000, icon: '💖' });

    if (currentChapterIndex < STORY_CHAPTERS.length - 1) {
      setTimeout(() => {
        setCurrentChapterIndex(prev => prev + 1);
        setPartnerSelectedChoice(null);
      }, 1500);
    } else {
      setTimeout(() => {
        setIsCompleted(true);
      }, 1500);
    }
  };

  const handleResetGame = () => {
    setCurrentChapterIndex(0);
    setChoicesMade([]);
    setTotalScore(0);
    setIsCompleted(false);
    setPartnerSelectedChoice(null);

    if (socket) {
      socket.emit("send_story_reset", { roomId });
    }
  };

  const getLoveTitle = () => {
    if (totalScore >= 160) return { title: 'Soulmates of Destiny 💖', badge: '100% Eternal Affinity' };
    if (totalScore >= 130) return { title: 'Romantic Trailblazers 🌹', badge: '95% Deep Harmony' };
    return { title: 'Sweet Sweethearts ✨', badge: '90% Pure Love' };
  };

  const glassCardStyle = "bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[2.5rem]";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 animate-in fade-in duration-500 px-4">
      {isCompleted && <Confetti numberOfPieces={250} recycle={false} />}

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/80 hover:bg-white text-gray-800 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Games
        </button>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-rose-500/90 text-white rounded-full font-black text-xs shadow-lg flex items-center gap-1.5">
            <Heart size={14} fill="currentColor" /> Synergy: {totalScore} pts
          </div>
          <button
            onClick={handleResetGame}
            className="p-2 bg-white/80 hover:bg-white text-gray-700 rounded-2xl shadow-md transition-all"
            title="Restart Story"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* GAME COMPLETED VIEW */}
      {isCompleted ? (
        <div className={`${glassCardStyle} p-8 md:p-12 text-center text-white space-y-8 bg-gradient-to-b from-rose-950 via-purple-950 to-slate-950`}>
          <div className="w-24 h-24 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <Trophy size={48} className="text-white" />
          </div>

          <div className="space-y-2">
            <span className="px-4 py-1.5 bg-rose-500/30 text-rose-300 rounded-full text-xs font-black uppercase tracking-widest border border-rose-400/30">
              Story Completed 📖
            </span>
            <h2 className="text-4xl font-black text-white">{getLoveTitle().title}</h2>
            <p className="text-sm text-gray-300 font-bold max-w-md mx-auto">
              You and {partnerName} have completed all 5 chapters of your romantic journey!
            </p>
          </div>

          {/* Certificate Badge */}
          <div className="p-6 bg-white/5 rounded-3xl border border-white/10 max-w-md mx-auto space-y-3 shadow-inner">
            <Award size={36} className="text-amber-400 mx-auto" />
            <h4 className="text-xl font-black text-amber-300">Official Love Certificate</h4>
            <p className="text-xs text-gray-300 italic">"Bound by Destiny, United in Heart & Soul"</p>
            <div className="pt-2 flex justify-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-black">
                {getLoveTitle().badge}
              </span>
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-black">
                5 Chapters Completed
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={handleResetGame}
              className="px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-xs shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} /> Replay Story Adventure 💖
            </button>
          </div>
        </div>
      ) : (
        /* CHAPTER VIEW */
        <div className={`${glassCardStyle} p-6 md:p-10 text-white space-y-6 bg-gradient-to-b ${currentChapter.bgGradient} transition-all duration-700`}>
          
          {/* Chapter Progress */}
          <div className="flex items-center justify-between text-xs font-black text-rose-300 uppercase tracking-widest">
            <span>Chapter {currentChapterIndex + 1} of {STORY_CHAPTERS.length}</span>
            <div className="flex gap-1.5">
              {STORY_CHAPTERS.map((ch, i) => (
                <div
                  key={ch.id}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === currentChapterIndex ? 'bg-rose-500 scale-125' : i < currentChapterIndex ? 'bg-green-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Chapter Title */}
          <div className="space-y-1">
            <h3 className="text-2xl md:text-3xl font-black text-white">{currentChapter.title}</h3>
            <p className="text-xs text-rose-300 font-bold italic">{currentChapter.subtitle}</p>
          </div>

          {/* Story Narrative Box */}
          <div className="p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 text-sm md:text-base leading-relaxed font-medium text-gray-100 shadow-inner">
            <p>{currentChapter.storyText}</p>
          </div>

          {/* Decision Question */}
          <div className="pt-2">
            <h4 className="text-sm md:text-base font-black text-amber-300 flex items-center gap-2">
              <Sparkles size={18} /> {currentChapter.question}
            </h4>
          </div>

          {/* Choices List */}
          <div className="space-y-3 pt-2">
            {currentChapter.choices.map((choice) => {
              const isPartnerChoice = partnerSelectedChoice?.id === choice.id;
              return (
                <button
                  key={choice.id}
                  onClick={() => handleMakeChoice(choice)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-4 group ${
                    isPartnerChoice
                      ? 'bg-rose-500/30 border-rose-400 shadow-lg scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/15 border-white/10 hover:border-rose-400/50'
                  }`}
                >
                  <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 font-black text-xs flex items-center justify-center shrink-0 border border-rose-400/30 group-hover:bg-rose-500 group-hover:text-white transition-all">
                    {choice.id}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-bold text-white group-hover:text-rose-200 transition-all">
                      {choice.text}
                    </p>
                    {isPartnerChoice && (
                      <span className="inline-block mt-1 text-[10px] font-black text-rose-300 bg-rose-500/30 px-2 py-0.5 rounded-full">
                        {partnerName}'s Pick! ✨
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoveStoryGame;

import React, { useState } from 'react';
import { Sparkles, Heart, Compass, Feather, MessageCircle, Copy, Check, RefreshCw, Send, Wine, Coffee, Utensils, Tent, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const dateIdeasDatabase = {
  cozy: [
    {
      title: "Pajama Movie & Gourmet Popcorn Night 🍿",
      vibe: "Cozy & Relaxing",
      duration: "2-3 Hours",
      itinerary: [
        "Build a giant blanket fort in the living room using soft pillows and fairy lights.",
        "Prepare 3 popcorn flavors: Caramel Sea Salt, Buttered Garlic, and Spicy Peri-Peri.",
        "Pick a movie franchise marathon (or use Watch Together) and snuggle up!"
      ],
      conversation: "What is your absolute favorite childhood memory during rainy days?",
      snack: "Hot Cocoa with Marshmallows & Salted Caramel Popcorn"
    },
    {
      title: "DIY Pizza & Board Game Challenge 🍕",
      vibe: "Fun & Interactive",
      duration: "2 Hours",
      itinerary: [
        "Order mini pizza bases and prepare toppings (cheese, olives, pepperoni, jalapeños).",
        "Make custom shaped pizzas for each other without revealing the shape!",
        "Bake and eat while playing a quick match of Love Ludo or Memory Pairs."
      ],
      conversation: "If we could open a restaurant together, what would we name it and what would we serve?",
      snack: "Heart-Shaped Pizza & Chilled Mocktails"
    }
  ],
  romantic: [
    {
      title: "Candlelight Wine & Slow Dancing 🍷",
      vibe: "Deeply Romantic",
      duration: "3 Hours",
      itinerary: [
        "Dim all ambient lights and light scented vanilla/rose candles.",
        "Prepare a cheese board with grapes, crackers, and sparkling wine.",
        "Play a lo-fi romantic playlist and slow dance in the living room."
      ],
      conversation: "What was the exact moment you realized you were falling in love with me?",
      snack: "Red Wine, Fondue Cheese & Chocolate Covered Strawberries"
    },
    {
      title: "Midnight Stargazing & Dreams Talk 🌌",
      vibe: "Magical & Serene",
      duration: "1-2 Hours",
      itinerary: [
        "Head to the balcony or rooftop with a warm cozy blanket.",
        "Use a stargazing app or look at our Universe Map memory pins.",
        "Share 3 secret dreams you want to achieve together in the next 5 years."
      ],
      conversation: "Where do you see us living and traveling 10 years from today?",
      snack: "Warm Chamomile Tea & Dark Chocolate Truffles"
    }
  ],
  outdoor: [
    {
      title: "Sunset Picnic & Polaroid Photoshoot 🧺",
      vibe: "Fresh & Adventurous",
      duration: "3-4 Hours",
      itinerary: [
        "Pack a basket with sandwiches, fresh fruit, and fresh juice.",
        "Find a quiet park or lakeside spot right before golden hour.",
        "Take candid photos of each other and save them to Our Memories tab!"
      ],
      conversation: "What is one outdoor adventure on your bucket list we haven't done yet?",
      snack: "Artisanal Sandwiches, Fresh Berries & Lemonade"
    }
  ],
  budget: [
    {
      title: "Midnight Ice Cream Run & Karaoke 🍦",
      vibe: "Playful & Casual",
      duration: "1.5 Hours",
      itinerary: [
        "Grab your favorite ice cream tubs or visit a local late-night spot.",
        "Put on your favorite songs in the car or room and sing along at full volume!",
        "Rate each other's singing out of 10 with funny awards."
      ],
      conversation: "What song instantly reminds you of our relationship and why?",
      snack: "Double Scoop Waffle Cones & Cookie Dough"
    }
  ]
};

const lovePoemTemplates = {
  romantic: [
    (name, memory) => `My dearest ${name},\n\nEvery day with you feels like a beautiful dream I never want to wake up from. Remembering ${memory || 'all our sweet moments together'} brings the warmest smile to my heart.\n\nYou are my safe haven, my biggest laughter, and my favorite adventure.\n\nForever & Always Yours ❤️`,
    (name, memory) => `To ${name},\n\nIn a world full of noise, your voice is my favorite melody. From ${memory || 'our late night talks'} to the quiet moments we share, every second with you is precious.\n\nThank you for loving me so softly and completely. ✨`
  ],
  playful: [
    (name, memory) => `Hey ${name}! 😜\n\nJust a quick AI reminder that you are 100% stuck with me forever! Thinking about ${memory || 'our crazy fun times'} still makes me laugh out loud.\n\nYou're my favorite human, my partner in crime, and the ultimate cutie. 🍕❤️`,
    (name, memory) => `Dear ${name},\n\nIf loving you was a game of Chess, I'd let you win every single time (okay, maybe most times!). Thanks for being my favorite person to annoy and adore. 🥰`
  ],
  apology: [
    (name, memory) => `My sweet ${name},\n\nI am so truly sorry for making you feel upset. You mean the absolute world to me, and hurting you is the last thing I ever want.\n\nI cherish ${memory || 'our love'} so deeply. Can I make it up to you with a warm hug and your favorite treat? 🥺💖`
  ]
};

const deepTalkQuestions = [
  "What is something I do that instantly makes you feel loved and safe?",
  "If we could teleport anywhere in the world right now for 24 hours, where would we go?",
  "What was your very first impression of me when we first met?",
  "What is a small daily habit of ours that you hope never changes?",
  "What is one goal you want us to achieve together this year?",
  "If our love story was a movie title, what would it be named?",
  "What is your favorite memory of us from this past month?"
];

function LoveVerseAI({ user, socket, roomId }) {
  const [activeTab, setActiveTab] = useState('date_planner');
  const [selectedVibe, setSelectedVibe] = useState('romantic');
  const [generatedDate, setGeneratedDate] = useState(dateIdeasDatabase.romantic[0]);
  
  // Love Note States
  const [noteTone, setNoteTone] = useState('romantic');
  const [partnerName, setPartnerName] = useState(user?.partnerId?.name || 'My Love');
  const [memoryHint, setMemoryHint] = useState('');
  const [generatedNote, setGeneratedNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Deep Talk States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleGenerateDate = () => {
    const list = dateIdeasDatabase[selectedVibe] || dateIdeasDatabase.romantic;
    const random = list[Math.floor(Math.random() * list.length)];
    setGeneratedDate(random);
    toast.success("New Date Night Idea Generated! ✨");
  };

  const handleGenerateNote = () => {
    const templates = lovePoemTemplates[noteTone] || lovePoemTemplates.romantic;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const note = template(partnerName, memoryHint);
    setGeneratedNote(note);
    toast.success("Love Note Crafted! 💖");
  };

  const handleCopyNote = () => {
    if (!generatedNote) return;
    navigator.clipboard.writeText(generatedNote);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToChat = () => {
    if (!generatedNote) return;
    if (socket && roomId) {
      socket.emit("send_message", {
        room: roomId,
        senderId: user._id || user.id,
        senderName: user.name,
        message: `💌 *Love Note Generator*:\n\n${generatedNote}`,
        createdAt: new Date()
      });
      toast.success("Sent directly to your Couple Chat! 💌");
    } else {
      toast.error("Chat connection not active!");
    }
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) => (prev + 1) % deepTalkQuestions.length);
  };

  const handleSendQuestionToChat = () => {
    const q = deepTalkQuestions[currentQuestionIndex];
    if (socket && roomId) {
      socket.emit("send_message", {
        room: roomId,
        senderId: user._id || user.id,
        senderName: user.name,
        message: `❓ *Deep Connection Question*:\n\n"${q}"`,
        createdAt: new Date()
      });
      toast.success("Question sent to Partner in Chat! 💬");
    }
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-500 pb-16 px-2 md:px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full text-white font-black text-xs uppercase tracking-widest shadow-md">
          <Sparkles size={16} /> Powered by LoveVerse AI
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-800 italic">
          LoveVerse AI Assistant ✨
        </h2>
        <p className="text-gray-500 font-bold text-sm max-w-lg mx-auto italic">
          "Your personal AI matchmaker, romantic planner, and deep connection coach."
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex justify-center gap-3 p-2 bg-white/60 backdrop-blur-xl rounded-full max-w-md mx-auto border border-rose-100 shadow-sm">
        <button
          onClick={() => setActiveTab('date_planner')}
          className={`flex-1 py-3 px-4 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'date_planner'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-gray-600 hover:text-rose-500'
          }`}
        >
          <Compass size={16} /> Date Planner
        </button>
        <button
          onClick={() => setActiveTab('love_writer')}
          className={`flex-1 py-3 px-4 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'love_writer'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-gray-600 hover:text-rose-500'
          }`}
        >
          <Feather size={16} /> Love Writer
        </button>
        <button
          onClick={() => setActiveTab('deep_talk')}
          className={`flex-1 py-3 px-4 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'deep_talk'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-gray-600 hover:text-rose-500'
          }`}
        >
          <MessageCircle size={16} /> Deep Talk
        </button>
      </div>

      {/* TAB 1: DATE NIGHT PLANNER */}
      {activeTab === 'date_planner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className={`lg:col-span-4 ${glassStyle} p-6 space-y-6`}>
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Compass className="text-rose-500" size={20} /> Choose Vibe
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'cozy', label: 'Cozy Night', icon: Coffee },
                { id: 'romantic', label: 'Romantic', icon: Wine },
                { id: 'outdoor', label: 'Outdoor', icon: Tent },
                { id: 'budget', label: 'Playful', icon: Film },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedVibe(item.id)}
                    className={`p-4 rounded-2xl border font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                      selectedVibe === item.id
                        ? 'bg-rose-50 border-rose-400 text-rose-600 shadow-sm'
                        : 'border-gray-100 bg-white text-gray-600 hover:border-rose-200'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleGenerateDate}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-xs shadow-lg hover:shadow-rose-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Generate Date Plan
            </button>
          </div>

          {/* Generated Plan Output */}
          <div className={`lg:col-span-8 ${glassStyle} p-8 space-y-6 relative overflow-hidden`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                  {generatedDate.vibe} • {generatedDate.duration}
                </span>
                <h3 className="text-2xl font-black text-gray-800 mt-2">
                  {generatedDate.title}
                </h3>
              </div>
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500">
                <Heart size={24} fill="currentColor" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Itinerary & Steps</h4>
              <ul className="space-y-3">
                {generatedDate.itinerary.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/60">
                    <span className="w-6 h-6 bg-rose-500 text-white rounded-full font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">💬 Icebreaker Prompt</p>
                <p className="text-xs font-bold text-gray-700 italic">"{generatedDate.conversation}"</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">🍰 Food & Drink Pairing</p>
                <p className="text-xs font-bold text-gray-700">{generatedDate.snack}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOVE LETTER & POEM WRITER */}
      {activeTab === 'love_writer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`lg:col-span-5 ${glassStyle} p-6 space-y-5`}>
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Feather className="text-rose-500" size={20} /> AI Love Note Setup
            </h3>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Partner Name</label>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Partner's name..."
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border border-gray-100 focus:border-rose-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tone & Vibe</label>
              <select
                value={noteTone}
                onChange={(e) => setNoteTone(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border border-gray-100 focus:border-rose-300"
              >
                <option value="romantic">Deeply Romantic 💖</option>
                <option value="playful">Playful & Cute 😜</option>
                <option value="apology">Heartfelt Apology 🥺</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Special Memory / Hint (Optional)</label>
              <input
                type="text"
                value={memoryHint}
                onChange={(e) => setMemoryHint(e.target.value)}
                placeholder="e.g. Our beach trip, late night call..."
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border border-gray-100 focus:border-rose-300"
              />
            </div>

            <button
              onClick={handleGenerateNote}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-xs shadow-lg hover:shadow-rose-200 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Compose Love Note
            </button>
          </div>

          <div className={`lg:col-span-7 ${glassStyle} p-8 flex flex-col justify-between space-y-6 min-h-[350px]`}>
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">
                  AI Crafted Note
                </span>
                {generatedNote && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyNote}
                      className="p-2.5 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-500 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleSendToChat}
                      className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all font-bold text-xs flex items-center gap-1 shadow-md"
                    >
                      <Send size={16} /> Send to Chat
                    </button>
                  </div>
                )}
              </div>

              {generatedNote ? (
                <div className="p-6 bg-rose-50/40 rounded-3xl border border-rose-100/80 font-serif text-gray-800 whitespace-pre-line text-base leading-relaxed italic shadow-inner">
                  "{generatedNote}"
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 font-bold italic space-y-2 border-2 border-dashed border-rose-100 rounded-3xl">
                  <Feather size={36} className="text-rose-200" />
                  <p>Configure details on the left and click Compose!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEEP TALK QUESTIONS */}
      {activeTab === 'deep_talk' && (
        <div className={`${glassStyle} p-10 max-w-3xl mx-auto text-center space-y-8 relative overflow-hidden`}>
          <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center text-rose-500 mx-auto shadow-inner">
            <MessageCircle size={32} />
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100">
              Deep Connection Question #{currentQuestionIndex + 1}
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-gray-800 leading-snug px-4 italic">
              "{deepTalkQuestions[currentQuestionIndex]}"
            </h3>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-black text-xs transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} /> Next Question
            </button>
            <button
              onClick={handleSendQuestionToChat}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs shadow-lg hover:shadow-rose-200 transition-all flex items-center gap-2"
            >
              <Send size={16} /> Ask Partner in Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoveVerseAI;

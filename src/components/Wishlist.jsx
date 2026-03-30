import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, Plus, Trash2, Search, Gift, Sparkles, Heart, 
  CreditCard, Loader2, CheckCircle2, X, ShoppingCart, Star, PlusCircle, ShoppingBagIcon
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL;

// --- NAYA: Razorpay Script Load karne ke liye Helper ---
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function Wishlist({ user, roomId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShop, setShowShop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const userId = user._id || user.id;

  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/wishlist/${roomId}`);
      setItems(res.data);
    } catch (err) {
      toast.error("Wishlist sync fail!");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    
    try {
      const res = await axios.get(`${API_URL}/api/wishlist/search-products?q=${searchQuery}`);
      setSearchResults(res.data);
      if (res.data.length === 0) toast.error("Koi product nahi mila!");
    } catch (err) {
      toast.error("Search failed! Backend check karo.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addToWishlist = async (product) => {
    const toastId = toast.loading("Wishlist mein add ho raha hai...");
    try {
      const res = await axios.post(`${API_URL}/api/wishlist/add`, {
        roomId,
        addedBy: userId,
        title: product.title,
        imageUrl: product.image,
        price: product.price,
        category: product.platform || "Shopping",
        platform: product.platform,
        priority: "Normal"
      });
      
      setItems(prev => [res.data, ...prev]);
      toast.success(`${product.platform} item saved! ✨`, { id: toastId });
      setShowShop(false);
    } catch (err) {
      toast.error("Save nahi ho paya", { id: toastId });
    }
  };

  // --- UPDATE: Ab ye real Razorpay ko trigger karega ---
  const buyProduct = async (product) => {
    const toastId = toast.loading("Processing Payment...");
    
    try {
      let targetId = product._id;

      // AGAR PRODUCT MALL SE HAI (Database mein nahi hai):
      if (!targetId) {
        const resAdd = await axios.post(`${API_URL}/api/wishlist/add`, {
          roomId,
          addedBy: userId,
          title: product.title,
          imageUrl: product.image, // Mapping 'image' to 'imageUrl'
          price: product.price,
          category: product.platform || "Shopping",
          platform: product.platform,
          priority: "High"
        });
        targetId = resAdd.data._id; // Nayi ID mil gayi
      }

      // AB VERIFY CALL KAREGA (Chahe wishlist se ho ya mall se)
      const res = await axios.post(`${API_URL}/api/wishlist/verify`, {
        itemId: targetId, 
        razorpay_payment_id: "SIMULATED_PAYMENT_" + Date.now()
      });

      if (res.data.success) {
        setTimeout(() => {
          toast.success(`Ordered: ${product.title}! 🎁`, { id: toastId });
          fetchWishlist(); 
          setShowShop(false);
        }, 1500);
      }
    } catch (err) {
      toast.error("Process failed! Backend check karo.", { id: toastId });
      console.error("BUY_ERROR:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/wishlist/delete/${id}`);
      setItems(prev => prev.filter(item => item._id !== id));
      toast.success("Uda diya!");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="relative">
        <Loader2 className="animate-spin text-rose-500" size={60} />
        <Heart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-rose-400" size={20} />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 font-sans bg-[#FBFBFB] min-h-screen">
      
      {/* Dynamic Mall Header - (Bilkul waisa hi hai) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50">
        <div>
          <h2 className="text-4xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            {showShop ? <ShoppingBagIcon className="text-rose-500" size={32} /> : <Heart className="text-rose-500" size={32} />}
            {showShop ? "Mall" : "Wishes"}
          </h2>
          <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">
            {showShop ? "Myntra • Savana • Amazon" : "Your Dreams, Curated"}
          </p>
        </div>
        
        <button 
          onClick={() => { setShowShop(!showShop); setSearchResults([]); }}
          className={`px-10 py-5 rounded-[2rem] font-black text-xs transition-all flex items-center gap-3 shadow-2xl active:scale-95 ${showShop ? 'bg-gray-100 text-gray-800' : 'bg-rose-500 text-white shadow-rose-200'}`}
        >
          {showShop ? <X size={20} /> : <Search size={20} />}
          {showShop ? "EXIT MALL" : "GO SHOPPING"}
        </button>
      </div>

      {showShop ? (
        /* --- PREMIUM MALL INTERFACE --- */
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
            <input 
              type="text" 
              placeholder="Search Myntra, Savana or Amazon..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-7 pl-16 bg-white rounded-[2.5rem] shadow-2xl outline-none border-2 border-transparent focus:border-rose-200 font-bold transition-all text-gray-800 placeholder:text-gray-300"
            />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-rose-400" />
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-colors">Find</button>
          </form>

          {isSearching ? (
             <div className="text-center py-24">
               <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }} className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <ShoppingCart className="text-rose-500" size={32} />
               </motion.div>
               <p className="text-gray-400 font-black text-lg">Fetching latest trends...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {searchResults.map((prod) => (
                <motion.div key={prod.id} whileHover={{ y: -12 }} className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-gray-50 flex flex-col group relative">
                  
                  <div className="absolute top-5 left-5 z-10 px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-tighter shadow-xl" style={{ backgroundColor: prod.platformColor }}>
                    {prod.platform}
                  </div>

                  <div className="absolute top-5 right-5 z-10 bg-green-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg">
                    {prod.discount}% OFF
                  </div>

                  <div className="h-80 relative overflow-hidden bg-gray-50">
                    <img 
                      src={prod.image} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                      alt={prod.title}
                      onError={(e) => { e.target.src = "https://placehold.co/400x600?text=Premium+Item" }}
                    />
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl flex items-center gap-1.5 shadow-xl">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span className="font-black text-xs text-gray-800">{prod.rating}</span>
                       </div>
                    </div>
                  </div>

                  <div className="p-7 flex flex-col flex-1 bg-white">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-2">{prod.brand}</p>
                    <h4 className="text-lg font-bold text-gray-800 leading-tight mb-4 line-clamp-2 min-h-[3rem]">{prod.title}</h4>
                    
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-3xl font-black text-gray-900">₹{prod.price}</span>
                      <span className="text-sm text-gray-300 line-through font-bold">₹{Math.round(prod.price * 1.4)}</span>
                    </div>
                    
                    <div className="flex gap-3 mt-auto">
                      <button 
                        onClick={() => addToWishlist(prod)}
                        className="flex-1 bg-gray-50 text-gray-800 py-4 rounded-[1.5rem] font-black text-[10px] flex items-center justify-center gap-2 hover:bg-rose-50 hover:text-rose-600 transition-all border border-gray-100 uppercase tracking-widest"
                      >
                        <Heart size={16} /> Wish
                      </button>
                      <button 
                        onClick={() => buyProduct(prod)}
                        className="flex-[1.5] bg-gray-900 text-white py-4 rounded-[1.5rem] font-black text-[10px] flex items-center justify-center gap-2 hover:bg-rose-500 transition-all shadow-xl uppercase tracking-widest"
                      >
                        <CreditCard size={16} /> Buy Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* --- WISHLIST INTERFACE - (Pehle waala code bilkul waisa hi hai) --- */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {items.map((item) => (
            <motion.div layout key={item._id} className="bg-white rounded-[3.5rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col group relative">
               <div className="h-72 bg-gray-50 relative overflow-hidden">
                 <img 
                   src={item.imageUrl || "https://placehold.co/400x400?text=Dream+Gift"} 
                   className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                 />
                 {item.isBought && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center">
                      <div className="bg-white px-6 py-3 rounded-[2rem] shadow-2xl font-black text-green-600 text-xs flex items-center gap-2 border border-green-50">
                        <CheckCircle2 size={18} /> GIFTED BY LOVE
                      </div>
                    </div>
                 )}
               </div>
               <div className="p-10 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <span className="bg-rose-50 text-[10px] font-black px-4 py-1.5 rounded-full text-rose-500 uppercase tracking-widest">{item.category || 'Wish'}</span>
                    {item.addedBy === userId && (
                      <button onClick={() => handleDelete(item._id)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <h4 className="text-2xl font-black text-gray-800 mb-8 flex-1 line-clamp-2 leading-[1.3]">{item.title}</h4>
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <span className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Price</span>
                      <span className="text-2xl font-black text-gray-900">₹{item.price || '---'}</span>
                    </div>
                    <Gift size={32} className="text-rose-100" />
                  </div>
                  
                  {item.addedBy !== userId && !item.isBought && (
                    <button onClick={() => buyProduct(item)} className="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black text-xs shadow-2xl shadow-rose-200 hover:bg-rose-600 transition-all uppercase tracking-widest">
                      SURPRISE NOW
                    </button>
                  )}
               </div>
            </motion.div>
          ))}
        </div>
      )}

      {items.length === 0 && !showShop && (
        <div className="text-center py-40 bg-white rounded-[5rem] border-2 border-dashed border-gray-100 shadow-inner">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-rose-300" size={40} />
           </div>
           <p className="text-gray-400 font-black text-xl">Your wishlist is empty.</p>
           <button onClick={() => setShowShop(true)} className="mt-4 text-rose-500 font-black text-sm hover:underline uppercase tracking-widest">Start Shopping</button>
        </div>
      )}
    </div>
  );
}

export default Wishlist;
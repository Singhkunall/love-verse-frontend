import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Plus, Trash2, Search, Gift, Sparkles, Heart, Loader2, CheckCircle2, X, ShoppingCart, ExternalLink, Users, Clock, MapPin } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';

const PLATFORMS = [
  { 
    name: 'Swiggy', 
    color: '#FC8019', 
    bg: '#FFF3E8',
    logo: '🧡',
    url: (q) => `https://www.swiggy.com/search?query=${encodeURIComponent(q)}`,
    description: 'Food Delivery',
    categories: ['Pizza', 'Burger', 'Biryani', 'Sushi', 'Chinese', 'Desserts']
  },
  { 
    name: 'Zomato', 
    color: '#E23744', 
    bg: '#FFEBEC',
    logo: '❤️',
    url: (q) => `https://www.zomato.com/search?q=${encodeURIComponent(q)}`,
    description: 'Restaurant Discovery',
    categories: ['North Indian', 'South Indian', 'Fast Food', 'Healthy', 'Cafe', 'Bakery']
  },
  { 
    name: 'Blinkit', 
    color: '#0C831F', 
    bg: '#E8F5E9',
    logo: '⚡',
    url: (q) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}`,
    description: '10-min Grocery',
    categories: ['Fruits', 'Vegetables', 'Dairy', 'Snacks', 'Beverages', 'Household']
  },
];

const QUICK_ITEMS = {
  Swiggy: [
    { name: 'Pizza 🍕', emoji: '🍕' },
    { name: 'Burger 🍔', emoji: '🍔' },
    { name: 'Biryani 🍛', emoji: '🍛' },
    { name: 'Pasta 🍝', emoji: '🍝' },
    { name: 'Ice Cream 🍦', emoji: '🍦' },
    { name: 'Cake 🎂', emoji: '🎂' },
  ],
  Zomato: [
    { name: 'Paneer Butter Masala', emoji: '🧆' },
    { name: 'Dosa', emoji: '🥞' },
    { name: 'Momos', emoji: '🥟' },
    { name: 'Rolls', emoji: '🌯' },
    { name: 'Thali', emoji: '🍱' },
    { name: 'Coffee ☕', emoji: '☕' },
  ],
  Blinkit: [
    { name: 'Milk', emoji: '🥛' },
    { name: 'Eggs', emoji: '🥚' },
    { name: 'Bread', emoji: '🍞' },
    { name: 'Chips', emoji: '🍟' },
    { name: 'Cold Drink', emoji: '🥤' },
    { name: 'Chocolate', emoji: '🍫' },
  ],
};

function Wishlist({ user, roomId, socket }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wishlist'); // wishlist | order
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [cart, setCart] = useState([]);
  const [customItem, setCustomItem] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newWishItem, setNewWishItem] = useState({ title: '', price: '', imageUrl: '', link: '' });

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

  useEffect(() => { 
    fetchWishlist(); 
    if (socket) {
      socket.on('order_placed', (data) => {
        toast.success(`${data.placedBy} ne order place kar diya! 🎉`);
        fetchWishlist();
      });
      return () => socket.off('order_placed');
    }
  }, [fetchWishlist]);

  const addToCart = (item) => {
    if (cart.find(c => c.name === item.name)) {
      toast.error("Already cart mein hai!");
      return;
    }
    setCart(prev => [...prev, item]);
    toast.success(`${item.emoji} cart mein add ho gaya!`);
  };

  const removeFromCart = (name) => {
    setCart(prev => prev.filter(c => c.name !== name));
  };

  const addCustomItem = () => {
    if (!customItem) return;
    addToCart({ name: customItem, emoji: '🛒' });
    setCustomItem('');
  };

  const placeOrder = async () => {
    if (!selectedPlatform || cart.length === 0) {
      toast.error("Platform aur items select karo!");
      return;
    }

    const platform = PLATFORMS.find(p => p.name === selectedPlatform);
    const searchQuery = cart.map(c => c.name).join(' ');
    
    // Save order to DB
    try {
      await axios.post(`${API_URL}/api/wishlist/add`, {
        roomId,
        addedBy: userId,
        title: `${selectedPlatform} Order: ${cart.map(c => c.name).join(', ')}`,
        category: selectedPlatform,
        platform: selectedPlatform,
        price: 0,
        isBought: false
      });

      // Notify partner
      if (socket) {
        socket.emit('order_placed', { 
          roomId, 
          placedBy: user.name,
          platform: selectedPlatform,
          items: cart.map(c => c.name)
        });
      }

      setOrderPlaced(true);
      
      // Open platform
      setTimeout(() => {
        window.open(platform.url(searchQuery), '_blank');
      }, 500);

      toast.success(`${selectedPlatform} pe redirect ho rahe hain! 🚀`);
    } catch (err) {
      toast.error("Order save nahi hua!");
    }
  };

  const addWishItem = async () => {
    if (!newWishItem.title) return toast.error("Title daalo!");
    try {
      const res = await axios.post(`${API_URL}/api/wishlist/add`, {
        roomId,
        addedBy: userId,
        ...newWishItem,
        category: 'Wish',
        priority: 'Normal'
      });
      setItems(prev => [res.data, ...prev]);
      setShowAddItem(false);
      setNewWishItem({ title: '', price: '', imageUrl: '', link: '' });
      toast.success("Wish add ho gaya! ✨");
    } catch (err) {
      toast.error("Add nahi hua!");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/wishlist/delete/${id}`);
      setItems(prev => prev.filter(item => item._id !== id));
      toast.success("Removed!");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin text-rose-500" size={40} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-24 font-sans">
      
      {/* Tabs */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'wishlist' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-white text-gray-500'}`}
        >
          ❤️ Wishlist
        </button>
        <button
          onClick={() => { setActiveTab('order'); setOrderPlaced(false); }}
          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'order' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-white text-gray-500'}`}
        >
          🛒 Order Together
        </button>
      </div>

      {/* WISHLIST TAB */}
      {activeTab === 'wishlist' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-800">Our Wishes ✨</h2>
            <button
              onClick={() => setShowAddItem(true)}
              className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2"
            >
              <Plus size={18} /> Add Wish
            </button>
          </div>

          {/* Add Wish Modal */}
          <AnimatePresence>
            {showAddItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-800">Add a Wish ✨</h3>
                    <button onClick={() => setShowAddItem(false)}><X size={20} className="text-gray-400" /></button>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Item name (e.g. Nike Shoes)"
                      value={newWishItem.title}
                      onChange={e => setNewWishItem(p => ({ ...p, title: e.target.value }))}
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={newWishItem.price}
                      onChange={e => setNewWishItem(p => ({ ...p, price: e.target.value }))}
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      value={newWishItem.imageUrl}
                      onChange={e => setNewWishItem(p => ({ ...p, imageUrl: e.target.value }))}
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Product link (Amazon/Flipkart)"
                      value={newWishItem.link}
                      onChange={e => setNewWishItem(p => ({ ...p, link: e.target.value }))}
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm"
                    />
                    <button
                      onClick={addWishItem}
                      className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black"
                    >
                      Save Wish 💕
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Wish Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.filter(i => !['Swiggy', 'Zomato', 'Blinkit'].includes(i.platform)).map(item => (
              <motion.div
                key={item._id}
                layout
                className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg border border-gray-50 flex flex-col group"
              >
                <div className="h-48 bg-gray-50 overflow-hidden">
                  <img
                    src={item.imageUrl || `https://placehold.co/400x300?text=${item.title}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    alt={item.title}
                    onError={e => e.target.src = `https://placehold.co/400x300?text=Wish`}
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h4 className="font-black text-gray-800 text-lg mb-2 line-clamp-2">{item.title}</h4>
                  {item.price > 0 && (
                    <p className="text-2xl font-black text-rose-500 mb-4">₹{item.price}</p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={14} /> Buy Now
                      </a>
                    )}
                    {item.addedBy === userId && (
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {items.filter(i => !['Swiggy', 'Zomato', 'Blinkit'].includes(i.platform)).length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-rose-100">
              <Sparkles className="text-rose-200 mx-auto mb-4" size={40} />
              <p className="text-gray-400 font-black">Koi wish nahi hai abhi!</p>
              <button onClick={() => setShowAddItem(true)} className="mt-4 text-rose-500 font-black text-sm">+ Add First Wish</button>
            </div>
          )}
        </div>
      )}

      {/* ORDER TOGETHER TAB */}
      {activeTab === 'order' && (
        <div className="space-y-6">
          
          {orderPlaced ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-16 bg-white rounded-[3rem] shadow-xl"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Order Ho Gaya!</h3>
              <p className="text-gray-400 font-bold mb-2">{selectedPlatform} pe redirect ho gaye ho</p>
              <p className="text-gray-400 text-sm mb-6">Partner ko notification bhej diya gaya ❤️</p>
              <button
                onClick={() => { setOrderPlaced(false); setCart([]); setSelectedPlatform(null); }}
                className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-black"
              >
                New Order 🛒
              </button>
            </motion.div>
          ) : (
            <>
              {/* Platform Selection */}
              <div>
                <h3 className="text-lg font-black text-gray-800 mb-4">Platform Choose Karo 👇</h3>
                <div className="grid grid-cols-3 gap-4">
                  {PLATFORMS.map(platform => (
                    <button
                      key={platform.name}
                      onClick={() => setSelectedPlatform(platform.name)}
                      className={`p-4 rounded-2xl border-2 transition-all text-center ${
                        selectedPlatform === platform.name
                          ? 'border-rose-500 shadow-lg scale-[1.02]'
                          : 'border-gray-100 bg-white'
                      }`}
                      style={{ background: selectedPlatform === platform.name ? platform.bg : 'white' }}
                    >
                      <div className="text-3xl mb-2">{platform.logo}</div>
                      <p className="font-black text-sm" style={{ color: selectedPlatform === platform.name ? platform.color : '#374151' }}>
                        {platform.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold">{platform.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Items */}
              {selectedPlatform && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="text-lg font-black text-gray-800 mb-4">Quick Add 🚀</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK_ITEMS[selectedPlatform]?.map(item => (
                      <button
                        key={item.name}
                        onClick={() => addToCart(item)}
                        className={`px-4 py-2 rounded-full font-bold text-sm transition-all border ${
                          cart.find(c => c.name === item.name)
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'
                        }`}
                      >
                        {item.emoji} {item.name}
                      </button>
                    ))}
                  </div>

                  {/* Custom Item */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Kuch aur chahiye? Type karo..."
                      value={customItem}
                      onChange={e => setCustomItem(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addCustomItem()}
                      className="flex-1 p-4 bg-white rounded-2xl border border-gray-100 outline-none font-bold text-sm focus:border-rose-300"
                    />
                    <button
                      onClick={addCustomItem}
                      className="px-6 py-4 bg-rose-500 text-white rounded-2xl font-black"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Cart */}
              {cart.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-50"
                >
                  <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                    <ShoppingCart size={20} className="text-rose-500" />
                    Our Cart ({cart.length} items)
                  </h3>
                  <div className="space-y-2 mb-6">
                    {cart.map(item => (
                      <div key={item.name} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-2xl">
                        <span className="font-bold text-sm text-gray-700">{item.emoji} {item.name}</span>
                        <button onClick={() => removeFromCart(item.name)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-rose-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
                    <Users size={18} className="text-rose-500" />
                    <p className="text-sm font-bold text-rose-600">Partner ko real-time notification milega!</p>
                  </div>

                  <button
                    onClick={placeOrder}
                    className="w-full py-5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-rose-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                  >
                    <ExternalLink size={18} />
                    Order on {selectedPlatform} 🚀
                  </button>
                </motion.div>
              )}

              {/* Previous Orders */}
              {items.filter(i => ['Swiggy', 'Zomato', 'Blinkit'].includes(i.platform)).length > 0 && (
                <div>
                  <h3 className="text-lg font-black text-gray-800 mb-4">Previous Orders 📦</h3>
                  <div className="space-y-3">
                    {items.filter(i => ['Swiggy', 'Zomato', 'Blinkit'].includes(i.platform)).map(order => {
                      const platform = PLATFORMS.find(p => p.name === order.platform);
                      return (
                        <div key={order._id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-50">
                          <div className="text-2xl">{platform?.logo}</div>
                          <div className="flex-1">
                            <p className="font-black text-sm text-gray-800">{order.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="text-[10px] font-black px-3 py-1 rounded-full" style={{ background: platform?.bg, color: platform?.color }}>
                            {order.platform}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Wishlist;
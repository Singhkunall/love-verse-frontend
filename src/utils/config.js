const rawUrl = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';
export const API_URL = (rawUrl && !rawUrl.includes('localhost')) ? rawUrl : 'https://love-verse-backend.onrender.com';
export default API_URL;

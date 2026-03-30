import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        partnerEmail: '' // Long distance app hai toh partner ka email zaroori hai
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // ✅ Yahan humne Env variable use kiya hai (Localhost nahi!)
            const API_URL = import.meta.env.VITE_API_URL;
            const res = await axios.post(`${API_URL}/api/auth/register`, formData);
            
            if (res.data) {
                alert("Registration Successful! Ab login karo.");
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Registration fail ho gaya!");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-rose-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-rose-600 mb-6 text-center">Create Account ❤️</h2>
                
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        name="username"
                        type="text"
                        placeholder="Your Name"
                        className="w-full p-4 rounded-xl border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                        onChange={handleChange}
                        required
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Your Email"
                        className="w-full p-4 rounded-xl border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                        onChange={handleChange}
                        required
                    />
                    <input
                        name="partnerEmail"
                        type="email"
                        placeholder="Partner's Email"
                        className="w-full p-4 rounded-xl border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                        onChange={handleChange}
                        required
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        className="w-full p-4 rounded-xl border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                        onChange={handleChange}
                        required
                    />
                    <button 
                        type="submit"
                        className="w-full bg-rose-500 text-white p-4 rounded-xl font-bold hover:bg-rose-600 transition-all"
                    >
                        Sign Up
                    </button>
                </form>
                
                <p className="mt-6 text-center text-gray-600">
                    Already have an account? <Link to="/login" className="text-rose-500 font-bold">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
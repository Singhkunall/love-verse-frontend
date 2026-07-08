import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, X, Heart, Plane, Star, Moon, Sparkles, MapPin } from 'lucide-react';


const PIN_TYPES = [
    { type: 'first_meet', label: 'First Meet', emoji: '❤️', color: '#f43f5e' },
    { type: 'trip', label: 'Trip Together', emoji: '✈️', color: '#3b82f6' },
    { type: 'milestone', label: 'Milestone', emoji: '💍', color: '#f59e0b' },
    { type: 'dream', label: 'Dream Destination', emoji: '🌙', color: '#8b5cf6' },
    { type: 'memory', label: 'Random Memory', emoji: '💫', color: '#10b981' },
];

// Convert lat/lng to 3D coordinates
function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

export default function UniverseMap({ user, roomId, socket }) {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const globeRef = useRef(null);
    const controlsRef = useRef(null);
    const pinsRef = useRef([]);
    const frameRef = useRef(null);

    const [pins, setPins] = useState([]);
    const [showAddPin, setShowAddPin] = useState(false);
    const [selectedPin, setSelectedPin] = useState(null);
    const [clickedLatLng, setClickedLatLng] = useState(null);
    const [newPin, setNewPin] = useState({
        title: '', description: '', type: 'memory', lat: 0, lng: 0
    });
    const [stats, setStats] = useState({ total: 0, countries: 0, dreams: 0 });

    // Fetch pins
    const fetchPins = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/universe/${roomId}`);
            setPins(res.data);
            setStats({
                total: res.data.length,
                countries: new Set(res.data.map(p => p.country)).size,
                dreams: res.data.filter(p => p.type === 'dream').length
            });
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchPins();
        if (socket) {
            socket.on('universe_pin_added', fetchPins);
            return () => socket.off('universe_pin_added');
        }
    }, [roomId]);

    // Three.js Setup
    useEffect(() => {
        if (!mountRef.current) return;

        const W = mountRef.current.clientWidth;
        const H = mountRef.current.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Stars background
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 3000;
        const starPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) {
            starPositions[i] = (Math.random() - 0.5) * 2000;
        }
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.8 });
        scene.add(new THREE.Points(starGeometry, starMaterial));

        // Camera
        const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
        camera.position.z = 3;
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Globe
        const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
        const textureLoader = new THREE.TextureLoader();

        // Earth texture
        const earthTexture = textureLoader.load(
            'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg'
        );
        const bumpTexture = textureLoader.load(
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_normal_2048.jpg'
        );

        const globeMaterial = new THREE.MeshPhongMaterial({
            map: earthTexture,
            bumpMap: bumpTexture,
            bumpScale: 0.05,
            specular: new THREE.Color(0x333333),
            shininess: 15,
        });

        const globe = new THREE.Mesh(globeGeometry, globeMaterial);
        scene.add(globe);
        globeRef.current = globe;

        // Atmosphere glow
        const atmosGeometry = new THREE.SphereGeometry(1.02, 64, 64);
        const atmosMaterial = new THREE.MeshPhongMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.08,
            side: THREE.FrontSide,
        });
        scene.add(new THREE.Mesh(atmosGeometry, atmosMaterial));

        // Lights
        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(5, 3, 5);
        scene.add(sunLight);

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        if (controls) {
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 1.5;
            controls.maxDistance = 5;
            controlsRef.current = controls;
        }

        // Animation loop
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);
            globe.rotation.y += 0.001;
            if (controls) controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Click handler for adding pins
        const handleClick = (e) => {
            const rect = mountRef.current.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / W) * 2 - 1,
                -((e.clientY - rect.top) / H) * 2 + 1
            );
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(globe);
            if (intersects.length > 0) {
                const point = intersects[0].point.clone().normalize();
                const lat = 90 - Math.acos(point.y) * (180 / Math.PI);
                const lng = Math.atan2(point.z, -point.x) * (180 / Math.PI) - 180;
                setClickedLatLng({ lat: lat.toFixed(4), lng: lng.toFixed(4) });
                setNewPin(prev => ({ ...prev, lat: lat.toFixed(4), lng: lng.toFixed(4) }));
                setShowAddPin(true);
            }
        };

        renderer.domElement.addEventListener('click', handleClick);

        // Resize
        const handleResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(frameRef.current);
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('click', handleClick);
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    // Add pins to globe
    useEffect(() => {
        if (!sceneRef.current || !globeRef.current) return;

        // Remove old pin meshes
        pinsRef.current.forEach(p => sceneRef.current.remove(p));
        pinsRef.current = [];

        pins.forEach(pin => {
            const pinType = PIN_TYPES.find(p => p.type === pin.type) || PIN_TYPES[4];
            const color = new THREE.Color(pinType.color);

            // Pin dot
            const dotGeo = new THREE.SphereGeometry(0.02, 16, 16);
            const dotMat = new THREE.MeshBasicMaterial({ color });
            const dot = new THREE.Mesh(dotGeo, dotMat);

            const pos = latLngToVector3(parseFloat(pin.lat), parseFloat(pin.lng), 1.01);
            dot.position.copy(pos);
            sceneRef.current.add(dot);
            pinsRef.current.push(dot);

            // Pulse ring
            const ringGeo = new THREE.RingGeometry(0.025, 0.04, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(pos);
            ring.lookAt(new THREE.Vector3(0, 0, 0));
            sceneRef.current.add(ring);
            pinsRef.current.push(ring);
        });
    }, [pins]);

    const addPin = async () => {
        if (!newPin.title) return toast.error("Title daalo!");
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/universe/add`, {
                ...newPin,
                roomId,
                addedBy: user._id || user.id,
                country: 'Unknown'
            });
            toast.success("Pin add ho gaya! 📍");
            setShowAddPin(false);
            setNewPin({ title: '', description: '', type: 'memory', lat: 0, lng: 0 });
            fetchPins();
            if (socket) socket.emit('universe_pin_added', { roomId });
        } catch (err) {
            toast.error("Pin add nahi hua!");
        }
    };

    const deletePin = async (id) => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/universe/${id}`);
            toast.success("Pin removed!");
            fetchPins();
        } catch (err) { toast.error("Error!"); }
    };

    return (
        <div className="relative w-full min-h-screen bg-[#030014] overflow-hidden">

            {/* Globe Container */}
            <div ref={mountRef} className="w-full h-[70vh] relative" />

            {/* Header */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                <div>
                    <h2 className="text-white font-black text-2xl tracking-tighter">🌍 Our Universe</h2>
                    <p className="text-white/40 text-xs font-bold">Click anywhere on the globe to add a memory</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center">
                        <p className="text-white font-black text-lg">{stats.total}</p>
                        <p className="text-white/40 text-[9px] uppercase font-bold">Pins</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center">
                        <p className="text-white font-black text-lg">{stats.dreams}</p>
                        <p className="text-white/40 text-[9px] uppercase font-bold">Dreams</p>
                    </div>
                </div>
            </div>

            {/* Pin Type Legend */}
            <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
                {PIN_TYPES.map(p => (
                    <div key={p.type} className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }}></div>
                        <span className="text-white/60 text-[10px] font-bold">{p.emoji} {p.label}</span>
                    </div>
                ))}
            </div>

            {/* Pins List */}
            <div className="absolute right-4 top-20 bottom-4 w-64 overflow-y-auto space-y-2 z-10">
                {pins.map(pin => {
                    const pinType = PIN_TYPES.find(p => p.type === pin.type) || PIN_TYPES[4];
                    return (
                        <div key={pin._id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <span>{pinType.emoji}</span>
                                    <div>
                                        <p className="text-white font-black text-xs">{pin.title}</p>
                                        <p className="text-white/40 text-[9px]">{pinType.label}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deletePin(pin._id)}
                                    className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            {pin.description && (
                                <p className="text-white/50 text-[10px] mt-2 italic">{pin.description}</p>
                            )}
                        </div>
                    );
                })}
                {pins.length === 0 && (
                    <div className="text-center text-white/30 text-xs font-bold pt-10 italic">
                        Globe pe click karo<br />pehla pin daalo! 📍
                    </div>
                )}
            </div>

            {/* Add Pin Modal */}
            {showAddPin && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0d0d1a] border border-white/20 rounded-[2.5rem] p-8 w-full max-w-sm mx-4 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-black text-xl">📍 Add Memory Pin</h3>
                            <button onClick={() => setShowAddPin(false)} className="text-white/40 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Title (e.g. First Date 💕)"
                                value={newPin.title}
                                onChange={e => setNewPin(p => ({ ...p, title: e.target.value }))}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 p-4 rounded-2xl outline-none focus:border-rose-500 font-bold text-sm"
                            />

                            <textarea
                                placeholder="Our story here... (optional)"
                                value={newPin.description}
                                onChange={e => setNewPin(p => ({ ...p, description: e.target.value }))}
                                rows={3}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 p-4 rounded-2xl outline-none focus:border-rose-500 font-bold text-sm resize-none"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                {PIN_TYPES.map(pt => (
                                    <button
                                        key={pt.type}
                                        onClick={() => setNewPin(p => ({ ...p, type: pt.type }))}
                                        className={`p-3 rounded-2xl border text-xs font-black transition-all ${newPin.type === pt.type
                                                ? 'border-rose-500 bg-rose-500/20 text-white'
                                                : 'border-white/20 text-white/50 hover:border-white/40'
                                            }`}
                                    >
                                        {pt.emoji} {pt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white/5 rounded-2xl p-3 text-center">
                                <p className="text-white/30 text-[10px] font-bold">
                                    📍 {parseFloat(newPin.lat).toFixed(2)}°, {parseFloat(newPin.lng).toFixed(2)}°
                                </p>
                            </div>

                            <button
                                onClick={addPin}
                                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-rose-500/30"
                            >
                                Lock This Memory 🔒
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
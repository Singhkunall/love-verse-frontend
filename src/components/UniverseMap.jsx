import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, X, Heart, Plane, Star, Moon, Sparkles, MapPin, Search, Compass, Eye, Trash2, Camera, Navigation, Layers, Globe as GlobeIcon, Map } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const PIN_TYPES = [
  { type: 'first_meet', label: 'First Meet', emoji: '❤️', color: '#ff4d6d' },
  { type: 'trip', label: 'Trip Together', emoji: '✈️', color: '#38bdf8' },
  { type: 'milestone', label: 'Milestone', emoji: '💍', color: '#fbbf24' },
  { type: 'dream', label: 'Dream Destination', emoji: '🌙', color: '#a855f7' },
  { type: 'memory', label: 'Special Memory', emoji: '💫', color: '#34d399' },
];

const PRESET_SPOTS = [
  { name: 'Paris, France 🗼', lat: 48.8566, lng: 2.3522 },
  { name: 'Santorini, Greece 🏛️', lat: 36.3932, lng: 25.4615 },
  { name: 'Bali, Indonesia 🌴', lat: -8.4095, lng: 115.1889 },
  { name: 'Kyoto, Japan 🌸', lat: 35.0116, lng: 135.7681 },
  { name: 'Venice, Italy 🚣', lat: 45.4408, lng: 12.3155 },
  { name: 'New York, USA 🏙️', lat: 40.7128, lng: -74.0060 }
];

// Helper to create custom Leaflet marker icons
function createLeafletIcon(emoji) {
  return L.divIcon({
    html: `<div style="font-size: 24px; text-shadow: 0 0 10px rgba(255,255,255,0.8);">${emoji}</div>`,
    className: 'custom-leaflet-pin',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

// Convert lat/lng to 3D coordinates on sphere
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// 3D Curved Arc between two sphere points
function create3DArc(v1, v2, radius) {
  const distance = v1.distanceTo(v2);
  const mid = v1.clone().add(v2).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(radius + distance * 0.25);

  const curve = new THREE.QuadraticBezierCurve3(v1, mid, v2);
  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const material = new THREE.LineBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.6,
    linewidth: 2
  });

  return new THREE.Line(geometry, material);
}

// Component to handle Leaflet flyTo
function LeafletFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 5, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function UniverseMap({ user, roomId, socket }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const globeRef = useRef(null);
  const controlsRef = useRef(null);
  const pinsGroupRef = useRef(new THREE.Group());
  const arcsGroupRef = useRef(new THREE.Group());
  const frameRef = useRef(null);

  // States
  const [pins, setPins] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  // FIX: Default autoRotate is FALSE so globe stays completely STATIONARY!
  const [autoRotate, setAutoRotate] = useState(false);

  // View Mode: '3d' (Globe) or '2d' (Flat Interactive World Map)
  const [viewMode, setViewMode] = useState('3d');
  const [leafletCenter, setLeafletCenter] = useState([20, 0]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // New Pin Form
  const [newPin, setNewPin] = useState({
    title: '',
    description: '',
    type: 'memory',
    lat: 0,
    lng: 0,
    country: '',
    imageUrl: ''
  });

  const [stats, setStats] = useState({ total: 0, countries: 0, dreams: 0 });

  // Fetch Pins from Backend
  const fetchPins = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/universe/${roomId}`);
      setPins(res.data);
      const countriesCount = new Set(res.data.map(p => p.country || 'Unknown')).size;
      const dreamsCount = res.data.filter(p => p.type === 'dream').length;
      setStats({
        total: res.data.length,
        countries: countriesCount,
        dreams: dreamsCount
      });
    } catch (err) {
      console.error("Fetch pins error", err);
    }
  };

  useEffect(() => {
    fetchPins();
    if (socket) {
      socket.on('universe_pin_added', fetchPins);
      return () => socket.off('universe_pin_added');
    }
  }, [roomId]);

  // Three.js 3D Scene Setup (Only when in 3D Mode)
  useEffect(() => {
    if (viewMode !== '3d' || !mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    scene.add(pinsGroupRef.current);
    scene.add(arcsGroupRef.current);

    // Deep Space Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 4000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 1500;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.75
    });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0, 3.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Globe Sphere
    const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
    const textureLoader = new THREE.TextureLoader();

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
      specular: new THREE.Color(0x444444),
      shininess: 25,
    });

    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    globeRef.current = globe;

    // Atmosphere Glow
    const atmosGeometry = new THREE.SphereGeometry(1.03, 64, 64);
    const atmosMaterial = new THREE.MeshPhongMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmosGeometry, atmosMaterial));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.3;
    controls.maxDistance = 5.5;
    controlsRef.current = controls;

    // Animation Loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (globeRef.current && autoRotate) {
        globeRef.current.rotation.y += 0.0012;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Globe Click Handler
    const handleGlobeClick = (e) => {
      if (!mountRef.current || !globeRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / W) * 2 - 1,
        -((e.clientY - rect.top) / H) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(globeRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point.clone().normalize();
        const lat = 90 - Math.acos(point.y) * (180 / Math.PI);
        const lng = Math.atan2(point.z, -point.x) * (180 / Math.PI) - 180;

        setNewPin(prev => ({
          ...prev,
          lat: parseFloat(lat.toFixed(4)),
          lng: parseFloat(lng.toFixed(4))
        }));
        setShowAddModal(true);
        setAutoRotate(false);
      }
    };

    renderer.domElement.addEventListener('click', handleGlobeClick);

    // Resize Handler
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
      renderer.domElement.removeEventListener('click', handleGlobeClick);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [viewMode]);

  // Update Pins & Journey Arcs on 3D Globe
  useEffect(() => {
    if (viewMode !== '3d' || !sceneRef.current) return;

    while (pinsGroupRef.current.children.length > 0) {
      const obj = pinsGroupRef.current.children[0];
      pinsGroupRef.current.remove(obj);
    }
    while (arcsGroupRef.current.children.length > 0) {
      const obj = arcsGroupRef.current.children[0];
      arcsGroupRef.current.remove(obj);
    }

    const filteredPins = activeFilter === 'all' ? pins : pins.filter(p => p.type === activeFilter);
    const pinCoords = [];

    filteredPins.forEach(pin => {
      const pinType = PIN_TYPES.find(p => p.type === pin.type) || PIN_TYPES[4];
      const color = new THREE.Color(pinType.color);

      const pos = latLngToVector3(parseFloat(pin.lat), parseFloat(pin.lng), 1.01);
      pinCoords.push(pos);

      // Sphere Marker
      const sphereGeo = new THREE.SphereGeometry(0.025, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.position.copy(pos);
      pinsGroupRef.current.add(sphereMesh);

      // Light Beacon Beam
      const beamGeo = new THREE.CylinderGeometry(0.003, 0.008, 0.12, 8);
      const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      
      const beamPos = latLngToVector3(parseFloat(pin.lat), parseFloat(pin.lng), 1.06);
      beamMesh.position.copy(beamPos);
      beamMesh.lookAt(new THREE.Vector3(0, 0, 0));
      beamMesh.rotateX(Math.PI / 2);
      pinsGroupRef.current.add(beamMesh);

      // Pulse Ring
      const ringGeo = new THREE.RingGeometry(0.03, 0.045, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
      pinsGroupRef.current.add(ringMesh);
    });

    for (let i = 0; i < pinCoords.length - 1; i++) {
      const arc = create3DArc(pinCoords[i], pinCoords[i + 1], 1.01);
      arcsGroupRef.current.add(arc);
    }
  }, [pins, activeFilter, viewMode]);

  // Focus Camera on 3D Coordinates (Stops auto-rotation)
  const focusOnCoordinates = (lat, lng) => {
    setAutoRotate(false);
    setLeafletCenter([parseFloat(lat), parseFloat(lng)]);

    if (viewMode === '3d' && cameraRef.current && controlsRef.current) {
      const targetPos = latLngToVector3(parseFloat(lat), parseFloat(lng), 2.2);
      const startPos = cameraRef.current.position.clone();
      const duration = 1200;
      const startTime = performance.now();

      const animateCamera = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

        cameraRef.current.position.lerpVectors(startPos, targetPos, easeProgress);
        controlsRef.current.update();

        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        }
      };
      requestAnimationFrame(animateCamera);
    }
  };

  // Search City via OpenStreetMap
  const handleSearchCity = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(res.data.slice(0, 5));
    } catch (err) {
      toast.error("City search failed!");
    }
  };

  const handleSelectSearchResult = (res) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    
    setNewPin(prev => ({
      ...prev,
      title: res.display_name.split(',')[0],
      country: res.display_name.split(',').slice(-1)[0].trim(),
      lat,
      lng
    }));

    focusOnCoordinates(lat, lng);
    setShowAddModal(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSelectPreset = (spot) => {
    setNewPin(prev => ({
      ...prev,
      title: spot.name,
      lat: spot.lat,
      lng: spot.lng
    }));
    focusOnCoordinates(spot.lat, spot.lng);
    setShowAddModal(true);
  };

  // Submit New Pin
  const handleAddPinSubmit = async (e) => {
    e.preventDefault();
    if (!newPin.title) return toast.error("Please enter a memory title!");
    const loadId = toast.loading("Locking Memory in Universe...");

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/universe/add`, {
        ...newPin,
        roomId,
        addedBy: user._id || user.id
      });

      toast.success("Memory Pin Locked in Universe! 🌌", { id: loadId });
      setShowAddModal(false);
      setNewPin({
        title: '',
        description: '',
        type: 'memory',
        lat: 0,
        lng: 0,
        country: '',
        imageUrl: ''
      });
      fetchPins();
      if (socket) socket.emit('universe_pin_added', { roomId });
    } catch (err) {
      toast.error("Pin save failed!", { id: loadId });
    }
  };

  // Delete Pin
  const handleDeletePin = async (id) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/universe/${id}`);
      toast.success("Pin removed!");
      setSelectedPin(null);
      fetchPins();
    } catch (err) {
      toast.error("Delete failed!");
    }
  };

  const filteredPins = activeFilter === 'all' ? pins : pins.filter(p => p.type === activeFilter);

  return (
    <div className="relative w-full h-[88vh] bg-gradient-to-b from-[#030014] via-[#07051e] to-[#02000c] rounded-[3rem] overflow-hidden border border-indigo-900/50 shadow-2xl">
      
      {/* 3D GLOBE / 2D MAP DISPLAY AREA */}
      {viewMode === '3d' ? (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      ) : (
        /* 2D Leaflet World Map Mode */
        <div className="w-full h-full z-0">
          <MapContainer
            center={leafletCenter}
            zoom={3}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ background: '#07051e' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <LeafletFlyTo center={leafletCenter} />
            {filteredPins.map(pin => {
              const pinType = PIN_TYPES.find(p => p.type === pin.type) || PIN_TYPES[4];
              return (
                <Marker
                  key={pin._id}
                  position={[parseFloat(pin.lat), parseFloat(pin.lng)]}
                  icon={createLeafletIcon(pinType.emoji)}
                  eventHandlers={{
                    click: () => setSelectedPin(pin)
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 text-gray-800">
                      <p className="font-black text-xs text-rose-500">{pinType.emoji} {pin.title}</p>
                      <p className="text-[10px] font-bold text-gray-500">{pin.country || 'World'}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* TOP HEADER OVERLAY */}
      <div className="absolute top-6 left-6 right-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-20 pointer-events-none">
        
        <div className="pointer-events-auto bg-black/40 backdrop-blur-2xl p-4 px-6 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-rose-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
            <GlobeIcon size={24} />
          </div>
          <div>
            <h2 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
              Our Universe 🌌
            </h2>
            <p className="text-gray-400 text-xs font-bold">Interactive Couple Memory World Map</p>
          </div>
        </div>

        {/* STATS & MODE SWITCH BADGES */}
        <div className="pointer-events-auto flex items-center gap-3 bg-black/40 backdrop-blur-2xl p-2 px-4 rounded-3xl border border-white/10 shadow-2xl">
          {/* View Mode Toggle Button */}
          <div className="flex bg-white/10 p-1 rounded-2xl border border-white/15">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all ${
                viewMode === '3d' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <GlobeIcon size={14} /> 3D Globe
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all ${
                viewMode === '2d' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Map size={14} /> 2D Map
            </button>
          </div>

          <div className="px-3 py-1.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-center hidden sm:block">
            <p className="text-rose-400 font-black text-base leading-none">{stats.total}</p>
            <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider mt-0.5">Memories</p>
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-center hidden sm:block">
            <p className="text-blue-400 font-black text-base leading-none">{stats.countries}</p>
            <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider mt-0.5">Countries</p>
          </div>
        </div>
      </div>

      {/* SEARCH BAR OVERLAY */}
      <div className="absolute top-28 left-6 z-20 w-72 md:w-80">
        <form onSubmit={handleSearchCity} className="relative">
          <input
            type="text"
            placeholder="Search city (e.g. Paris, Tokyo)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-black/60 backdrop-blur-2xl text-white placeholder-gray-400 font-bold text-xs rounded-2xl border border-white/15 outline-none focus:border-rose-500 transition-all shadow-xl"
          />
          <Search size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
        </form>

        {searchResults.length > 0 && (
          <div className="mt-2 bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl space-y-1 p-1">
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSearchResult(res)}
                className="w-full text-left p-3 hover:bg-rose-500/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 truncate"
              >
                <MapPin size={14} className="text-rose-400 shrink-0" />
                <span className="truncate">{res.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* QUICK PRESET SPOTS (BOTTOM LEFT) */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-wrap gap-2 max-w-md hidden md:flex">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-full mb-1">
          Quick Preset Destinations:
        </span>
        {PRESET_SPOTS.map((spot, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectPreset(spot)}
            className="px-3 py-1.5 bg-black/50 hover:bg-rose-500/30 text-white text-[11px] font-bold rounded-full border border-white/15 backdrop-blur-md transition-all"
          >
            {spot.name}
          </button>
        ))}
      </div>

      {/* FILTER & CONTROL BAR (BOTTOM CENTER) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-2xl p-2 px-4 rounded-full border border-white/15 flex items-center gap-2 shadow-2xl">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === 'all' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          All
        </button>
        {PIN_TYPES.map(p => (
          <button
            key={p.type}
            onClick={() => setActiveFilter(p.type)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilter === p.type ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{p.emoji}</span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
        {viewMode === '3d' && (
          <>
            <div className="w-px h-5 bg-white/20 mx-1" />
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-2 rounded-full transition-all ${
                autoRotate ? 'text-rose-400 bg-rose-500/20' : 'text-gray-400'
              }`}
              title={autoRotate ? "Auto Rotate Active (Click to Pause)" : "Auto Rotate Stationary (Click to Spin)"}
            >
              <Compass size={18} className={autoRotate ? 'animate-spin-slow' : ''} />
            </button>
          </>
        )}
      </div>

      {/* PINS DRAWER SIDEBAR (RIGHT) */}
      <div className="absolute top-28 right-6 bottom-20 w-72 md:w-80 z-20 bg-black/50 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 flex flex-col justify-between shadow-2xl">
        <div>
          <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-white font-black text-sm tracking-wide flex items-center gap-2">
              <Sparkles size={16} className="text-rose-400" /> Pinned Locations
            </h3>
            <span className="text-[10px] font-bold text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
              {filteredPins.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {filteredPins.map(pin => {
              const pinType = PIN_TYPES.find(p => p.type === pin.type) || PIN_TYPES[4];
              return (
                <div
                  key={pin._id}
                  onClick={() => {
                    setSelectedPin(pin);
                    focusOnCoordinates(pin.lat, pin.lng);
                  }}
                  className="bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl p-3 cursor-pointer transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{pinType.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-white font-black text-xs truncate group-hover:text-rose-300 transition-colors">
                          {pin.title}
                        </p>
                        <p className="text-gray-400 text-[10px] font-bold">
                          {pinType.label} • {pin.country || 'Global'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePin(pin._id);
                      }}
                      className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredPins.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-xs font-bold italic space-y-2">
                <MapPin size={28} className="mx-auto text-gray-600" />
                <p>No memory pins here yet.<br />Search a city or click the map to add!</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            setAutoRotate(false);
          }}
          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-black text-xs shadow-lg hover:shadow-rose-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Add New Pin
        </button>
      </div>

      {/* MEMORY SPOTLIGHT MODAL */}
      {selectedPin && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0b081d] border border-white/20 rounded-[2.5rem] p-8 max-w-md w-full text-white shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedPin(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
                {PIN_TYPES.find(p => p.type === selectedPin.type)?.emoji} {selectedPin.type}
              </span>
              <h3 className="text-2xl font-black text-white mt-1">{selectedPin.title}</h3>
              <p className="text-xs text-gray-400 font-bold flex items-center gap-1">
                <MapPin size={12} className="text-rose-400" /> {selectedPin.lat}°, {selectedPin.lng}° • {selectedPin.country || 'World'}
              </p>
            </div>

            {selectedPin.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/15 max-h-48">
                <img src={selectedPin.imageUrl} alt={selectedPin.title} className="w-full h-full object-cover" />
              </div>
            )}

            {selectedPin.description && (
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 font-serif italic text-sm text-gray-200 leading-relaxed">
                "{selectedPin.description}"
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => handleDeletePin(selectedPin._id)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Remove Pin
              </button>
              <button
                onClick={() => setSelectedPin(null)}
                className="px-6 py-2.5 bg-white text-gray-900 rounded-xl font-black text-xs shadow-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PIN MODAL */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in zoom-in-95">
          <div className="bg-[#0b081d] border border-white/20 rounded-[2.5rem] p-8 max-w-md w-full text-white shadow-2xl relative space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                📍 Lock Memory Pin
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 bg-white/10 rounded-full text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPinSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Memory Title</label>
                <input
                  type="text"
                  placeholder="e.g. First Kiss, Eiffel Tower Date..."
                  value={newPin.title}
                  onChange={(e) => setNewPin({ ...newPin, title: e.target.value })}
                  className="w-full p-4 bg-white/5 border border-white/15 text-white placeholder-gray-500 font-bold text-sm rounded-2xl outline-none focus:border-rose-500 mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Pin Category</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {PIN_TYPES.map(pt => (
                    <button
                      type="button"
                      key={pt.type}
                      onClick={() => setNewPin({ ...newPin, type: pt.type })}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                        newPin.type === pt.type
                          ? 'bg-rose-500 border-rose-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>{pt.emoji}</span>
                      <span>{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Romantic Story / Memory Note</label>
                <textarea
                  placeholder="Write a sweet note about this spot..."
                  value={newPin.description}
                  onChange={(e) => setNewPin({ ...newPin, description: e.target.value })}
                  rows={2}
                  className="w-full p-4 bg-white/5 border border-white/15 text-white placeholder-gray-500 font-bold text-sm rounded-2xl outline-none focus:border-rose-500 mt-1 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Photo Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newPin.imageUrl}
                  onChange={(e) => setNewPin({ ...newPin, imageUrl: e.target.value })}
                  className="w-full p-3.5 bg-white/5 border border-white/15 text-white placeholder-gray-500 font-bold text-xs rounded-2xl outline-none focus:border-rose-500 mt-1"
                />
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center text-xs font-bold text-gray-300">
                <span>Coordinates:</span>
                <span className="text-rose-400 font-mono">{newPin.lat}°, {newPin.lng}°</span>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-2xl font-black text-xs shadow-lg hover:shadow-rose-500/30 hover:scale-[1.02] transition-all"
              >
                Lock Memory in Our Universe 🔒
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Compass, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

interface PanoramaViewerProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ imageUrl, isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationRef = useRef<number | null>(null);
  const radius = 500;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [fov, setFov] = useState(75);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  const lastPositionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const momentumRef = useRef<number | null>(null);

  // 灵敏度配置
  const SENSITIVITY = 0.15;
  // 惯性衰减系数 (越大停止越快)
  const FRICTION = 0.92;
  // 最小速度阈值
  const MIN_VELOCITY = 0.1;

  // 惯性滑动动画
  const applyMomentum = useCallback(() => {
    if (Math.abs(velocityRef.current.x) < MIN_VELOCITY && Math.abs(velocityRef.current.y) < MIN_VELOCITY) {
      momentumRef.current = null;
      return;
    }

    setYaw(prev => (prev + velocityRef.current.x + 360) % 360);
    setPitch(prev => Math.max(-85, Math.min(85, prev + velocityRef.current.y)));

    velocityRef.current.x *= FRICTION;
    velocityRef.current.y *= FRICTION;

    momentumRef.current = requestAnimationFrame(applyMomentum);
  }, []);

  // Update camera direction
  const updateCameraDirection = useCallback((y: number, p: number) => {
    if (!cameraRef.current) return;

    const yawRad = y * Math.PI / 180;
    const pitchRad = p * Math.PI / 180;

    const lookAtX = radius * Math.cos(pitchRad) * Math.sin(yawRad);
    const lookAtY = radius * Math.sin(pitchRad);
    const lookAtZ = radius * Math.cos(pitchRad) * Math.cos(yawRad);

    cameraRef.current.lookAt(lookAtX, lookAtY, lookAtZ);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 2000);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Sphere geometry
    const geometry = new THREE.SphereGeometry(radius, 128, 128);

    // Material
    const material = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.BackSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Load texture
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        material.map = texture;
        material.color.setHex(0xffffff);
        material.needsUpdate = true;
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.error('Texture load error:', err);
        setError('图片加载失败');
        setIsLoading(false);
      }
    );

    // Initial camera direction
    updateCameraDirection(0, 0);

    // Animation loop
    let animating = true;
    function animate() {
      if (!animating) return;
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      animating = false;
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [isOpen, imageUrl, updateCameraDirection]);

  // Update camera FOV
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [fov]);

  // Update camera rotation
  useEffect(() => {
    if (!isOpen) return;
    updateCameraDirection(yaw, pitch);
  }, [yaw, pitch, isOpen, updateCameraDirection]);

  // Hide help after first interaction
  useEffect(() => {
    if (isDragging || autoRotate) {
      setShowHelp(false);
    }
  }, [isDragging, autoRotate]);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || !isOpen) return;

    const interval = setInterval(() => {
      setYaw(prev => (prev + 0.2) % 360);
    }, 16);

    return () => clearInterval(interval);
  }, [autoRotate, isOpen]);

  // 清理惯性动画
  useEffect(() => {
    return () => {
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
      }
    };
  }, []);

  // Mouse wheel zoom - using native event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 10 : -10;
      setFov(prev => Math.max(30, Math.min(120, prev + delta)));
      setShowHelp(false);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Mouse controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 停止惯性滑动
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
    setIsDragging(true);
    setAutoRotate(false);
    lastPositionRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
    setShowHelp(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastPositionRef.current.x;
    const deltaY = e.clientY - lastPositionRef.current.y;

    // 更新速度（用于惯性）- 拖拽方向与视角一致
    velocityRef.current = {
      x: deltaX * SENSITIVITY,
      y: deltaY * SENSITIVITY
    };

    setYaw(prev => (prev + velocityRef.current.x + 360) % 360);
    setPitch(prev => Math.max(-85, Math.min(85, prev + velocityRef.current.y)));
    lastPositionRef.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // 开始惯性滑动
    if (Math.abs(velocityRef.current.x) > MIN_VELOCITY || Math.abs(velocityRef.current.y) > MIN_VELOCITY) {
      momentumRef.current = requestAnimationFrame(applyMomentum);
    }
  }, [applyMomentum]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // 开始惯性滑动
      if (Math.abs(velocityRef.current.x) > MIN_VELOCITY || Math.abs(velocityRef.current.y) > MIN_VELOCITY) {
        momentumRef.current = requestAnimationFrame(applyMomentum);
      }
    }
  }, [isDragging, applyMomentum]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 停止惯性滑动
      if (momentumRef.current) {
        cancelAnimationFrame(momentumRef.current);
        momentumRef.current = null;
      }
      setIsDragging(true);
      setAutoRotate(false);
      lastPositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      velocityRef.current = { x: 0, y: 0 };
      setShowHelp(false);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - lastPositionRef.current.x;
    const deltaY = e.touches[0].clientY - lastPositionRef.current.y;

    // 更新速度（用于惯性）- 拖拽方向与视角一致
    velocityRef.current = {
      x: deltaX * SENSITIVITY,
      y: deltaY * SENSITIVITY
    };

    setYaw(prev => (prev + velocityRef.current.x + 360) % 360);
    setPitch(prev => Math.max(-85, Math.min(85, prev + velocityRef.current.y)));
    lastPositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    // 开始惯性滑动
    if (Math.abs(velocityRef.current.x) > MIN_VELOCITY || Math.abs(velocityRef.current.y) > MIN_VELOCITY) {
      momentumRef.current = requestAnimationFrame(applyMomentum);
    }
  }, [applyMomentum]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 5;
      switch (e.key) {
        case 'ArrowLeft':
          setYaw(prev => (prev + step) % 360);
          setAutoRotate(false);
          setShowHelp(false);
          break;
        case 'ArrowRight':
          setYaw(prev => (prev - step + 360) % 360);
          setAutoRotate(false);
          setShowHelp(false);
          break;
        case 'ArrowUp':
          setPitch(prev => Math.max(-85, prev - step));
          setAutoRotate(false);
          setShowHelp(false);
          break;
        case 'ArrowDown':
          setPitch(prev => Math.min(85, prev + step));
          setAutoRotate(false);
          setShowHelp(false);
          break;
        case '+':
        case '=':
          setFov(prev => Math.max(30, prev - 5));
          setShowHelp(false);
          break;
        case '-':
          setFov(prev => Math.min(120, prev + 5));
          setShowHelp(false);
          break;
        case ' ':
          e.preventDefault();
          setAutoRotate(prev => !prev);
          setShowHelp(false);
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleReset = () => {
    setYaw(0);
    setPitch(0);
    setFov(75);
    setAutoRotate(false);
  };

  // Compass direction
  const getCompassDirection = (angle: number) => {
    const directions = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE', 'E'];
    const index = Math.round(((angle % 360) + 360) % 360 / 45) % 8;
    return directions[index];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-6">
              <div className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full">
                <span className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  360° 全景查看
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 text-sm font-mono">
                <span>方位: {yaw.toFixed(0)}°</span>
                <span>俯仰: {pitch.toFixed(0)}°</span>
                <span className="text-indigo-400 font-bold text-lg">{getCompassDirection(yaw)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Three.js Canvas Container */}
          <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden bg-black"
            style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">加载全景图中...</p>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="flex flex-col items-center gap-4 text-center px-4">
                  <p className="text-red-400">{error}</p>
                  <p className="text-slate-500 text-sm">请确保图片是有效的全景图格式</p>
                </div>
              </div>
            )}

            {/* Center crosshair */}
            {!isLoading && !error && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative">
                  <div className="w-12 h-12 border border-white/20 rounded-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/50 rounded-full" />
                </div>
              </div>
            )}

            {/* Help hint */}
            {showHelp && !isDragging && !autoRotate && !isLoading && !error && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full animate-pulse">
                <span className="text-white/60 text-sm">
                  拖拽旋转 · 滚轮缩放 · 空格自动旋转
                </span>
              </div>
            )}

            {/* Compass */}
            {!isLoading && !error && (
              <div className="absolute top-20 right-4 w-16 h-16 bg-black/50 rounded-full border border-white/20 flex items-center justify-center">
                <div
                  className="relative w-full h-full transition-transform duration-100"
                  style={{ transform: `rotate(${yaw}deg)` }}
                >
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white" />
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/60 font-bold">N</span>
                </div>
              </div>
            )}

            {/* FOV indicator */}
            {!isLoading && !error && (
              <div className="absolute bottom-28 right-4 px-3 py-1.5 bg-black/50 rounded-full border border-white/20">
                <span className="text-white/70 text-xs font-mono">{fov}°</span>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-3 p-4 bg-gradient-to-t from-black/80 to-transparent">
            {/* Zoom (FOV) controls */}
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              <button
                onClick={() => setFov(prev => Math.min(120, prev + 10))}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="缩小"
              >
                <ZoomOut className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setFov(prev => Math.max(30, prev - 10))}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="放大"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Auto rotate */}
            <button
              onClick={() => {
                setAutoRotate(prev => !prev);
                setShowHelp(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                autoRotate
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {autoRotate ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span className="text-sm">{autoRotate ? '暂停' : '自动旋转'}</span>
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-white/80" />
              <span className="text-white/80 text-sm">重置</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PanoramaViewer;

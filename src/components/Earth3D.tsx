import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ObservationStation, LatLon } from '../types';
import { OBSERVATION_STATIONS, UMBRA_PATH_WAYPOINTS } from '../data/eclipseData';
import { getUmbraPosition, getSubSolarPoint, latLonToVector3 } from '../utils/astronomy';
import { createRealisticStarField } from '../data/starCatalog';
import { createSkyMaterial } from './SkyShaders';
import {
  EARTH_VERTEX_SHADER,
  EARTH_FRAGMENT_SHADER,
  ATMOSPHERE_VERTEX_SHADER,
  ATMOSPHERE_FRAGMENT_SHADER,
} from './EarthShaders';
import {
  MOON_VERTEX_SHADER,
  MOON_FRAGMENT_SHADER,
  CORONA_VERTEX_SHADER,
  CORONA_FRAGMENT_SHADER,
} from './MoonShaders';
import {
  SUN_VERTEX_SHADER,
  SUN_FRAGMENT_SHADER,
  SUN_CORONA_VERTEX_SHADER,
  SUN_CORONA_FRAGMENT_SHADER,
} from './SunShaders';
import { Camera, Check, ChevronDown, Cloud, Compass, Eye, EyeOff, Globe, Layers, Moon, Share2, Sliders, Sparkles, Star, Sun } from 'lucide-react';

interface Earth3DProps {
  currentTimestamp: number;
  selectedStation: ObservationStation | null;
  onSelectStation: (station: ObservationStation) => void;
  cameraMode: 'free' | 'follow-shadow' | 'focused-station' | 'top-down' | 'spain-fixed' | 'polar' | 'iss' | 'concorde' | 'lunar-surface';
  showPathLine: boolean;
  showPenumbra: boolean;
  showDayNightTerminator: boolean;
  showCelestialIcons?: boolean;
  umbraOpacity?: number;
  onCameraModeChange: (mode: 'free' | 'follow-shadow' | 'focused-station' | 'top-down' | 'spain-fixed' | 'polar' | 'iss' | 'concorde' | 'lunar-surface') => void;
  onDropCustomPin: (coords: LatLon) => void;
  onTogglePathLine?: () => void;
  onTogglePenumbra?: () => void;
  onToggleTerminator?: () => void;
  onToggleCelestialIcons?: () => void;
  cameraResetTrigger?: number;
  onUserInteract?: () => void;
  /** Callback that exposes the renderer canvas for external recorders */
  onRendererReady?: (canvas: HTMLCanvasElement) => void;
}

const EARTH_RADIUS = 100;

// Module-level texture cache for celestial badges
const celestialTextureCache: Record<string, THREE.CanvasTexture> = {};

const getCelestialTexture = (type: 'sun_surface' | 'moon_surface' | 'sun_sky' | 'moon_sky'): THREE.CanvasTexture => {
  if (celestialTextureCache[type]) return celestialTextureCache[type];

  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 384, 192);

  const isSun = type.startsWith('sun');
  const isSurface = type.endsWith('surface');

  const centerX = 192;
  const centerY = 55;
  const radius = isSurface ? 36 : 28;

  const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius * 2.5);
  if (isSun) {
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(251, 191, 36, 0.95)');
    grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.35)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.9)');
    grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.35)');
    grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = isSun ? '#fffbeb' : '#0f172a';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = isSun ? '#f59e0b' : '#38bdf8';
  ctx.stroke();

  ctx.font = `${isSurface ? 32 : 24}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isSun ? '☀️' : '🌑', centerX, centerY + 2);

  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = isSun ? '#fde047' : '#7dd3fc';

  let label = '';
  if (type === 'sun_surface') label = 'SUN (SUB-SOLAR)';
  else if (type === 'moon_surface') label = 'MOON (UMBRA)';
  else if (type === 'sun_sky') label = 'SUN DIRECTION';
  else if (type === 'moon_sky') label = 'MOON DIRECTION';

  ctx.fillText(label, centerX, centerY + radius * 1.6);

  const texture = new THREE.CanvasTexture(canvas);
  celestialTextureCache[type] = texture;
  return texture;
};

// Generate great-circle arc points between two coordinates on the globe
const generateGreatCircleArc = (coord1: LatLon, coord2: LatLon, radius: number, segments = 40): THREE.Vector3[] => {
  const v1 = new THREE.Vector3(...latLonToVector3(coord1.lat, coord1.lon, 1)).normalize();
  const v2 = new THREE.Vector3(...latLonToVector3(coord2.lat, coord2.lon, 1)).normalize();

  const dot = Math.min(1, Math.max(-1, v1.dot(v2)));
  const omega = Math.acos(dot);
  const points: THREE.Vector3[] = [];

  if (omega < 0.0001) {
    points.push(v1.clone().multiplyScalar(radius));
    points.push(v2.clone().multiplyScalar(radius));
    return points;
  }

  const sinOmega = Math.sin(omega);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    const pt = new THREE.Vector3()
      .addScaledVector(v1, a)
      .addScaledVector(v2, b)
      .multiplyScalar(radius);
    points.push(pt);
  }
  return points;
};

export const Earth3D: React.FC<Earth3DProps> = ({
  currentTimestamp,
  selectedStation,
  onSelectStation,
  cameraMode,
  showPathLine,
  showPenumbra,
  showDayNightTerminator,
  showCelestialIcons = false,
  umbraOpacity = 0.90,
  onCameraModeChange,
  onDropCustomPin,
  onTogglePathLine,
  onTogglePenumbra,
  onToggleTerminator,
  onToggleCelestialIcons,
  cameraResetTrigger = 0,
  onUserInteract,
  onRendererReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic Scene Elements
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const coronaMeshRef = useRef<THREE.Mesh | null>(null);
  const sunInnerCoronaRef = useRef<THREE.Mesh | null>(null);
  const sunOuterCoronaRef = useRef<THREE.Mesh | null>(null);
  const shadowConesGroupRef = useRef<THREE.Group | null>(null);
  const pathLineRef = useRef<THREE.Line | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const stationMarkersRef = useRef<THREE.Group | null>(null);
  const celestialIconsRef = useRef<THREE.Group | null>(null);
  const auroraRef = useRef<THREE.Mesh | null>(null);

  // Raycaster for click interaction
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Target camera position for animation
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const userCameraOverrideRef = useRef<boolean>(false);
  const onCameraModeChangeRef = useRef(onCameraModeChange);
  const onTogglePathLineRef = useRef(onTogglePathLine);
  const onTogglePenumbraRef = useRef(onTogglePenumbra);
  const onToggleTerminatorRef = useRef(onToggleTerminator);
  const onToggleCelestialIconsRef = useRef(onToggleCelestialIcons);
  const onUserInteractRef = useRef(onUserInteract);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showIndigoFilter, setShowIndigoFilter] = useState(true);
  const [showStarCatalog, setShowStarCatalog] = useState(true);
  const [show3DMoon, setShow3DMoon] = useState(true);
  const [show3DSun, setShow3DSun] = useState(true);
  const [show3DClouds, setShow3DClouds] = useState(true);
  const [showShadowCones, setShowShadowCones] = useState(true);
  const starFieldGroupRef = useRef<THREE.Group | null>(null);
  const updateStarfieldRef = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    onCameraModeChangeRef.current = onCameraModeChange;
    onTogglePathLineRef.current = onTogglePathLine;
    onTogglePenumbraRef.current = onTogglePenumbra;
    onToggleTerminatorRef.current = onToggleTerminator;
    onToggleCelestialIconsRef.current = onToggleCelestialIcons;
    onUserInteractRef.current = onUserInteract;
  }, [onCameraModeChange, onTogglePathLine, onTogglePenumbra, onToggleTerminator, onToggleCelestialIcons, onUserInteract]);

  // Reset user override when cameraResetTrigger fires
  useEffect(() => {
    userCameraOverrideRef.current = false;
  }, [cameraResetTrigger]);

  // Generate fallback Day Earth texture
  const generateFallbackDayTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Ocean base
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#0a192f');
    grad.addColorStop(0.5, '#0e2b4c');
    grad.addColorStop(1, '#0a192f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 1024; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }
    for (let x = 0; x <= 2048; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }

    // Continents approximations
    ctx.fillStyle = 'rgba(230, 245, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(800, 180, 250, 120, -0.2, 0, Math.PI * 2); // Greenland area
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(960, 210, 35, 25, 0, 0, Math.PI * 2); // Iceland
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(1000, 360, 90, 60, 0.1, 0, Math.PI * 2); // Spain & Iberian Peninsula
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  // Generate fallback Night Earth lights texture
  const generateFallbackNightTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Dark deep ocean
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, 2048, 1024);

    // Glowing city clusters
    ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 1024;
      const r = Math.random() * 2.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  // Generate fallback water texture (white for ocean, black for land approximation)
  const generateFallbackWaterTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff'; // ocean default
    ctx.fillRect(0, 0, 512, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  // Generate fallback Moon crater surface texture (photorealistic regolith & maria)
  const generateFallbackMoonTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Gray basaltic lunar surface base
    ctx.fillStyle = '#8a8f98';
    ctx.fillRect(0, 0, 1024, 512);

    // Dark lunar maria (basalt plains: Oceanus Procellarum, Mare Imbrium, etc.)
    ctx.fillStyle = '#545860';
    ctx.beginPath();
    ctx.ellipse(350, 200, 180, 100, 0.2, 0, Math.PI * 2);
    ctx.ellipse(600, 280, 140, 90, -0.3, 0, Math.PI * 2);
    ctx.ellipse(250, 320, 110, 80, 0.1, 0, Math.PI * 2);
    ctx.ellipse(750, 210, 90, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fine, subtle regolith noise stippling (NO cartoon black stroke rings!)
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const gray = Math.floor(Math.random() * 40 + 130);
      ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.25)`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  // Generate photorealistic fallback 3D Sun Photosphere surface texture
  const generateFallbackSunTexture = useCallback(() => {
    const W = 2048, H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 1. Base photosphere gradient: white-gold core → amber → deep orange edge
    const baseGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.65);
    baseGrad.addColorStop(0.00, '#fffef0');
    baseGrad.addColorStop(0.25, '#fff5c0');
    baseGrad.addColorStop(0.55, '#fbbf24');
    baseGrad.addColorStop(0.80, '#f97316');
    baseGrad.addColorStop(1.00, '#c2410c');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Convective granulation cells (small bright polygons with dark lanes)
    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    };
    const r = rng(42);
    // Granule bright cores
    for (let i = 0; i < 2800; i++) {
      const x = r() * W, y = r() * H;
      const size = r() * 14 + 5;
      const brightness = Math.floor(r() * 30 + 225);
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      g.addColorStop(0, `rgba(${brightness}, ${Math.floor(brightness * 0.9)}, ${Math.floor(brightness * 0.6)}, 0.28)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Granule dark intergranular lanes
    for (let i = 0; i < 1400; i++) {
      const x = r() * W, y = r() * H;
      ctx.fillStyle = 'rgba(80, 30, 0, 0.10)';
      ctx.fillRect(x - 1.5, y - r() * 20, 2.5, r() * 20 + 4);
    }

    // 3. Sunspot groups — umbra (near-black core) + penumbra (dark filament ring)
    const spots = [
      { cx: W * 0.38, cy: H * 0.44, ru: 18, rp: 42 },
      { cx: W * 0.42, cy: H * 0.42, ru: 12, rp: 28 },
      { cx: W * 0.65, cy: H * 0.53, ru: 22, rp: 50 },
      { cx: W * 0.68, cy: H * 0.50, ru: 14, rp: 34 },
      { cx: W * 0.23, cy: H * 0.57, ru: 16, rp: 36 },
      { cx: W * 0.55, cy: H * 0.38, ru: 10, rp: 24 },
    ];
    spots.forEach(({ cx, cy, ru, rp }) => {
      // Penumbra filament ring (dark radial fibrils)
      const pg = ctx.createRadialGradient(cx, cy, ru, cx, cy, rp * 1.1);
      pg.addColorStop(0,   'rgba(60, 25, 5, 0.82)');
      pg.addColorStop(0.6, 'rgba(100, 50, 15, 0.60)');
      pg.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(cx, cy, rp * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Umbra (pitch-black magnetic flux core)
      const ug = ctx.createRadialGradient(cx, cy, 0, cx, cy, ru);
      ug.addColorStop(0,   'rgba(8, 4, 2, 0.98)');
      ug.addColorStop(0.7, 'rgba(25, 10, 4, 0.90)');
      ug.addColorStop(1,   'rgba(60, 25, 5, 0.50)');
      ctx.fillStyle = ug;
      ctx.beginPath();
      ctx.arc(cx, cy, ru, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Faculae — bright patches flanking sunspots and near limb
    for (let i = 0; i < 120; i++) {
      const x = r() * W, y = r() * H;
      const sz = r() * 30 + 10;
      const fg = ctx.createRadialGradient(x, y, 0, x, y, sz);
      fg.addColorStop(0, 'rgba(255, 255, 220, 0.18)');
      fg.addColorStop(1, 'rgba(255, 255, 220, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Limb darkening overlay — radial darkening toward the equatorial edges
    const ldGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.55);
    ldGrad.addColorStop(0,   'rgba(0, 0, 0, 0)');
    ldGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.08)');
    ldGrad.addColorStop(1,   'rgba(20, 8, 0, 0.45)');
    ctx.fillStyle = ldGrad;
    ctx.fillRect(0, 0, W, H);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);


  // Generate 2D Radial Solar Corona Sprite Texture (Camera-Facing Flare Aura)
  const generateSolarCoronaSpriteTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const cx = 256;
    const cy = 256;

    // Fiery golden-white plasma radial gradient
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 250);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.22, 'rgba(254, 240, 138, 0.92)');
    grad.addColorStop(0.48, 'rgba(245, 158, 11, 0.55)');
    grad.addColorStop(0.75, 'rgba(239, 68, 68, 0.20)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 250, 0, Math.PI * 2);
    ctx.fill();

    // Radial coronal streamer rays
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.18)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const len = 140 + Math.random() * 100;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 50, cy + Math.sin(angle) * 50);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Generate fallback clouds texture (smooth atmospheric cloud bands, NO hard circle bubbles!)
  const generateFallbackCloudsTexture = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 1024, 512);

    // Smooth soft atmospheric cloud bands with radial gradients
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 120 + 40;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background, sky dome renders on top
    sceneRef.current = scene;

    // Physical Sky Dome (Atmospheric Scattering)
    const skyGeo = new THREE.SphereGeometry(4800, 32, 15);
    const skyMat = createSkyMaterial();
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);
    skyMatRef.current = skyMat;

    // Realistic Depth-Mapped Star Catalog & Interstellar Celestial Field
    const { starGroup, updateStarfield } = createRealisticStarField(scene);
    starFieldGroupRef.current = starGroup;
    updateStarfieldRef.current = updateStarfield;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(0, 80, 310);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.35;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    // Expose canvas to parent for external recording
    if (onRendererReady) onRendererReady(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 120;
    controls.maxDistance = 1000;

    const domEl = renderer.domElement;

    // Drag detection: only drag (pointer move with button down) triggers userCameraOverride.
    // Zoom (wheel) intentionally does NOT trigger userCameraOverride so auto-tracking continues at custom zoom level.
    let pointerDownPos = { x: 0, y: 0 };
    let isPointerDown = false;

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 16) {
        // Drag threshold reached: user is actively orbiting/rotating the globe
        isDraggingRef.current = true;
        userCameraOverrideRef.current = true;
        targetCamPosRef.current = null;
        onUserInteractRef.current?.();
      }
    };

    const onPointerUp = () => {
      isPointerDown = false;
      isDraggingRef.current = false;
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.2);
    sunLight.position.set(500, 150, 300);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 1. Scientifically Accurate Custom Earth Shader (Day/Night texture blending + 3D Elliptical Lunar Shadow)
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96);
    const fallbackDay = generateFallbackDayTexture();
    const fallbackNight = generateFallbackNightTexture();
    const fallbackWater = generateFallbackWaterTexture();

    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        u_day_texture: { value: fallbackDay },
        u_night_texture: { value: fallbackNight },
        u_water_texture: { value: fallbackWater },
        u_sun_pos: { value: new THREE.Vector3(1, 0, 0) },
        u_umbra_pos: { value: new THREE.Vector3(0, 1, 0) },
        u_has_umbra: { value: 1.0 },
        u_show_penumbra: { value: 1.0 },
        u_show_terminator: { value: 1.0 },
        u_umbra_opacity: { value: umbraOpacity },
        u_indigo_tint_strength: { value: 1.0 },
        u_contrast: { value: 1.15 },
        u_brightness: { value: 0.70 },
        u_gamma: { value: 0.30 },
        u_saturation: { value: 0.95 },
        u_night_brightness: { value: 1.60 },
        u_ocean_specular: { value: 0.15 },
        u_terminator_glow: { value: 0.10 },
        u_umbra_ring_glow: { value: 0.00 }
      },
      vertexShader: EARTH_VERTEX_SHADER,
      fragmentShader: EARTH_FRAGMENT_SHADER,
    });

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Asynchronously load local high-res NASA Blue Marble, Earth at Night & Specular Water maps
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    
    textureLoader.load(
      '/textures/earth-blue-marble.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        earthMat.uniforms.u_day_texture.value = tex;
        earthMat.needsUpdate = true;
      }
    );

    textureLoader.load(
      '/textures/earth-night.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        earthMat.uniforms.u_night_texture.value = tex;
        earthMat.needsUpdate = true;
      }
    );

    textureLoader.load(
      '/textures/earth-water.png',
      (tex) => {
        tex.anisotropy = maxAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        earthMat.uniforms.u_water_texture.value = tex;
        earthMat.needsUpdate = true;
      }
    );

    // 2. Atmosphere Glow Halo (soft atmospheric white-blue)
    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.016, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        u_umbra_pos: { value: new THREE.Vector3(0, 1, 0) },
        u_sun_pos: { value: new THREE.Vector3(1, 0, 0) },
        u_has_umbra: { value: 0.0 }
      },
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // 2b. 3D Clouds Sphere Layer (Rotating Atmospheric Clouds)
    const cloudsGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.007, 64, 64);
    const fallbackClouds = generateFallbackCloudsTexture();
    const cloudsMat = new THREE.MeshBasicMaterial({
      map: fallbackClouds,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    textureLoader.load(
      '/textures/fair_clouds_4k.png',
      (tex) => {
        tex.anisotropy = maxAniso;
        cloudsMat.map = tex;
        cloudsMat.needsUpdate = true;
      }
    );

    // 2c. Photorealistic 3D Moon Object in Space
    const moonGeo = new THREE.SphereGeometry(18.0, 256, 256); // High-res lunar sphere for procedural limb (Baily's Beads)
    const fallbackMoon = generateFallbackMoonTexture();
    const moonMat = new THREE.ShaderMaterial({
      uniforms: {
        u_moon_texture: { value: fallbackMoon },
        u_sun_pos: { value: new THREE.Vector3(1, 0, 0) }
      },
      vertexShader: MOON_VERTEX_SHADER,
      fragmentShader: MOON_FRAGMENT_SHADER
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;

    textureLoader.load(
      '/textures/moon.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        moonMat.uniforms.u_moon_texture.value = tex;
        moonMat.needsUpdate = true;
      }
    );

    // 2d. Photorealistic 3D Sun Globe — enlarged, high-tessellation sphere
    const SUN_R = 72.0; // Solar radius in scene units
    const sunGeo = new THREE.SphereGeometry(SUN_R, 96, 96);
    const fallbackSun = generateFallbackSunTexture();
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        u_sun_texture: { value: fallbackSun },
        u_time: { value: 0.0 }
      },
      vertexShader: SUN_VERTEX_SHADER,
      fragmentShader: SUN_FRAGMENT_SHADER
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    textureLoader.load(
      '/textures/sun.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        sunMat.uniforms.u_sun_texture.value = tex;
        sunMat.needsUpdate = true;
      }
    );

    // 2d-ii. Inner Corona (chromosphere / transition region) — 1.18× Sun radius
    const innerCoronaGeo = new THREE.SphereGeometry(SUN_R * 1.18, 64, 64);
    const innerCoronaMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_corona_radius: { value: 0.0 }   // 0 = inner
      },
      vertexShader: SUN_CORONA_VERTEX_SHADER,
      fragmentShader: SUN_CORONA_FRAGMENT_SHADER,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const innerCorona = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
    sunMesh.add(innerCorona);
    sunInnerCoronaRef.current = innerCorona;
    coronaMeshRef.current = innerCorona;  // backward compat

    // 2d-iii. Outer Corona (K-corona + F-corona) — 2.4× Sun radius
    const outerCoronaGeo = new THREE.SphereGeometry(SUN_R * 2.4, 64, 64);
    const outerCoronaMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_corona_radius: { value: 1.0 }   // 1 = outer
      },
      vertexShader: SUN_CORONA_VERTEX_SHADER,
      fragmentShader: SUN_CORONA_FRAGMENT_SHADER,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const outerCorona = new THREE.Mesh(outerCoronaGeo, outerCoronaMat);
    sunMesh.add(outerCorona);
    sunOuterCoronaRef.current = outerCorona;

    // 2d-iv. Soft radial sprite halo (far-field glow, kept for atmosphere integration)
    const coronaTexture = generateSolarCoronaSpriteTexture();
    const coronaSpriteMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55
    });
    const coronaSprite = new THREE.Sprite(coronaSpriteMat);
    coronaSprite.scale.set(420.0, 420.0, 1.0);
    sunMesh.add(coronaSprite);

    // 2e. 3D Volumetric Umbral & Penumbral Shadow Cones Group
    const shadowConesGroup = new THREE.Group();
    scene.add(shadowConesGroup);
    shadowConesGroupRef.current = shadowConesGroup;

    // 2f. Aurora Borealis — animated shader ring at 60–72° N latitude band
    // Rendered as a transparent partial sphere cap using BackSide ShaderMaterial
    const auroraGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const auroraMat = new THREE.ShaderMaterial({
      uniforms: { u_time: { value: 0.0 }, u_intensity: { value: 0.0 } },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform float u_intensity;
        varying vec2 vUv;
        varying vec3 vPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                     mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise(p); a *= 0.5; p *= 2.1; }
          return v;
        }

        void main() {
          // Only render the northern polar cap (top ~35% of sphere = y > 0.6)
          float yNorm = (vPos.y / 101.2 + 1.0) * 0.5;
          if (yNorm < 0.60) discard;

          // Vertical bands — aurora curtains
          float lon = atan(vPos.z, vPos.x);
          float lat = yNorm;

          float t = u_time * 0.4;
          float curtain = fbm(vec2(lon * 3.5 + t * 0.25, lat * 8.0 + t * 0.15));
          curtain = pow(curtain, 1.6);

          // Aurora color: green dominant, teal edges, magenta tops
          float greenBand = smoothstep(0.60, 0.70, lat) * (1.0 - smoothstep(0.72, 0.82, lat));
          float magentaBand = smoothstep(0.72, 0.80, lat) * (1.0 - smoothstep(0.85, 0.95, lat));

          vec3 green   = vec3(0.05, 0.95, 0.35);
          vec3 teal    = vec3(0.05, 0.80, 0.75);
          vec3 magenta = vec3(0.80, 0.15, 0.80);

          vec3 col = mix(teal, green, greenBand) + magenta * magentaBand * 0.6;
          col *= curtain;

          float alpha = curtain * u_intensity * mix(0.0, 0.75, greenBand + magentaBand * 0.5);
          alpha = clamp(alpha, 0.0, 0.72);

          gl_FragColor = vec4(col, alpha);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    // Tilt aurora cap toward north pole
    const auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    auroraMesh.rotation.x = -Math.PI / 2; // flip to north pole
    scene.add(auroraMesh);
    auroraRef.current = auroraMesh;
    auroraMesh.visible = false; // only shown at high-latitude stations


    // 3. Path of Totality Line (Semantic Solar Gold / Amber accent line)
    // Sample the 3D Geodesic Slerp astronomical trajectory every 15 seconds for a mathematically pristine curve on the sphere
    const curvePoints: THREE.Vector3[] = [];
    for (let t = 61200; t <= 66720; t += 15) {
      const pos = getUmbraPosition(t);
      if (pos) {
        const vec = latLonToVector3(pos.lat, pos.lon, EARTH_RADIUS * 1.004);
        curvePoints.push(new THREE.Vector3(...vec));
      }
    }
    const pathGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const pathMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2, transparent: true, opacity: 0.95 });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    scene.add(pathLine);
    pathLineRef.current = pathLine;

    // 4. Station Markers Group
    const stationGroup = new THREE.Group();
    scene.add(stationGroup);
    stationMarkersRef.current = stationGroup;

    // 5. Celestial Icons & Sightlines Group
    const celestialGroup = new THREE.Group();
    scene.add(celestialGroup);
    celestialIconsRef.current = celestialGroup;

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera spherical transition if target is set (prevents excessive spinning or diving through Earth)
      if (targetCamPosRef.current && cameraRef.current && controlsRef.current) {
        const curPos = cameraRef.current.position;
        const targetPos = targetCamPosRef.current;

        const curDist = curPos.length();
        const targetDist = targetPos.length();

        const curDir = curPos.clone().normalize();
        const targetDir = targetPos.clone().normalize();

        const dot = Math.max(-1, Math.min(1, curDir.dot(targetDir)));
        const angle = Math.acos(dot);

        if (angle < 0.002 && Math.abs(curDist - targetDist) < 0.5) {
          cameraRef.current.position.copy(targetPos);
          targetCamPosRef.current = null;
        } else {
          // Minimal, calm rotation speed (strictly capped so it never spins excessively)
          const stepAngle = Math.min(angle * 0.035, 0.015);
          const t = angle > 0.0001 ? Math.min(1, stepAngle / angle) : 1;

          // Spherical interpolation between direction vectors
          const qCur = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), curDir);
          const qTarget = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetDir);
          qCur.slerp(qTarget, t);

          const newDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qCur).normalize();
          const newDist = THREE.MathUtils.lerp(curDist, targetDist, 0.04);

          cameraRef.current.position.copy(newDir.multiplyScalar(newDist));
        }
      }

      // Animate active Orbital HUD reticle & cloud rotation
      const time = Date.now() * 0.003;
      const currentSkyPhase = skyMatRef.current ? skyMatRef.current.uniforms.eclipsePhase.value : 0.0;
      updateStarfieldRef.current?.(time, sunMeshRef.current?.position, currentSkyPhase);

      if (cloudsMeshRef.current && show3DClouds) {
        cloudsMeshRef.current.rotation.y += 0.00015;
      }

      if (sunMeshRef.current) {
        // Solar differential rotation (equatorial ~26 days, polar ~34 days — we simulate avg)
        sunMeshRef.current.rotation.y += 0.00065;
        // Subtle 7.25° solar axial tilt oscillation
        sunMeshRef.current.rotation.x = Math.sin(time * 0.008) * 0.0035;

        const sunTime = Date.now() * 0.001;

        // Update photosphere shader time
        if (sunMeshRef.current.material instanceof THREE.ShaderMaterial) {
          sunMeshRef.current.material.uniforms.u_time.value = sunTime;
        }

        // Update inner corona shader time
        if (sunInnerCoronaRef.current?.material instanceof THREE.ShaderMaterial) {
          sunInnerCoronaRef.current.material.uniforms.u_time.value = sunTime;
        }

        // Update outer corona shader time
        if (sunOuterCoronaRef.current?.material instanceof THREE.ShaderMaterial) {
          sunOuterCoronaRef.current.material.uniforms.u_time.value = sunTime;
        }
      }

      if (stationMarkersRef.current) {
        stationMarkersRef.current.children.forEach((group) => {
          if (group.userData && group.userData.isSelected && group.userData.targetRing) {
            const scale = 1.0 + Math.sin(time) * 0.12;
            group.userData.targetRing.scale.set(scale, scale, 1.0);
          }
        });
      }

      // Aurora Borealis animation — active at Greenland/Iceland (lat > 60°)
      if (auroraRef.current && auroraRef.current.material instanceof THREE.ShaderMaterial) {
        auroraRef.current.material.uniforms.u_time.value = Date.now() * 0.001;
        // Intensity driven by the camera's current focus latitude
        const camLat = Math.asin(camera.position.clone().normalize().y) * (180 / Math.PI);
        const targetIntensity = camLat > 58 ? 0.85 : camLat > 45 ? 0.35 : 0.0;
        const currentIntensity = auroraRef.current.material.uniforms.u_intensity.value;
        auroraRef.current.material.uniforms.u_intensity.value = THREE.MathUtils.lerp(
          currentIntensity, targetIntensity, 0.008
        );
        auroraRef.current.visible = auroraRef.current.material.uniforms.u_intensity.value > 0.01;
      }

      controls.update();

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
      }
    };
  }, [generateFallbackDayTexture, generateFallbackNightTexture]);

  // Update Scene elements when timestamp, selection, or toggles change
  useEffect(() => {
    if (!sceneRef.current) return;

    // Update Sun Position & Umbra Position in Earth Custom Shader
    if (earthMeshRef.current && earthMeshRef.current.material instanceof THREE.ShaderMaterial) {
      const subSolar = getSubSolarPoint(currentTimestamp);
      const sunVec = latLonToVector3(subSolar.lat, subSolar.lon, 1);
      earthMeshRef.current.material.uniforms.u_sun_pos.value.set(...sunVec);
      earthMeshRef.current.material.uniforms.u_show_terminator.value = showDayNightTerminator ? 1.0 : 0.0;
      earthMeshRef.current.material.uniforms.u_umbra_opacity.value = umbraOpacity;
      earthMeshRef.current.material.uniforms.u_indigo_tint_strength.value = showIndigoFilter ? 1.0 : 0.0;

      // 3D Sun Sphere & Corona Position in Space
      const sun3DPos = latLonToVector3(subSolar.lat, subSolar.lon, EARTH_RADIUS * 7.5);
      if (sunMeshRef.current) {
        sunMeshRef.current.position.set(...sun3DPos);
        sunMeshRef.current.visible = show3DSun;
      }

      // Update Sky Dome (Atmospheric Scattering)
      if (skyMatRef.current) {
        skyMatRef.current.uniforms.sunPosition.value.set(...sun3DPos);
      }

      const umbraPos = getUmbraPosition(currentTimestamp);
      if (skyMatRef.current) {
        // Smoothly interpolate eclipse phase for sky darkening
        const targetPhase = umbraPos ? 1.0 : 0.0;
        const currentPhase = skyMatRef.current.uniforms.eclipsePhase.value;
        skyMatRef.current.uniforms.eclipsePhase.value = THREE.MathUtils.lerp(currentPhase, targetPhase, 0.05);
      }
      if (umbraPos) {
        const uVec = latLonToVector3(umbraPos.lat, umbraPos.lon, 1);
        earthMeshRef.current.material.uniforms.u_umbra_pos.value.set(...uVec);
        earthMeshRef.current.material.uniforms.u_has_umbra.value = 1.0;
        earthMeshRef.current.material.uniforms.u_show_penumbra.value = showPenumbra ? 1.0 : 0.0;
        
        if (atmosphereMeshRef.current) {
          const mat = atmosphereMeshRef.current.material as THREE.ShaderMaterial;
          mat.uniforms.u_umbra_pos.value.set(...uVec);
          mat.uniforms.u_has_umbra.value = 1.0;
          mat.uniforms.u_sun_pos.value.set(...sunVec);
        }

        // 3D Moon Object Position in Space (Placed along Sun -> Umbra vector at distance)
        const moon3DPos = latLonToVector3(umbraPos.lat, umbraPos.lon, EARTH_RADIUS * 2.2);
        if (moonMeshRef.current) {
          moonMeshRef.current.position.set(...moon3DPos);
          if (moonMeshRef.current.material instanceof THREE.ShaderMaterial) {
            moonMeshRef.current.material.uniforms.u_sun_pos.value.set(...sunVec);
          }
          moonMeshRef.current.visible = show3DMoon;
        }

        // Rebuild 3D Umbral & Penumbral Shadow Cones
        if (shadowConesGroupRef.current) {
          while (shadowConesGroupRef.current.children.length > 0) {
            const child = shadowConesGroupRef.current.children[0] as any;
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            shadowConesGroupRef.current.remove(child);
          }

          if (showShadowCones) {
            const moonPosVec = new THREE.Vector3(...moon3DPos);
            const groundPosVec = latLonToVector3(umbraPos.lat, umbraPos.lon, EARTH_RADIUS * 1.002);
            const groundVec = new THREE.Vector3(...groundPosVec);

            // 1. Umbral Cone (Soft volumetric converging shadow beam connecting Moon to Earth Totality point)
            const coneHeight = moonPosVec.distanceTo(groundVec);
            const umbraConeGeo = new THREE.ConeGeometry(17.5, coneHeight, 32, 1, true); // tapering cone
            const umbraConeMat = new THREE.MeshBasicMaterial({
              color: 0x03050b,
              transparent: true,
              opacity: 0.28,
              depthWrite: false,
              side: THREE.DoubleSide
            });
            const umbraCone = new THREE.Mesh(umbraConeGeo, umbraConeMat);

            // Orient cone along Moon -> Ground vector
            const midpoint = moonPosVec.clone().add(groundVec).multiplyScalar(0.5);
            umbraCone.position.copy(midpoint);
            umbraCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), groundVec.clone().sub(moonPosVec).normalize());
            shadowConesGroupRef.current.add(umbraCone);

            // 2. Penumbral Cone (Soft translucent cyan-gold expanding light shadow beam in space)
            const penumbraConeGeo = new THREE.CylinderGeometry(18.0, 56.0, coneHeight, 32, 1, true);
            const penumbraConeMat = new THREE.MeshBasicMaterial({
              color: 0x38bdf8,
              transparent: true,
              opacity: 0.05,
              depthWrite: false,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending
            });
            const penumbraCone = new THREE.Mesh(penumbraConeGeo, penumbraConeMat);
            penumbraCone.position.copy(midpoint);
            penumbraCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), groundVec.clone().sub(moonPosVec).normalize());
            shadowConesGroupRef.current.add(penumbraCone);
          }
        }
      } else {
        earthMeshRef.current.material.uniforms.u_has_umbra.value = 0.0;
        if (atmosphereMeshRef.current) {
          (atmosphereMeshRef.current.material as THREE.ShaderMaterial).uniforms.u_has_umbra.value = 0.0;
        }
        if (moonMeshRef.current) moonMeshRef.current.visible = false;
        if (shadowConesGroupRef.current) {
          while (shadowConesGroupRef.current.children.length > 0) {
            shadowConesGroupRef.current.remove(shadowConesGroupRef.current.children[0]);
          }
        }
      }
    }

    // Update 3D Clouds Visibility
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.visible = show3DClouds;
    }

    // Update Sun Light direction
    const subSolar = getSubSolarPoint(currentTimestamp);
    const sunLightVec = latLonToVector3(subSolar.lat, subSolar.lon, 500);
    if (sunLightRef.current) {
      sunLightRef.current.position.set(...sunLightVec);
    }
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = showDayNightTerminator ? 0.45 : 0.85;
    }

    // Update Path Line Visibility
    if (pathLineRef.current) {
      pathLineRef.current.visible = showPathLine;
    }

    // Update Star Field Background Visibility
    if (starFieldGroupRef.current) {
      starFieldGroupRef.current.visible = showStarCatalog;
    }

    // Update Station Markers & Custom Observation Pin (Orbital HUD Laser Reticles)
    if (stationMarkersRef.current) {
      while (stationMarkersRef.current.children.length > 0) {
        stationMarkersRef.current.remove(stationMarkersRef.current.children[0]);
      }

      const createOrbitalHud = (coords: { lat: number; lon: number }, isSelected: boolean, label: string, isCustom: boolean = false, stationData?: any) => {
        const pos = latLonToVector3(coords.lat, coords.lon, EARTH_RADIUS * 1.002);
        const hudGroup = new THREE.Group();
        hudGroup.position.set(...pos);
        hudGroup.lookAt(new THREE.Vector3(0, 0, 0));
        hudGroup.userData = { station: stationData, isCustom, isSelected };

        // 1. Core precision point (minimal dot that never obscures map features)
        const coreGeo = new THREE.SphereGeometry(isSelected ? 0.35 : 0.2, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({ color: isSelected ? (isCustom ? 0x10b981 : 0x00f2fe) : 0xe2e8f0 });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        hudGroup.add(coreMesh);

        // 2. Thin open wireframe target ring (100% transparent to underlying topography)
        const baseRingGeo = new THREE.RingGeometry(isSelected ? 1.5 : 0.9, isSelected ? 1.7 : 1.1, 32);
        const baseRingMat = new THREE.MeshBasicMaterial({
          color: isCustom ? 0x10b981 : (isSelected ? 0x00f2fe : 0x94a3b8),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isSelected ? 0.9 : 0.45
        });
        const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
        hudGroup.add(baseRing);
        if (isSelected) {
          hudGroup.userData.targetRing = baseRing;
        }

        stationMarkersRef.current?.add(hudGroup);
      };

      OBSERVATION_STATIONS.forEach((station) => {
        const isSelected = selectedStation?.id === station.id && !selectedStation?.isCustom;
        createOrbitalHud(station.coords, isSelected, station.name, false, station);
      });

      if (selectedStation?.isCustom) {
        createOrbitalHud(selectedStation.coords, true, selectedStation.name || "Custom Target", true, selectedStation);
      }
    }

    // Update Celestial Icons & Sightline Arcs
    if (celestialIconsRef.current) {
      while (celestialIconsRef.current.children.length > 0) {
        const child = celestialIconsRef.current.children[0] as any;
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
          else child.material.dispose();
        }
        celestialIconsRef.current.remove(child);
      }

      if (showCelestialIcons) {
        const subSolar = getSubSolarPoint(currentTimestamp);
        const umbraPos = getUmbraPosition(currentTimestamp);

        // 1. Sub-Solar Sun Badge & Surface Ring
        const sunPos = latLonToVector3(subSolar.lat, subSolar.lon, EARTH_RADIUS * 1.05);
        const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getCelestialTexture('sun_surface'), transparent: true }));
        sunSprite.scale.set(24, 12, 1);
        sunSprite.position.set(...sunPos);
        celestialIconsRef.current.add(sunSprite);

        const sunRingGeo = new THREE.RingGeometry(2.5, 3.1, 32);
        const sunRingMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const sunRing = new THREE.Mesh(sunRingGeo, sunRingMat);
        sunRing.position.set(...latLonToVector3(subSolar.lat, subSolar.lon, EARTH_RADIUS * 1.004));
        sunRing.lookAt(new THREE.Vector3(0, 0, 0));
        celestialIconsRef.current.add(sunRing);

        // 2. Sub-Lunar / Umbra Core Moon Badge & Surface Ring
        if (umbraPos) {
          const moonPos = latLonToVector3(umbraPos.lat, umbraPos.lon, EARTH_RADIUS * 1.06);
          const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getCelestialTexture('moon_surface'), transparent: true }));
          moonSprite.scale.set(24, 12, 1);
          moonSprite.position.set(...moonPos);
          celestialIconsRef.current.add(moonSprite);

          const moonRingGeo = new THREE.RingGeometry(2.0, 2.6, 32);
          const moonRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
          const moonRing = new THREE.Mesh(moonRingGeo, moonRingMat);
          moonRing.position.set(...latLonToVector3(umbraPos.lat, umbraPos.lon, EARTH_RADIUS * 1.005));
          moonRing.lookAt(new THREE.Vector3(0, 0, 0));
          celestialIconsRef.current.add(moonRing);
        }

        // 3. Line of Sight Arcs & Direction Beams from Selected Station
        if (selectedStation && selectedStation.coords) {
          const stCoords = selectedStation.coords;
          const vecP = new THREE.Vector3(...latLonToVector3(stCoords.lat, stCoords.lon, EARTH_RADIUS));
          const sunDir = new THREE.Vector3(...latLonToVector3(subSolar.lat, subSolar.lon, 1)).normalize();

          // Surface Arc to Sun
          const sunArcPts = generateGreatCircleArc(stCoords, subSolar, EARTH_RADIUS * 1.008, 40);
          if (sunArcPts.length > 1) {
            const sunCurve = new THREE.CatmullRomCurve3(sunArcPts);
            const sunArcGeo = new THREE.TubeGeometry(sunCurve, 40, 0.35, 6, false);
            const sunArcMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 });
            celestialIconsRef.current.add(new THREE.Mesh(sunArcGeo, sunArcMat));
          }

          // Sky Beam to Sun
          const sunRayEnd = vecP.clone().addScaledVector(sunDir, 42);
          const sunRayCurve = new THREE.CatmullRomCurve3([vecP, sunRayEnd]);
          const sunRayGeo = new THREE.TubeGeometry(sunRayCurve, 2, 0.35, 6, false);
          const sunRayMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 });
          celestialIconsRef.current.add(new THREE.Mesh(sunRayGeo, sunRayMat));

          const sunSkySprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getCelestialTexture('sun_sky'), transparent: true }));
          sunSkySprite.scale.set(18, 9, 1);
          sunSkySprite.position.copy(vecP.clone().addScaledVector(sunDir, 47));
          celestialIconsRef.current.add(sunSkySprite);

          if (umbraPos) {
            // Surface Arc to Moon/Umbra
            const moonArcPts = generateGreatCircleArc(stCoords, umbraPos, EARTH_RADIUS * 1.009, 40);
            if (moonArcPts.length > 1) {
              const moonCurve = new THREE.CatmullRomCurve3(moonArcPts);
              const moonArcGeo = new THREE.TubeGeometry(moonCurve, 40, 0.35, 6, false);
              const moonArcMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });
              celestialIconsRef.current.add(new THREE.Mesh(moonArcGeo, moonArcMat));
            }

            // Sky Beam to Moon
            const vecU = new THREE.Vector3(...latLonToVector3(umbraPos.lat, umbraPos.lon, EARTH_RADIUS));
            const vecM = vecU.clone().addScaledVector(sunDir, 3000);
            const moonDir = new THREE.Vector3().subVectors(vecM, vecP).normalize();

            const moonRayEnd = vecP.clone().addScaledVector(moonDir, 38);
            const moonRayCurve = new THREE.CatmullRomCurve3([vecP, moonRayEnd]);
            const moonRayGeo = new THREE.TubeGeometry(moonRayCurve, 2, 0.35, 6, false);
            const moonRayMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.8 });
            celestialIconsRef.current.add(new THREE.Mesh(moonRayGeo, moonRayMat));

            const moonSkySprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getCelestialTexture('moon_sky'), transparent: true }));
            moonSkySprite.scale.set(18, 9, 1);
            moonSkySprite.position.copy(vecP.clone().addScaledVector(moonDir, 43));
            celestialIconsRef.current.add(moonSkySprite);
          }
        }
      }
    }

    // Update Camera based on mode (Only auto-animate when user has NOT manually taken control of the camera)
    if (cameraRef.current && controlsRef.current && !isDraggingRef.current && !userCameraOverrideRef.current) {
      const umbraPos = getUmbraPosition(currentTimestamp);
      const currentDist = cameraRef.current.position.length() || 310;
      const targetDist = Math.max(140, Math.min(800, currentDist));

      if (cameraMode === 'follow-shadow' && umbraPos) {
        const camPos = latLonToVector3(umbraPos.lat, umbraPos.lon, targetDist);
        targetCamPosRef.current = new THREE.Vector3(...camPos);
        controlsRef.current.target.set(0, 0, 0);
      } else if (cameraMode === 'focused-station' && selectedStation) {
        const coords = selectedStation.coords;
        if (coords) {
          const camPos = latLonToVector3(coords.lat, coords.lon, targetDist);
          targetCamPosRef.current = new THREE.Vector3(...camPos);
          controlsRef.current.target.set(0, 0, 0);
        }
      } else if (cameraMode === 'top-down' || cameraMode === 'polar') {
        const camPos = latLonToVector3(89.8, -20.0, targetDist * 1.08);
        targetCamPosRef.current = new THREE.Vector3(...camPos);
        controlsRef.current.target.set(0, 0, 0);
      } else if (cameraMode === 'spain-fixed') {
        const camPos = latLonToVector3(40.8, -2.5, targetDist);
        targetCamPosRef.current = new THREE.Vector3(...camPos);
        controlsRef.current.target.set(0, 0, 0);

      // ── New cinematic camera modes ─────────────────────────────────────
      } else if (cameraMode === 'iss') {
        // ISS Low-Earth Orbit: 400 km altitude (~EARTH_RADIUS + 4 scene units at 1:1 scale)
        // Orbit completes every 92 minutes → slow scene orbit period
        const issOrbitPeriod = 55; // scene-seconds per orbit (sped up for drama)
        const issAngle = (currentTimestamp / issOrbitPeriod) * Math.PI * 2;
        const issAlt = EARTH_RADIUS + 8; // ~8 scene units above Earth surface
        const issLat = 51.6; // ISS orbital inclination in degrees
        const issPos = latLonToVector3(
          issLat * Math.cos(issAngle * 0.3),
          (issAngle * 180 / Math.PI) % 360,
          issAlt
        );
        targetCamPosRef.current = new THREE.Vector3(...issPos);
        controlsRef.current.target.set(0, 0, 0);

      } else if (cameraMode === 'concorde') {
        // Sinematic Concorde: chases umbra at Mach 2 from 18 km altitude
        // Camera locked to umbra center, slightly above and behind the shadow
        if (umbraPos) {
          const conc = latLonToVector3(umbraPos.lat + 2.5, umbraPos.lon - 3.0, EARTH_RADIUS + 5);
          targetCamPosRef.current = new THREE.Vector3(...conc);
          controlsRef.current.target.set(0, 0, 0);
        }

      } else if (cameraMode === 'lunar-surface') {
        // Camera placed at Moon's position, looking toward Earth
        if (moonMeshRef.current) {
          const moonPos = moonMeshRef.current.position.clone();
          // Step back slightly from Moon center toward Earth
          const toEarth = new THREE.Vector3(0, 0, 0).sub(moonPos).normalize();
          const lunarCamPos = moonPos.clone().add(toEarth.multiplyScalar(6));
          targetCamPosRef.current = lunarCamPos;
          controlsRef.current.target.set(0, 0, 0);
        }
      }
    }
  }, [currentTimestamp, selectedStation, cameraMode, cameraResetTrigger, showPathLine, showPenumbra, showDayNightTerminator, showCelestialIcons, umbraOpacity, showIndigoFilter, showStarCatalog]);

  // Handle Click on Globe / Markers
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    if (stationMarkersRef.current) {
      const markerIntersects = raycasterRef.current.intersectObjects(stationMarkersRef.current.children, true);
      if (markerIntersects.length > 0) {
        let hit: THREE.Object3D | null = markerIntersects[0].object;
        while (hit && !hit.userData?.station && hit.parent && hit !== stationMarkersRef.current) {
          hit = hit.parent;
        }
        if (hit && hit.userData && hit.userData.station && !hit.userData.isCustom) {
          userCameraOverrideRef.current = true;
          onUserInteractRef.current?.();
          onSelectStation(hit.userData.station);
          onCameraModeChange('focused-station');
          return;
        }
      }
    }

    if (earthMeshRef.current) {
      const earthIntersects = raycasterRef.current.intersectObject(earthMeshRef.current);
      if (earthIntersects.length > 0) {
        const point = earthIntersects[0].point;
        const radius = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
        const lat = 90 - (Math.acos(point.y / radius) * 180) / Math.PI;
        let lon = ((Math.atan2(point.z, -point.x) * 180) / Math.PI) - 180;
        if (lon < -180) lon += 360;

        userCameraOverrideRef.current = true;
        onUserInteractRef.current?.();
        onDropCustomPin({ lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 });
      }
    }
  };

  const isPolarViewActive = cameraMode === 'polar' || cameraMode === 'top-down';

  const handleTogglePolarView = () => {
    userCameraOverrideRef.current = false;
    if (isPolarViewActive) {
      onCameraModeChange('free');
    } else {
      onCameraModeChange('polar');
    }
  };

  // Screenshot capture: renders one frame and saves it as PNG
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  const handleScreenshot = useCallback(() => {
    if (!rendererRef.current) return;
    setIsCapturing(true);

    // Three.js preserveDrawingBuffer must be true for toBlob to work.
    // We re-render one frame then capture.
    if (sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    rendererRef.current.domElement.toBlob((blob) => {
      setIsCapturing(false);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar-eclipse-2026-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setCaptureSuccess(true);
      setTimeout(() => setCaptureSuccess(false), 2500);
    }, 'image/png');
  }, []);

  return (
    <div className="relative w-full h-full min-h-[400px] flex-1 bg-transparent overflow-hidden rounded-xl border border-white/15 shadow-2xl">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating Earth3D Viewport Controls & Settings Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1.5 bg-[#050505]/85 backdrop-blur-xl border border-white/20 px-2 py-1.5 rounded-lg shadow-2xl font-mono text-xs max-w-[calc(100vw-32px)]">
        {/* Polar View Toggle Button */}
        <button
          id="btn-polar-view-toggle"
          onClick={handleTogglePolarView}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all font-bold tracking-wider uppercase text-[11px] border whitespace-nowrap ${
            isPolarViewActive
              ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.45)]'
              : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/15'
          }`}
          title="Top-down perspective centered on North Pole (90°N) to visualize Arctic shadow trajectory"
        >
          <Compass className={`w-3.5 h-3.5 ${isPolarViewActive ? 'text-cyan-300 animate-spin-slow' : 'text-cyan-400'}`} />
          <span>Polar View</span>
          {isPolarViewActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-0.5" />
          )}
        </button>

        {/* Quick Follow Shadow Toggle */}
        <button
          id="btn-camera-follow-shadow"
          onClick={() => {
            userCameraOverrideRef.current = false;
            onCameraModeChange('follow-shadow');
          }}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded transition-all font-bold tracking-wider uppercase text-[11px] border whitespace-nowrap ${
            cameraMode === 'follow-shadow'
              ? 'bg-amber-500/25 text-amber-200 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.45)]'
              : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/15'
          }`}
          title="Auto-follow the Moon's umbra shadow progression"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Follow Umbra</span>
        </button>

        {/* Quick Spain Fixed Toggle */}
        <button
          id="btn-camera-spain-fixed"
          onClick={() => {
            userCameraOverrideRef.current = false;
            onCameraModeChange('spain-fixed');
          }}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded transition-all font-bold tracking-wider uppercase text-[11px] border whitespace-nowrap ${
            cameraMode === 'spain-fixed'
              ? 'bg-rose-500/25 text-rose-200 border-rose-400/80 shadow-[0_0_12px_rgba(244,63,94,0.45)]'
              : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/15'
          }`}
          title="Fixed European landfall view centered over Spain (Space key shortcut)"
        >
          <span>🇪🇸 Spain View</span>
        </button>

        {/* Screenshot Button */}
        <button
          id="btn-screenshot"
          onClick={(e) => { e.stopPropagation(); handleScreenshot(); }}
          disabled={isCapturing}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all font-bold uppercase text-[11px] border whitespace-nowrap ${
            captureSuccess
              ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/15'
          }`}
          title="Capture PNG screenshot of current 3D globe view"
        >
          {captureSuccess
            ? <><Check className="w-3.5 h-3.5 text-emerald-300" /><span className="hidden md:inline">Saved!</span></>
            : <><Camera className="w-3.5 h-3.5" /><span className="hidden md:inline">Screenshot</span></>
          }
        </button>

        {/* Settings & Layers Dropdown Toggle */}
        <div className="relative">
          <button
            id="btn-earth-settings"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all font-bold uppercase text-[11px] border ${
              isSettingsOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/15'
            }`}
            title="Earth3D Camera & Layer Display Settings"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden md:inline">Settings</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isSettingsOpen ? 'rotate-180 text-cyan-300' : 'text-slate-400'}`} />
          </button>

          {/* Settings Popover */}
          {isSettingsOpen && (
            <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-64 bg-[#050505]/95 backdrop-blur-2xl border border-white/20 rounded-lg p-3 shadow-2xl z-50 text-slate-200 flex flex-col gap-3 font-mono text-xs">
              {/* Camera Perspectives Section */}
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-white/10 pb-1 mb-2 flex items-center justify-between">
                  <span>Camera Perspectives</span>
                  <Globe className="w-3 h-3 text-cyan-400" />
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() => {
                      userCameraOverrideRef.current = false;
                      onCameraModeChange('polar');
                      setIsSettingsOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] border ${
                      isPolarViewActive
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Polar View (Arctic 90°N)</span>
                    </span>
                    {isPolarViewActive && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                  </button>

                  <button
                    onClick={() => {
                      userCameraOverrideRef.current = false;
                      onCameraModeChange('follow-shadow');
                      setIsSettingsOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] border ${
                      cameraMode === 'follow-shadow'
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Follow Umbra Center</span>
                    </span>
                    {cameraMode === 'follow-shadow' && <Check className="w-3.5 h-3.5 text-amber-300" />}
                  </button>

                  <button
                    onClick={() => {
                      userCameraOverrideRef.current = false;
                      onCameraModeChange('spain-fixed');
                      setIsSettingsOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] border ${
                      cameraMode === 'spain-fixed'
                        ? 'bg-rose-500/20 text-rose-200 border-rose-500/60 font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🇪🇸</span>
                      <span>Spain Fixed Landfall</span>
                    </span>
                    {cameraMode === 'spain-fixed' && <Check className="w-3.5 h-3.5 text-rose-300" />}
                  </button>

                  <button
                    onClick={() => {
                      userCameraOverrideRef.current = false;
                      onCameraModeChange('free');
                      setIsSettingsOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] border ${
                      cameraMode === 'free'
                        ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/60 font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Free Orbital Drag</span>
                    </span>
                    {cameraMode === 'free' && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                  </button>
                </div>
              </div>

              {/* Layer Overlays Section */}
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold border-b border-white/10 pb-1 mb-2 flex items-center justify-between">
                  <span>Layer Overlays</span>
                  <Layers className="w-3 h-3 text-amber-400" />
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {onTogglePathLine && (
                    <button
                      onClick={onTogglePathLine}
                      className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-0.5 bg-amber-400 inline-block" />
                        <span>Totality Path Line</span>
                      </span>
                      {showPathLine ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  )}

                  {onTogglePenumbra && (
                    <button
                      onClick={onTogglePenumbra}
                      className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    >
                      <span className="flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-sky-400" />
                        <span>Umbra & Penumbra</span>
                      </span>
                      {showPenumbra ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  )}

                  {onToggleTerminator && (
                    <button
                      onClick={onToggleTerminator}
                      className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-300" />
                        <span>Day/Night Terminator</span>
                      </span>
                      {showDayNightTerminator ? <Eye className="w-3.5 h-3.5 text-amber-300" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  )}

                  {onToggleCelestialIcons && (
                    <button
                      onClick={onToggleCelestialIcons}
                      className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Celestial Sightlines</span>
                      </span>
                      {showCelestialIcons ? <Eye className="w-3.5 h-3.5 text-cyan-300" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  )}

                  <button
                    id="btn-toggle-indigo-totality-filter"
                    onClick={() => setShowIndigoFilter(!showIndigoFilter)}
                    className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    title="Atmospheric deep indigo totality surface filter"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Indigo Totality Filter</span>
                    </span>
                    {showIndigoFilter ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    id="btn-toggle-star-catalog"
                    onClick={() => setShowStarCatalog(!showStarCatalog)}
                    className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    title="Depth-mapped star catalog, constellations, and planets"
                  >
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-300" />
                      <span>Realistic Star Catalog</span>
                    </span>
                    {showStarCatalog ? <Eye className="w-3.5 h-3.5 text-amber-300" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    id="btn-toggle-3d-moon"
                    onClick={() => setShow3DMoon(!show3DMoon)}
                    className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    title="Realistic 3D Moon model object in space"
                  >
                    <span className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-sky-300" />
                      <span>3D Moon Object</span>
                    </span>
                    {show3DMoon ? <Eye className="w-3.5 h-3.5 text-sky-300" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    id="btn-toggle-shadow-cones"
                    onClick={() => setShowShadowCones(!showShadowCones)}
                    className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    title="3D Umbral & Penumbral shadow cones connecting Sun, Moon, and Earth"
                  >
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-300" />
                      <span>3D Shadow Cones</span>
                    </span>
                    {showShadowCones ? <Eye className="w-3.5 h-3.5 text-cyan-300" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    id="btn-toggle-3d-clouds"
                    onClick={() => setShow3DClouds(!show3DClouds)}
                    className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    title="Animated 3D atmospheric cloud layer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-slate-200" />
                      <span>3D Atmospheric Clouds</span>
                    </span>
                    {show3DClouds ? <Eye className="w-3.5 h-3.5 text-slate-200" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <button
                    id="btn-toggle-3d-sun"
                    onClick={() => setShow3DSun(!show3DSun)}
                    className="px-2.5 py-1.5 rounded flex items-center justify-between transition-all text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent"
                    title="3D Sun sphere & solar corona atmosphere"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>3D Sun & Solar Corona</span>
                    </span>
                    {show3DSun ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Arctic Trajectory HUD Badge (Active when in Polar View) */}
      {isPolarViewActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-[#050505]/90 backdrop-blur-xl border border-cyan-500/40 px-3.5 py-2 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center gap-3 font-mono text-xs max-w-[calc(100vw-32px)]">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold tracking-wider uppercase text-[11px]">
                ARCTIC POLAR PERSPECTIVE (90°N)
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/40 font-bold">
                TOP-DOWN
              </span>
            </div>
            <span className="text-[10px] text-slate-300 font-sans tracking-tight">
              Tracking shadow trajectory: Siberia → Arctic Ocean → Greenland → Iceland
            </span>
          </div>
          <button
            onClick={() => onCameraModeChange('free')}
            className="ml-1 text-[10px] uppercase font-bold text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 shrink-0"
            title="Exit Polar View to Free Orbit"
          >
            ✕ Exit
          </button>
        </div>
      )}
    </div>
  );
};

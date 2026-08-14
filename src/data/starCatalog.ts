import * as THREE from 'three';

export interface CatalogStar {
  name: string;
  constellation: string;
  raHours: number;       // Right Ascension in decimal hours (0 to 24)
  decDeg: number;        // Declination in decimal degrees (-90 to +90)
  mag: number;           // Apparent visual magnitude (lower/negative is brighter)
  spectralClass: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  colorHex: number;      // Exact blackbody color in hex
  distanceLy?: number;   // Distance in light years for depth mapping
}

export interface CatalogPlanet {
  name: string;
  symbol: string;
  raHours: number;       // August 12, 2026 position
  decDeg: number;
  mag: number;
  colorHex: number;
  description: string;
}

/**
 * Astronomical Spectral Type to realistic Blackbody RGB Hex mapping
 */
export const SPECTRAL_COLORS: Record<string, number> = {
  O: 0x9db4ff, // Blue (30,000+ K)
  B: 0xbbccff, // Blue-white (10,000 - 30,000 K)
  A: 0xf8f9ff, // Pure white (7,500 - 10,000 K) e.g. Vega, Sirius
  F: 0xfff4e8, // Yellow-white (6,000 - 7,500 K) e.g. Procyon, Polaris
  G: 0xffe4af, // Yellow solar (5,200 - 6,000 K) e.g. Capella, Alpha Centauri
  K: 0xffc482, // Orange (3,700 - 5,200 K) e.g. Arcturus, Aldebaran
  M: 0xff8866, // Red supergiant/dwarf (< 3,700 K) e.g. Betelgeuse, Antares
};

/**
 * Prominent Named Star Catalog
 * Precise J2000 coordinates, apparent magnitudes, and spectral classes
 * Covers all major navigation stars and constellations visible during August 2026 eclipse totality
 */
export const BRIGHT_STAR_CATALOG: CatalogStar[] = [
  // --- The Summer Triangle (Directly Overhead in Europe during Totality!) ---
  { name: 'Vega', constellation: 'Lyra', raHours: 18.6156, decDeg: 38.7836, mag: 0.03, spectralClass: 'A', colorHex: 0xf0f4ff, distanceLy: 25 },
  { name: 'Altair', constellation: 'Aquila', raHours: 19.8464, decDeg: 8.8683, mag: 0.77, spectralClass: 'A', colorHex: 0xf8f9ff, distanceLy: 17 },
  { name: 'Deneb', constellation: 'Cygnus', raHours: 20.6905, decDeg: 45.2803, mag: 1.25, spectralClass: 'A', colorHex: 0xfcfdff, distanceLy: 2600 },
  
  // --- Brightest Northern & Equatorial Anchors ---
  { name: 'Arcturus', constellation: 'Boötes', raHours: 14.261, decDeg: 19.182, mag: -0.05, spectralClass: 'K', colorHex: 0xffbf77, distanceLy: 37 },
  { name: 'Capella', constellation: 'Auriga', raHours: 5.278, decDeg: 45.998, mag: 0.08, spectralClass: 'G', colorHex: 0xffe6ad, distanceLy: 43 },
  { name: 'Spica', constellation: 'Virgo', raHours: 13.4199, decDeg: -11.1613, mag: 0.98, spectralClass: 'B', colorHex: 0xa8c2ff, distanceLy: 250 },
  { name: 'Antares', constellation: 'Scorpius', raHours: 16.4901, decDeg: -26.432, mag: 1.06, spectralClass: 'M', colorHex: 0xff7755, distanceLy: 550 },
  { name: 'Regulus', constellation: 'Leo', raHours: 10.1395, decDeg: 11.9672, mag: 1.36, spectralClass: 'B', colorHex: 0xb5cdff, distanceLy: 79 },
  { name: 'Pollux', constellation: 'Gemini', raHours: 7.7553, decDeg: 28.0262, mag: 1.14, spectralClass: 'K', colorHex: 0xffcc88, distanceLy: 34 },
  { name: 'Castor', constellation: 'Gemini', raHours: 7.5767, decDeg: 31.8883, mag: 1.58, spectralClass: 'A', colorHex: 0xf5f8ff, distanceLy: 51 },
  { name: 'Procyon', constellation: 'Canis Minor', raHours: 7.655, decDeg: 5.225, mag: 0.34, spectralClass: 'F', colorHex: 0xfff6eb, distanceLy: 11.5 },
  { name: 'Fomalhaut', constellation: 'Piscis Austrinus', raHours: 22.9608, decDeg: -29.6222, mag: 1.17, spectralClass: 'A', colorHex: 0xf0f5ff, distanceLy: 25 },
  
  // --- Ursa Major (The Big Dipper) ---
  { name: 'Dubhe', constellation: 'Ursa Major', raHours: 11.0621, decDeg: 61.751, mag: 1.79, spectralClass: 'K', colorHex: 0xffcd85, distanceLy: 123 },
  { name: 'Merak', constellation: 'Ursa Major', raHours: 11.0307, decDeg: 56.3824, mag: 2.37, spectralClass: 'A', colorHex: 0xf8f9ff, distanceLy: 80 },
  { name: 'Phecda', constellation: 'Ursa Major', raHours: 11.8971, decDeg: 53.6948, mag: 2.44, spectralClass: 'A', colorHex: 0xf8f9ff, distanceLy: 83 },
  { name: 'Megrez', constellation: 'Ursa Major', raHours: 12.2571, decDeg: 57.0326, mag: 3.31, spectralClass: 'A', colorHex: 0xf8f9ff, distanceLy: 80 },
  { name: 'Alioth', constellation: 'Ursa Major', raHours: 12.9004, decDeg: 55.9598, mag: 1.77, spectralClass: 'A', colorHex: 0xf8faff, distanceLy: 83 },
  { name: 'Mizar', constellation: 'Ursa Major', raHours: 13.3987, decDeg: 54.9254, mag: 2.23, spectralClass: 'A', colorHex: 0xf8faff, distanceLy: 83 },
  { name: 'Alkaid', constellation: 'Ursa Major', raHours: 13.7924, decDeg: 49.3133, mag: 1.86, spectralClass: 'B', colorHex: 0xaec6ff, distanceLy: 104 },

  // --- North Star & Ursa Minor ---
  { name: 'Polaris', constellation: 'Ursa Minor', raHours: 2.5303, decDeg: 89.2641, mag: 1.98, spectralClass: 'F', colorHex: 0xfffaed, distanceLy: 430 },
  { name: 'Kochab', constellation: 'Ursa Minor', raHours: 14.8451, decDeg: 74.1555, mag: 2.08, spectralClass: 'K', colorHex: 0xffc87e, distanceLy: 130 },

  // --- Cassiopeia (The Celestial Queen) ---
  { name: 'Schedar', constellation: 'Cassiopeia', raHours: 0.6751, decDeg: 56.5373, mag: 2.24, spectralClass: 'K', colorHex: 0xffc678, distanceLy: 230 },
  { name: 'Caph', constellation: 'Cassiopeia', raHours: 0.1529, decDeg: 59.1498, mag: 2.28, spectralClass: 'F', colorHex: 0xfff6ea, distanceLy: 54 },
  { name: 'Gamma Cas', constellation: 'Cassiopeia', raHours: 0.9452, decDeg: 60.7167, mag: 2.15, spectralClass: 'B', colorHex: 0x9bb7ff, distanceLy: 550 },
  { name: 'Ruchbah', constellation: 'Cassiopeia', raHours: 1.4299, decDeg: 60.2353, mag: 2.68, spectralClass: 'A', colorHex: 0xf8f9ff, distanceLy: 99 },
  { name: 'Segin', constellation: 'Cassiopeia', raHours: 1.9068, decDeg: 63.6701, mag: 3.37, spectralClass: 'B', colorHex: 0xa8c2ff, distanceLy: 460 },

  // --- Cygnus, Lyra & Aquila Neighbors ---
  { name: 'Sadr', constellation: 'Cygnus', raHours: 20.3732, decDeg: 40.2567, mag: 2.23, spectralClass: 'F', colorHex: 0xfff4e6, distanceLy: 1800 },
  { name: 'Gienah', constellation: 'Cygnus', raHours: 20.7702, decDeg: 33.9703, mag: 2.48, spectralClass: 'K', colorHex: 0xffc980, distanceLy: 73 },
  { name: 'Albireo', constellation: 'Cygnus', raHours: 19.5122, decDeg: 27.9597, mag: 3.05, spectralClass: 'K', colorHex: 0xffc272, distanceLy: 430 },
  { name: 'Tarazed', constellation: 'Aquila', raHours: 19.7708, decDeg: 10.6133, mag: 2.72, spectralClass: 'K', colorHex: 0xffbf6c, distanceLy: 395 },
  { name: 'Sheliak', constellation: 'Lyra', raHours: 18.8344, decDeg: 33.3627, mag: 3.52, spectralClass: 'B', colorHex: 0xaec6ff, distanceLy: 960 },
  { name: 'Sulafat', constellation: 'Lyra', raHours: 18.9819, decDeg: 32.6903, mag: 3.25, spectralClass: 'B', colorHex: 0xb5cdff, distanceLy: 620 },

  // --- Hercules, Ophiuchus & Corona Borealis ---
  { name: 'Rasalhague', constellation: 'Ophiuchus', raHours: 17.5822, decDeg: 12.56, mag: 2.08, spectralClass: 'A', colorHex: 0xf5f8ff, distanceLy: 49 },
  { name: 'Kornephoros', constellation: 'Hercules', raHours: 16.5034, decDeg: 21.4897, mag: 2.78, spectralClass: 'G', colorHex: 0xffe2a4, distanceLy: 139 },
  { name: 'Alphecca', constellation: 'Corona Borealis', raHours: 15.5781, decDeg: 26.7147, mag: 2.22, spectralClass: 'A', colorHex: 0xf8faff, distanceLy: 75 },

  // --- Scorpius & Sagittarius (Galactic Center Vicinity) ---
  { name: 'Shaula', constellation: 'Scorpius', raHours: 17.5601, decDeg: -37.1038, mag: 1.62, spectralClass: 'B', colorHex: 0x9cb6ff, distanceLy: 570 },
  { name: 'Sargas', constellation: 'Scorpius', raHours: 17.6219, decDeg: -42.9978, mag: 1.86, spectralClass: 'F', colorHex: 0xfff6ea, distanceLy: 300 },
  { name: 'Dschubba', constellation: 'Scorpius', raHours: 16.0058, decDeg: -22.6217, mag: 2.29, spectralClass: 'B', colorHex: 0x9db7ff, distanceLy: 490 },
  { name: 'Kaus Australis', constellation: 'Sagittarius', raHours: 18.4028, decDeg: -34.3846, mag: 1.79, spectralClass: 'B', colorHex: 0xadc5ff, distanceLy: 143 },
  { name: 'Nunki', constellation: 'Sagittarius', raHours: 18.9211, decDeg: -26.2967, mag: 2.05, spectralClass: 'B', colorHex: 0x9cb6ff, distanceLy: 228 },
  { name: 'Ascella', constellation: 'Sagittarius', raHours: 19.0438, decDeg: -29.8808, mag: 2.60, spectralClass: 'A', colorHex: 0xf8f9ff, distanceLy: 89 },

  // --- Pegasus & Andromeda ---
  { name: 'Alpheratz', constellation: 'Andromeda', raHours: 0.1398, decDeg: 29.0904, mag: 2.07, spectralClass: 'B', colorHex: 0xaec6ff, distanceLy: 97 },
  { name: 'Mirach', constellation: 'Andromeda', raHours: 1.1622, decDeg: 35.6206, mag: 2.07, spectralClass: 'M', colorHex: 0xff8c62, distanceLy: 200 },
  { name: 'Almach', constellation: 'Andromeda', raHours: 2.0649, decDeg: 42.3317, mag: 2.10, spectralClass: 'K', colorHex: 0xffc374, distanceLy: 350 },
  { name: 'Scheat', constellation: 'Pegasus', raHours: 23.0631, decDeg: 28.0828, mag: 2.44, spectralClass: 'M', colorHex: 0xff8e66, distanceLy: 200 },
  { name: 'Markab', constellation: 'Pegasus', raHours: 23.0794, decDeg: 15.2053, mag: 2.49, spectralClass: 'B', colorHex: 0xb9cfff, distanceLy: 133 },
  { name: 'Algenib', constellation: 'Pegasus', raHours: 0.2206, decDeg: 15.18, mag: 2.84, spectralClass: 'B', colorHex: 0x9bb5ff, distanceLy: 390 },
  { name: 'Enif', constellation: 'Pegasus', raHours: 21.7364, decDeg: 9.875, mag: 2.38, spectralClass: 'K', colorHex: 0xffc478, distanceLy: 690 },

  // --- Southern Navigation Stars (Global Sphere Continuity) ---
  { name: 'Sirius', constellation: 'Canis Major', raHours: 6.7525, decDeg: -16.7161, mag: -1.46, spectralClass: 'A', colorHex: 0xf4f7ff, distanceLy: 8.6 },
  { name: 'Canopus', constellation: 'Carina', raHours: 6.3992, decDeg: -52.6957, mag: -0.74, spectralClass: 'A', colorHex: 0xf8f9ff, distanceLy: 310 },
  { name: 'Alpha Centauri', constellation: 'Centaurus', raHours: 14.6601, decDeg: -60.834, mag: -0.27, spectralClass: 'G', colorHex: 0xffe8b4, distanceLy: 4.37 },
  { name: 'Hadar', constellation: 'Centaurus', raHours: 14.0637, decDeg: -60.3731, mag: 0.61, spectralClass: 'B', colorHex: 0x9bb6ff, distanceLy: 390 },
  { name: 'Acrux', constellation: 'Crux', raHours: 12.4433, decDeg: -63.0991, mag: 0.77, spectralClass: 'B', colorHex: 0x93b0ff, distanceLy: 320 },
  { name: 'Mimosa', constellation: 'Crux', raHours: 12.7953, decDeg: -59.6888, mag: 1.25, spectralClass: 'B', colorHex: 0x96b2ff, distanceLy: 280 },
  { name: 'Rigil Kentaurus', constellation: 'Centaurus', raHours: 14.662, decDeg: -60.835, mag: -0.01, spectralClass: 'G', colorHex: 0xffe4af, distanceLy: 4.37 },
  { name: 'Achernar', constellation: 'Eridanus', raHours: 1.6286, decDeg: -57.2367, mag: 0.45, spectralClass: 'B', colorHex: 0xa3bdff, distanceLy: 139 },
  { name: 'Betelgeuse', constellation: 'Orion', raHours: 5.9195, decDeg: 7.4071, mag: 0.50, spectralClass: 'M', colorHex: 0xff7450, distanceLy: 640 },
  { name: 'Rigel', constellation: 'Orion', raHours: 5.2423, decDeg: -8.2016, mag: 0.18, spectralClass: 'B', colorHex: 0xa8c3ff, distanceLy: 860 },
  { name: 'Aldebaran', constellation: 'Taurus', raHours: 4.5987, decDeg: 16.5093, mag: 0.85, spectralClass: 'K', colorHex: 0xffb86b, distanceLy: 65 },
];

/**
 * Planetary Positions for August 12, 2026 (Visible during Totality)
 * In particular, Venus shines brightly near the eclipsed Sun in Leo/Virgo!
 */
export const SOLAR_SYSTEM_PLANETS: CatalogPlanet[] = [
  {
    name: 'Venus',
    symbol: '♀',
    raHours: 11.25,
    decDeg: 5.4,
    mag: -4.0,
    colorHex: 0xfff8e7,
    description: 'Blazing morning/evening star, prominent near eclipsed Sun in western sky'
  },
  {
    name: 'Jupiter',
    symbol: '♃',
    raHours: 7.15,
    decDeg: 22.8,
    mag: -2.1,
    colorHex: 0xffeacc,
    description: 'Golden brilliance visible high in eastern sky'
  },
  {
    name: 'Mercury',
    symbol: '☿',
    raHours: 10.45,
    decDeg: 10.2,
    mag: -0.2,
    colorHex: 0xffd29f,
    description: 'Close companion to the eclipsed Sun (within ~12°)'
  },
  {
    name: 'Mars',
    symbol: '♂',
    raHours: 4.80,
    decDeg: 23.5,
    mag: 1.1,
    colorHex: 0xff7755,
    description: 'Red planet visible near Taurus / Auriga'
  },
  {
    name: 'Saturn',
    symbol: '♄',
    raHours: 23.95,
    decDeg: -2.8,
    mag: 0.6,
    colorHex: 0xffe2b2,
    description: 'Pale yellow orb near the celestial equator'
  }
];

/**
 * Convert Celestial Equatorial Coordinates (Right Ascension in hours, Declination in degrees)
 * to 3D Cartesian coordinates on the Celestial Sphere at specified distance R.
 * Note: Earth's rotation on Aug 12, 2026 is aligned with UTC time.
 */
export function celestialRaDecToVector3(
  raHours: number,
  decDeg: number,
  radius: number,
  siderealOffsetRad = 0
): THREE.Vector3 {
  const raRad = (raHours / 24) * Math.PI * 2 + siderealOffsetRad;
  const decRad = (decDeg * Math.PI) / 180;

  // Celestial sphere orientation matching Earth3D coordinate frame
  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.sin(raRad);

  return new THREE.Vector3(x, y, z);
}

/**
 * Generate Circular Soft-Glow Star Sprite Texture with Gaussian drop-off and diffraction spike
 */
export function generateStarSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const cx = 64;
  const cy = 64;

  // Radial Gaussian Core
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.12, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.28, 'rgba(220, 235, 255, 0.65)');
  grad.addColorStop(0.55, 'rgba(180, 210, 255, 0.20)');
  grad.addColorStop(1.0, 'rgba(100, 150, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // Subtle 4-Point Diffraction Glint
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(cx - 45, cy);
  ctx.lineTo(cx + 45, cy);
  ctx.moveTo(cx, cy - 45);
  ctx.lineTo(cx, cy + 45);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

/**
 * Builds a realistic, multi-depth star field:
 * 1. Bright catalog stars (accurate RA/Dec, colors, magnitudes, and real distance mapping)
 * 2. Solar system planets (Venus, Jupiter, Mercury, Mars, Saturn)
 * 3. Dense Milky Way galactic plane band (thousands of depth-distributed stars)
 * 4. Deep background stellar field with magnitude-scaled fluxes
 */
export function createRealisticStarField(scene: THREE.Scene): {
  starGroup: THREE.Group;
  updateStarfield: (time: number) => void;
} {
  const starGroup = new THREE.Group();
  starGroup.name = 'RealisticStarField';

  const starSprite = generateStarSpriteTexture();

  // -------------------------------------------------------------
  // Layer 1: Bright Catalog Stars with Magnitude-Scaled Point Sizes & Real Spectral Colors
  // -------------------------------------------------------------
  const brightPositions: number[] = [];
  const brightColors: number[] = [];
  const brightSizes: number[] = [];

  BRIGHT_STAR_CATALOG.forEach((star) => {
    // Parallax depth mapping: base celestial shell radius ~2800, modulated by real distance
    const distScale = Math.log10(Math.max(4, star.distanceLy || 100)) / 3.5;
    const radius = 2400 + distScale * 1400; // 2400 to 3800

    const pos = celestialRaDecToVector3(star.raHours, star.decDeg, radius);
    brightPositions.push(pos.x, pos.y, pos.z);

    const c = new THREE.Color(star.colorHex);
    // Magnitude to brightness flux: mag -1.5 is blazing, mag 3.5 is subtle
    const flux = Math.pow(10, -0.32 * (star.mag - (-1.5)));
    brightColors.push(c.r, c.g, c.b);

    // Size calculation (clamped between 6px and 22px)
    const size = Math.max(6.0, Math.min(24.0, 16.0 * Math.sqrt(flux)));
    brightSizes.push(size);
  });

  // Add Planets to bright layer
  SOLAR_SYSTEM_PLANETS.forEach((planet) => {
    const radius = 2200;
    const pos = celestialRaDecToVector3(planet.raHours, planet.decDeg, radius);
    brightPositions.push(pos.x, pos.y, pos.z);

    const c = new THREE.Color(planet.colorHex);
    brightColors.push(c.r, c.g, c.b);

    // Venus is exceptionally brilliant (mag -4.0)
    const size = planet.name === 'Venus' ? 26.0 : 18.0;
    brightSizes.push(size);
  });

  const brightGeo = new THREE.BufferGeometry();
  brightGeo.setAttribute('position', new THREE.Float32BufferAttribute(brightPositions, 3));
  brightGeo.setAttribute('color', new THREE.Float32BufferAttribute(brightColors, 3));

  const brightMat = new THREE.PointsMaterial({
    size: 14.0,
    map: starSprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false,
  });

  const brightPoints = new THREE.Points(brightGeo, brightMat);
  starGroup.add(brightPoints);

  // -------------------------------------------------------------
  // Layer 2: Milky Way Galactic Plane & Dense Interstellar Field (3,800 Stars)
  // Galactic Plane inclination ~62.87° to Celestial Equator
  // -------------------------------------------------------------
  const bgPositions: number[] = [];
  const bgColors: number[] = [];

  const spectralPalette = [
    new THREE.Color(SPECTRAL_COLORS.O),
    new THREE.Color(SPECTRAL_COLORS.B),
    new THREE.Color(SPECTRAL_COLORS.A),
    new THREE.Color(SPECTRAL_COLORS.F),
    new THREE.Color(SPECTRAL_COLORS.G),
    new THREE.Color(SPECTRAL_COLORS.K),
    new THREE.Color(SPECTRAL_COLORS.M),
  ];

  // Galactic Plane Transformation Matrix Parameters (J2000 North Galactic Pole: RA 192.859°, Dec +27.128°)
  const ngpRa = (192.85948 * Math.PI) / 180;
  const ngpDec = (27.12825 * Math.PI) / 180;
  const gNorth = new THREE.Vector3(
    Math.cos(ngpDec) * Math.cos(ngpRa),
    Math.sin(ngpDec),
    Math.cos(ngpDec) * Math.sin(ngpRa)
  ).normalize();

  // Pseudo-random seeded generator for reproducible, smooth distribution
  let seed = 42;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const TOTAL_BG_STARS = 3600;

  for (let i = 0; i < TOTAL_BG_STARS; i++) {
    // 60% of background stars concentrated along the Milky Way galactic disk
    let x: number, y: number, z: number;
    let radius = 2000 + random() * 2400; // Multi-depth shell: 2000 to 4400

    if (random() < 0.62) {
      // Galactic Disk Coordinate Distribution
      const galLon = random() * Math.PI * 2;
      // Exponential galactic latitude concentration around b = 0°
      const galLat = (random() - 0.5) * Math.pow(random(), 1.8) * 0.45; // Radians (~ ±13°)

      // Convert Galactic (l, b) to Cartesian
      const gx = radius * Math.cos(galLat) * Math.cos(galLon);
      const gy = radius * Math.cos(galLat) * Math.sin(galLon);
      const gz = radius * Math.sin(galLat);

      // Rotate to Celestial Equatorial frame
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), gNorth);
      const v = new THREE.Vector3(gx, gy, gz).applyQuaternion(q);
      x = v.x;
      y = v.y;
      z = v.z;
    } else {
      // Isotropic spherical background
      const u = random();
      const v = random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const sinPhi = Math.sin(phi);

      x = radius * sinPhi * Math.cos(theta);
      y = radius * Math.cos(phi);
      z = radius * sinPhi * Math.sin(theta);
    }

    bgPositions.push(x, y, z);

    // Pick spectral temperature with realistic IMF (Initial Mass Function - mostly M/K/G stars)
    const p = random();
    let col: THREE.Color;
    if (p < 0.04) col = spectralPalette[0]; // O (Rare blue)
    else if (p < 0.15) col = spectralPalette[1]; // B
    else if (p < 0.38) col = spectralPalette[2]; // A (White)
    else if (p < 0.58) col = spectralPalette[3]; // F
    else if (p < 0.78) col = spectralPalette[4]; // G (Solar yellow)
    else if (p < 0.92) col = spectralPalette[5]; // K (Orange)
    else col = spectralPalette[6]; // M (Red)

    // Modulate subtle flux dimming
    const dim = 0.4 + random() * 0.55;
    bgColors.push(col.r * dim, col.g * dim, col.b * dim);
  }

  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgPositions, 3));
  bgGeo.setAttribute('color', new THREE.Float32BufferAttribute(bgColors, 3));

  const bgMat = new THREE.PointsMaterial({
    size: 4.5,
    map: starSprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.90,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const bgPoints = new THREE.Points(bgGeo, bgMat);
  starGroup.add(bgPoints);

  // -------------------------------------------------------------
  // Layer 0: ESO/NASA 4K Deep Space Milky Way Panorama Sphere
  // -------------------------------------------------------------
  const mwGeo = new THREE.SphereGeometry(4500, 64, 64);
  const textureLoader = new THREE.TextureLoader();
  const mwMat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });
  const mwMesh = new THREE.Mesh(mwGeo, mwMat);
  mwMesh.rotation.y = Math.PI * 0.45; // Align Galactic Center with J2000
  starGroup.add(mwMesh);

  textureLoader.load('/textures/milkyway.png', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    mwMat.map = tex;
    mwMat.needsUpdate = true;
  });

  // -------------------------------------------------------------
  // Layer 1: Bright Navigation Star Catalog & Planets
  // -------------------------------------------------------------
  const nebulaPositions: number[] = [];
  const nebulaColors: number[] = [];

  for (let i = 0; i < 600; i++) {
    const radius = 3200 + random() * 800;
    // Concentrate around Sagittarius & Cygnus galactic clouds
    const galLon = (random() > 0.5 ? 0.0 : Math.PI) + (random() - 0.5) * 0.9;
    const galLat = (random() - 0.5) * 0.18;

    const gx = radius * Math.cos(galLat) * Math.cos(galLon);
    const gy = radius * Math.cos(galLat) * Math.sin(galLon);
    const gz = radius * Math.sin(galLat);

    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), gNorth);
    const v = new THREE.Vector3(gx, gy, gz).applyQuaternion(q);

    nebulaPositions.push(v.x, v.y, v.z);
    nebulaColors.push(0.12, 0.18, 0.35); // Deep cyan/indigo interstellar glow
  }

  const nebulaGeo = new THREE.BufferGeometry();
  nebulaGeo.setAttribute('position', new THREE.Float32BufferAttribute(nebulaPositions, 3));
  nebulaGeo.setAttribute('color', new THREE.Float32BufferAttribute(nebulaColors, 3));

  const nebulaMat = new THREE.PointsMaterial({
    size: 16.0,
    map: starSprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false,
  });

  const nebulaPoints = new THREE.Points(nebulaGeo, nebulaMat);
  starGroup.add(nebulaPoints);

  scene.add(starGroup);

  // Animation / Twinkle update function
  const updateStarfield = (time: number) => {
    // Gentle twinkling on bright points
    const twinkle = 0.92 + Math.sin(time * 2.5) * 0.08;
    brightMat.opacity = 0.92 * twinkle;
  };

  return { starGroup, updateStarfield };
}

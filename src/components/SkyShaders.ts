import * as THREE from 'three';

/**
 * Simplified Precomputed Atmospheric Scattering Shader (Rayleigh + Mie)
 * Optimized for WebGL performance while maintaining realistic twilight colors during eclipse totality.
 */

export const SkyVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying float vSunE;

uniform vec3 sunPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  
  vSunDirection = normalize(sunPosition);
  // Calculate sun elevation (simplified)
  vSunE = max(0.0, dot(vSunDirection, vec3(0.0, 1.0, 0.0)));
  
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const SkyFragmentShader = `
uniform vec3 sunPosition;
uniform float rayleigh;
uniform float mieCoefficient;
uniform float mieDirectionalG;
uniform vec3 up;
uniform float eclipsePhase; // 0.0 (full daylight) to 1.0 (totality)

varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying float vSunE;

// Constants for atmospheric scattering
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const float pi = 3.1415926535897932384626433832795;
const float n = 1.0003;
const float N = 2.545E25;

// Optical length at zenith for molecules
const float rayleighPhase = 3.0 / (16.0 * pi);
const float miePhaseConst = 3.0 / (8.0 * pi);

vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);

float hgPhase(float cosTheta, float g) {
  float g2 = g * g;
  float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
  return miePhaseConst * ((1.0 - g2) * (1.0 + cosTheta * cosTheta)) / (2.0 + g2) * inverse;
}

void main() {
  vec3 direction = normalize(vWorldPosition);
  
  // Zenith angle
  float zenithAngle = acos(max(0.0, dot(up, direction)));
  float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
  float sR = rayleighZenithLength * inverse;
  float sM = mieZenithLength * inverse;

  // combined extinction factor
  vec3 Fex = exp(-(totalRayleigh * sR + mieCoefficient * sM));

  float cosTheta = dot(direction, vSunDirection);

  float rPhase = rayleighPhase * (1.0 + 0.5 * (cosTheta * cosTheta));
  vec3 betaRTheta = totalRayleigh * rPhase;

  float mPhase = hgPhase(cosTheta, mieDirectionalG);
  vec3 betaMTheta = vec3(mieCoefficient) * mPhase;

  // Extenuate sun intensity based on eclipse phase
  // When eclipsePhase is 1.0 (totality), sun is completely blocked, sky gets very dark
  float sunIntensity = mix(40.0, 0.1, eclipsePhase);
  vec3 sunLight = vec3(sunIntensity);
  
  vec3 Lin = pow(sunLight * ((betaRTheta + betaMTheta) / (totalRayleigh + vec3(mieCoefficient))), vec3(1.5));
  Lin *= (1.0 - Fex);
  Lin *= mix(vec3(1.0), pow(sunLight * ((betaRTheta + betaMTheta) / (totalRayleigh + vec3(mieCoefficient))), vec3(0.5)), clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));

  // Night sky background
  vec3 L0 = vec3(0.005, 0.01, 0.02) * Fex; // subtle deep blue
  
  // Combine
  vec3 texColor = (Lin + L0) * 0.04;
  
  gl_FragColor = vec4(texColor, 1.0);
  
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SkyVertexShader,
    fragmentShader: SkyFragmentShader,
    uniforms: {
      sunPosition: { value: new THREE.Vector3(0, 100, 0) },
      rayleigh: { value: 2.0 },
      mieCoefficient: { value: 0.005 },
      mieDirectionalG: { value: 0.8 },
      up: { value: new THREE.Vector3(0, 1, 0) },
      eclipsePhase: { value: 0.0 }
    },
    side: THREE.BackSide,
    depthWrite: false, // Don't write to depth buffer so stars and earth render in front
    transparent: true,
  });
}

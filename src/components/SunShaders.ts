/**
 * GLSL Shaders for Photorealistic 3D Sun Globe Photosphere & FrontSide Atmosphere
 */

export const SUN_VERTEX_SHADER = `
  varying vec3 vNormalWorld;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormalWorld = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SUN_FRAGMENT_SHADER = `
  uniform sampler2D u_sun_texture;
  uniform float u_time;
  varying vec3 vNormalWorld;
  varying vec2 vUv;

  void main() {
    // High-res SDO solar photosphere surface map
    vec3 sunTex = texture2D(u_sun_texture, vUv).rgb;

    // Dynamic solar surface plasma granulations
    float plasma = sin(vUv.x * 32.0 + u_time * 1.6) * cos(vUv.y * 32.0 + u_time * 1.3) * 0.08 + 0.92;
    sunTex *= plasma;

    // Solar limb darkening
    float rim = max(0.0, dot(vNormalWorld, vec3(0.0, 0.0, 1.0)));
    float limb = pow(rim, 0.38);

    vec3 coreColor = vec3(1.0, 0.98, 0.92);
    vec3 limbColor = vec3(0.98, 0.58, 0.14);
    vec3 solarSurface = mix(limbColor, sunTex * coreColor * 1.30, limb);

    gl_FragColor = vec4(solarSurface, 1.0);
  }
`;

export const SUN_CORONA_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SUN_CORONA_FRAGMENT_SHADER = `
  uniform float u_time;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);

    float rayNoise = sin(vUv.x * 24.0 + u_time * 1.8) * cos(vUv.y * 24.0 + u_time * 1.4) * 0.15 + 0.85;

    vec3 coronaColor = vec3(1.0, 0.82, 0.40) * intensity * rayNoise * 2.2;
    float alpha = clamp(intensity * 0.85, 0.0, 1.0);

    gl_FragColor = vec4(coronaColor, alpha);
  }
`;

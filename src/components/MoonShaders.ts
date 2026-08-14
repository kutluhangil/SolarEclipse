/**
 * GLSL Shaders for Photorealistic 3D Moon surface and 3D Solar Corona
 */

export const MOON_VERTEX_SHADER = `
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormalWorld = normalize(normalMatrix * normal);
    vPositionWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const MOON_FRAGMENT_SHADER = `
  uniform sampler2D u_moon_texture;
  uniform vec3 u_sun_pos;
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  void main() {
    vec3 moonTex = texture2D(u_moon_texture, vUv).rgb;

    // Enhance lunar regolith contrast & detail
    moonTex = pow(moonTex, vec3(1.1)) * 1.15;

    // Directional solar illumination
    vec3 sunDir = normalize(u_sun_pos);
    float ndotl = dot(vNormalWorld, sunDir);

    // Crisp lunar day/night terminator (Moon has no atmosphere)
    float dayFactor = smoothstep(-0.02, 0.06, ndotl);

    // Subtle Earthshine starlight on the night side of the Moon
    vec3 earthshine = vec3(0.03, 0.045, 0.065);

    // Combined photorealistic lunar surface color
    vec3 finalColor = mix(moonTex * earthshine, moonTex * vec3(1.15, 1.12, 1.08), dayFactor);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const CORONA_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const CORONA_FRAGMENT_SHADER = `
  uniform float u_time;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float coronaGlow = pow(rim, 2.6);

    float noise = sin(vUv.x * 24.0 + u_time * 1.5) * cos(vUv.y * 24.0 + u_time * 1.2) * 0.12 + 0.88;

    vec3 coronaColor = vec3(1.0, 0.85, 0.50) * coronaGlow * noise * 2.0;
    float alpha = clamp(coronaGlow * 0.75, 0.0, 1.0);

    gl_FragColor = vec4(coronaColor, alpha);
  }
`;

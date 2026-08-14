/**
 * GLSL Shaders for 3D Moon surface and 3D Solar Corona
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

    // Direct sunlight illumination on lunar surface
    vec3 sunDir = normalize(u_sun_pos);
    float ndotl = dot(vNormalWorld, sunDir);

    // Soft day-night terminator on lunar surface
    float dayFactor = smoothstep(-0.05, 0.10, ndotl);

    // Ambient starlight reflection on night side of Moon (earthshine / space glow)
    vec3 ambient = vec3(0.04, 0.05, 0.07);

    // Combined lunar surface lighting
    vec3 finalColor = mix(moonTex * ambient, moonTex * vec3(1.1, 1.08, 1.02), dayFactor);

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
    // Dynamic solar atmospheric pulse
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float coronaGlow = pow(rim, 2.2);

    // Solar flare ray distortion effect
    float noise = sin(vUv.x * 30.0 + u_time * 2.0) * cos(vUv.y * 30.0 + u_time * 1.5) * 0.15 + 0.85;

    vec3 coronaColor = vec3(1.0, 0.82, 0.45) * coronaGlow * noise * 2.2;
    float alpha = clamp(coronaGlow * 0.85, 0.0, 1.0);

    gl_FragColor = vec4(coronaColor, alpha);
  }
`;

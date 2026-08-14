/**
 * GLSL Shaders for Photorealistic 3D Sun Globe Photosphere and Solar Corona Atmosphere
 */

export const SUN_VERTEX_SHADER = `
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

export const SUN_FRAGMENT_SHADER = `
  uniform sampler2D u_sun_texture;
  uniform float u_time;
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  void main() {
    // Sample high-res SDO solar photosphere surface map
    vec3 sunTex = texture2D(u_sun_texture, vUv).rgb;

    // Dynamic convective solar surface plasma motion
    float plasmaTurbulence = sin(vUv.x * 40.0 + u_time * 1.8) * cos(vUv.y * 40.0 + u_time * 1.4) * 0.08 + 0.92;
    sunTex *= plasmaTurbulence;

    // Solar limb darkening (bright center core, soft darkening towards solar limb)
    vec3 viewDir = normalize(cameraPosition - vPositionWorld);
    float ndotv = max(0.0, dot(vNormalWorld, viewDir));
    float limbDarkening = pow(ndotv, 0.45);

    // Fiery solar color gradient (White-hot core -> Golden yellow -> Amber orange limb)
    vec3 coreColor = vec3(1.0, 0.98, 0.90);
    vec3 limbColor = vec3(0.98, 0.55, 0.10);
    vec3 solarSurface = mix(limbColor, sunTex * coreColor * 1.35, limbDarkening);

    // Rim solar flare glow
    float rimGlow = pow(1.0 - ndotv, 3.0);
    solarSurface += vec3(1.0, 0.70, 0.20) * rimGlow * 1.5;

    gl_FragColor = vec4(solarSurface, 1.0);
  }
`;

export const SUN_CORONA_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPositionWorld = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SUN_CORONA_FRAGMENT_SHADER = `
  uniform float u_time;
  varying vec3 vNormal;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPositionWorld);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));

    // Dynamic solar coronal streamer rays
    float rayNoise1 = sin(vUv.x * 36.0 + u_time * 2.0) * cos(vUv.y * 36.0 + u_time * 1.6) * 0.25 + 0.75;
    float rayNoise2 = sin(vUv.y * 60.0 - u_time * 3.0) * 0.15 + 0.85;
    float totalNoise = rayNoise1 * rayNoise2;

    // Volumetric corona radial falloff curve
    float coronaIntensity = pow(rim, 2.8) * totalNoise * 2.8;

    // Fiery golden-white corona color spectrum
    vec3 innerCorona = vec3(1.0, 0.95, 0.80);
    vec3 outerCorona = vec3(0.98, 0.60, 0.15);
    vec3 coronaColor = mix(outerCorona, innerCorona, pow(rim, 1.8)) * coronaIntensity;

    float alpha = clamp(coronaIntensity * 0.85, 0.0, 1.0);

    gl_FragColor = vec4(coronaColor, alpha);
  }
`;

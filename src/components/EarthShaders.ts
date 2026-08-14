/**
 * Earth3D GLSL Shader Sources
 * Extracted from Earth3D.tsx for maintainability.
 * These shaders implement the scientifically accurate Earth rendering:
 *  - Day/Night texture blending with atmospheric terminator glow
 *  - Lunar umbra + penumbra shadow projection (Besselian elements)
 *  - Deep indigo totality Chappuis/Rayleigh spectral filter
 *  - Ocean specular sun-glint reflection
 *  - Atmospheric rim glow halo (atmosphere mesh)
 */

export const EARTH_VERTEX_SHADER = `
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormalWorld = normalize(normalMatrix * normal);
    // For sphere centered at origin, normalize(position) gives exact unit surface normal vector
    vPositionWorld = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const EARTH_FRAGMENT_SHADER = `
  uniform sampler2D u_day_texture;
  uniform sampler2D u_night_texture;
  uniform sampler2D u_water_texture;
  uniform vec3 u_sun_pos;
  uniform vec3 u_umbra_pos;
  uniform float u_has_umbra;
  uniform float u_show_penumbra;
  uniform float u_show_terminator;
  uniform float u_umbra_opacity;
  uniform float u_indigo_tint_strength;
  uniform float u_contrast;
  uniform float u_brightness;
  uniform float u_gamma;
  uniform float u_saturation;
  uniform float u_night_brightness;
  uniform float u_ocean_specular;
  uniform float u_terminator_glow;
  uniform float u_umbra_ring_glow;

  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  void main() {
    vec3 dayColor = texture2D(u_day_texture, vUv).rgb;
    vec3 nightColor = texture2D(u_night_texture, vUv).rgb;
    float isWater = texture2D(u_water_texture, vUv).r;

    // 1. Crystal Clear Earth Tone (Refined photorealistic balance with manual dat.gui controls)
    vec3 luma = vec3(dot(dayColor, vec3(0.299, 0.587, 0.114)));
    dayColor = mix(luma, dayColor, u_saturation);
    dayColor = pow(dayColor, vec3(u_gamma)) * u_brightness;
    dayColor = (dayColor - 0.5) * u_contrast + 0.5;
    dayColor = max(vec3(0.0), dayColor);
    
    // Elevate deep oceans to a clear, elegant sapphire-teal balance
    if (isWater > 0.5) {
      dayColor = mix(dayColor, dayColor * vec3(0.92, 1.08, 1.25), 0.35);
    }

    // Soften night texture contrast and enhance city light warmth
    nightColor = pow(nightColor, vec3(0.80)) * u_night_brightness + vec3(0.015, 0.02, 0.03);

    // 2. Calculate Sun Illumination & Day-Night Terminator
    vec3 sunDir = normalize(u_sun_pos);
    float ndotl = dot(vPositionWorld, sunDir);
    
    // Smooth, crisp day/night terminator
    float terminatorWidth = 0.07;
    float dayFactor = smoothstep(-terminatorWidth, terminatorWidth, ndotl);
    
    if (u_show_terminator < 0.5) {
      dayFactor = 1.0;
    }

    // Warm atmospheric sunset terminator glow along the day/night boundary
    float terminatorGlow = smoothstep(-0.10, 0.03, ndotl) * (1.0 - smoothstep(0.0, 0.15, ndotl));
    vec3 sunsetTint = vec3(0.98, 0.55, 0.25); // refined sunset copper glow

    // 3. Scientifically Accurate Solar Eclipse Shadow (Umbra + Penumbra + Twilight Ring)
    float shadowDarkness = 0.0;
    float umbraRingGlow = 0.0;
    float umbraIndigoFactor = 0.0;
    
    if (u_has_umbra > 0.5 && ndotl > -0.15) {
      vec3 umbraDir = normalize(u_umbra_pos);
      vec3 toPoint = vPositionWorld - umbraDir;
      float alongSun = dot(toPoint, sunDir);
      vec3 perpVec = toPoint - alongSun * sunDir;
      float distFromAxis = length(perpVec);
      
      float umbraRadius = 0.014; // ~100 km pitch-black totality core
      float penumbraRadius = 0.58; // ~3700 km wide partial eclipse zone
      
      if (distFromAxis <= umbraRadius) {
        // Deep pitch-black totality core (only 1% ambient starlight reaches ground)
        shadowDarkness = mix(0.992, 0.965, smoothstep(0.0, umbraRadius, distFromAxis));
        umbraIndigoFactor = 1.0;
      } else if (distFromAxis < penumbraRadius && u_show_penumbra > 0.5) {
        // Non-linear scientific solar obscuration curve (proportional to overlapping lunar/solar discs)
        float t = (distFromAxis - umbraRadius) / (penumbraRadius - umbraRadius);
        float obscuration = pow(1.0 - clamp(t, 0.0, 1.0), 1.85);
        shadowDarkness = obscuration * 0.94;
        // Smooth twilight indigo falloff entering totality zone (90%+ obscuration)
        umbraIndigoFactor = smoothstep(umbraRadius * 3.8, umbraRadius * 0.4, distFromAxis);
      }
      
      // 360 degree Umbral Sunset Twilight Halo
      float ringDistance = abs(distFromAxis - umbraRadius * 1.35);
      umbraRingGlow = exp(-ringDistance * 85.0) * smoothstep(-0.05, 0.2, ndotl);
      
      // Apply configurable umbra opacity to highlight or soften path of totality
      shadowDarkness *= u_umbra_opacity;
      umbraIndigoFactor *= u_umbra_opacity;

      // Apply shadow only where sun reaches
      shadowDarkness *= smoothstep(-0.1, 0.05, ndotl);
      umbraIndigoFactor *= smoothstep(-0.1, 0.05, ndotl);
    }

    // 4. Combine day, night, and solar eclipse shadow
    float effectiveSunlight = dayFactor * (1.0 - shadowDarkness);
    vec3 finalColor = mix(nightColor, dayColor, smoothstep(0.0, 0.12, effectiveSunlight));

    // 5. Deep Indigo Totality Post-Processing Visual Filter
    if (umbraIndigoFactor > 0.001 && u_indigo_tint_strength > 0.01) {
      vec3 deepIndigoBase = vec3(0.038, 0.065, 0.195);
      vec3 midnightCobaltGlint = vec3(0.065, 0.115, 0.320);
      
      float surfaceLum = dot(finalColor, vec3(0.299, 0.587, 0.114));
      vec3 tintedTotalitySurface = mix(
        deepIndigoBase * (0.35 + surfaceLum * 1.3),
        midnightCobaltGlint + finalColor * 0.15,
        clamp(surfaceLum * 1.8, 0.0, 1.0)
      );
      
      finalColor = mix(finalColor, tintedTotalitySurface, umbraIndigoFactor * 0.88 * u_indigo_tint_strength);
    }

    // Add realistic ocean specular reflection (Sun Glint on water!)
    if (isWater > 0.5 && effectiveSunlight > 0.02) {
      vec3 viewDir = normalize(cameraPosition - (vPositionWorld * 100.0));
      vec3 halfDir = normalize(sunDir + viewDir);
      float spec = pow(max(0.0, dot(vNormalWorld, halfDir)), 32.0);
      finalColor += vec3(1.0, 0.92, 0.80) * spec * effectiveSunlight * u_ocean_specular;
    }

    // Add sunset terminator glow
    if (u_show_terminator > 0.5 && u_terminator_glow > 0.001) {
      finalColor += sunsetTint * terminatorGlow * (1.0 - shadowDarkness) * u_terminator_glow;
    }

    // Add 360 degree Umbral Twilight Ring
    if (umbraRingGlow > 0.0 && u_umbra_ring_glow > 0.001) {
      vec3 umbraHaloColor = vec3(0.96, 0.62, 0.15);
      finalColor += umbraHaloColor * umbraRingGlow * u_umbra_ring_glow;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPositionWorld;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPositionWorld = normalize(worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 u_umbra_pos;
  uniform vec3 u_sun_pos;
  uniform float u_has_umbra;
  varying vec3 vNormal;
  varying vec3 vPositionWorld;
  void main() {
    float intensity = pow(0.55 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
    
    float shadowDarkness = 0.0;
    if (u_has_umbra > 0.5) {
      vec3 umbraDir = normalize(u_umbra_pos);
      vec3 sunDir = normalize(u_sun_pos);
      vec3 toPoint = vPositionWorld - umbraDir;
      float alongSun = dot(toPoint, sunDir);
      vec3 perpVec = toPoint - alongSun * sunDir;
      float distFromAxis = length(perpVec);
      
      float umbraRadius = 0.014;
      float penumbraRadius = 0.58;
      if (distFromAxis <= umbraRadius) {
        shadowDarkness = 0.99;
      } else if (distFromAxis < penumbraRadius) {
        float t = (distFromAxis - umbraRadius) / (penumbraRadius - umbraRadius);
        shadowDarkness = pow(1.0 - clamp(t, 0.0, 1.0), 1.85) * 0.94;
      }
    }
    
    gl_FragColor = vec4(0.35, 0.65, 0.95, 1.0) * max(0.0, intensity) * 0.85 * (1.0 - shadowDarkness);
  }
`;

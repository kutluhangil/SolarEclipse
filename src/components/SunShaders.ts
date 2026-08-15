/**
 * GLSL Shaders for Photorealistic 3D Sun Globe Photosphere & Volumetric Solar Corona
 *
 * Features (Sun surface):
 *  - Solar limb darkening (Neckel & Labs 4-term polynomial approximation)
 *  - Dynamic convective granulation via Voronoi cells + FBM turbulence
 *  - Supergranule scale structure
 *  - Solar p-mode oscillation shimmer
 *  - Rotating sunspot clusters with umbra/penumbra structure
 *  - Chromospheric faculae brightening near limb
 *
 * Features (Corona):
 *  - Helmet streamer belt (equatorial concentration)
 *  - 12 radial coronal streamers with oscillation
 *  - Polar plumes
 *  - Inner-gold to outer-cyan color gradient
 */

export const SUN_VERTEX_SHADER = `
  varying vec3 vNormalWorld;
  varying vec3 vNormalView;
  varying vec2 vUv;

  void main() {
    vUv         = uv;
    vNormalWorld = normalize(normalMatrix * normal);
    vNormalView  = normalize((modelViewMatrix * vec4(normal, 0.0)).xyz);
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SUN_FRAGMENT_SHADER = `
  uniform sampler2D u_sun_texture;
  uniform float u_time;

  varying vec3 vNormalWorld;
  varying vec3 vNormalView;
  varying vec2 vUv;

  // ── Hash / Noise ──────────────────────────────────────────────────────────
  float hash2(vec2 p) {
    vec2 q = fract(p * vec2(127.1, 311.7));
    q += dot(q, q + 19.19);
    return fract(q.x * q.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm5(vec2 p) {
    float v = 0.0, a = 0.5;
    v += a * noise2(p);       a *= 0.5; p *= 2.1;
    v += a * noise2(p);       a *= 0.5; p *= 2.1;
    v += a * noise2(p);       a *= 0.5; p *= 2.1;
    v += a * noise2(p);       a *= 0.5; p *= 2.1;
    v += a * noise2(p);
    return v;
  }

  // Voronoi: returns min distance to nearest cell site
  float voronoi2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minD = 8.0;
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        vec2 n = vec2(float(dx), float(dy));
        vec2 g = hash2(i + n) * 0.85 + n;
        float d = length(f - g);
        if (d < minD) minD = d;
      }
    }
    return minD;
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  void main() {
    vec3 sunTex = texture2D(u_sun_texture, vUv).rgb;
    float t     = u_time * 0.12;

    // 1. Limb darkening — Neckel & Labs approximation
    //    μ = cos(θ) = dot(normal_view, camera_forward)
    float mu  = max(0.0, dot(vNormalView, vec3(0.0, 0.0, 1.0)));
    float mu1 = 1.0 - mu;
    float limbDk = 1.0 - 0.47 * mu1 - 0.23 * mu1 * mu1;
    limbDk = max(0.0, limbDk);

    // 2. Convective granulation (Voronoi cells)
    vec2  granUV  = vUv * 20.0 + vec2(t * 0.28, t * 0.19);
    float cell    = voronoi2(granUV);
    float turb    = fbm5(granUV * 0.7 + vec2(-t * 0.12, t * 0.21));
    float gran    = mix(cell, turb, 0.40);
    gran          = gran * gran;                          // sharpen
    float granMod = 1.0 + gran * 0.30 - 0.15;            // bright centers, dark lanes

    // 3. Supergranulation (large scale)
    float superG  = voronoi2(vUv * 5.0 + vec2(t * 0.04, -t * 0.035));
    superG        = 1.0 + superG * 0.10 - 0.05;

    // 4. p-mode oscillation shimmer
    float pMode = sin(vUv.x * 42.0 + t * 3.2) * cos(vUv.y * 42.0 + t * 2.7) * 0.035;

    // 5. Sunspot groups — three clusters at different latitudes
    //    Differential rotation: equatorial faster
    float rotAng = t * 0.020;
    float cosA = cos(rotAng), sinA = sin(rotAng);
    vec2 rUV = vUv - 0.5;
    rUV = vec2(cosA * rUV.x - sinA * rUV.y, sinA * rUV.x + cosA * rUV.y) + 0.5;

    vec2 sp0 = vec2(0.40, 0.43);
    vec2 sp1 = vec2(0.68, 0.53);
    vec2 sp2 = vec2(0.24, 0.57);
    vec2 sp3 = vec2(0.55, 0.37);

    float d0 = length(rUV - sp0);
    float d1 = length(rUV - sp1);
    float d2 = length(rUV - sp2);
    float d3 = length(rUV - sp3);

    float um = 0.013, pe = 0.032;
    // Dark inside um (umbra), medium-dark between um and pe (penumbra)
    float umb0 = 1.0 - smoothstep(0.0, um,        d0);
    float pen0 = (1.0 - smoothstep(um,  pe,        d0)) * 0.60;
    float umb1 = 1.0 - smoothstep(0.0, um,         d1);
    float pen1 = (1.0 - smoothstep(um,  pe,         d1)) * 0.55;
    float umb2 = 1.0 - smoothstep(0.0, um*0.7,    d2);
    float pen2 = (1.0 - smoothstep(um*0.7, pe*0.7, d2)) * 0.58;
    float umb3 = 1.0 - smoothstep(0.0, um*1.2,    d3);
    float pen3 = (1.0 - smoothstep(um*1.2, pe*1.2, d3)) * 0.50;
    float spots   = clamp(umb0 + umb1 + umb2 + umb3, 0.0, 1.0);
    float penumbra = clamp(pen0 + pen1 + pen2 + pen3, 0.0, 1.0) * (1.0 - spots);

    // Penumbra ring (filament zone) around spot 0
    float pRing = (1.0 - smoothstep(um, pe, d0)) * smoothstep(0.0, um * 1.1, d0);
    pRing = clamp(pRing, 0.0, 1.0);

    // 6. Chromospheric faculae (bright near limb where B-field emerges)
    float facula = fbm5(vUv * 26.0 + vec2(t * 0.27, -t * 0.14));
    facula = pow(facula, 1.5) * (1.0 - smoothstep(0.0, 0.40, mu)) * 1.5;

    // 7. Compose photosphere color
    //    Core: bright white-gold   Limb: deep amber-orange
    vec3 coreCol  = vec3(1.00, 0.98, 0.90);
    vec3 midCol   = vec3(1.00, 0.74, 0.30);
    vec3 limbCol  = vec3(0.88, 0.38, 0.08);

    vec3 solar = mix(limbCol, mix(midCol, coreCol, mu * mu), mu);
    solar = mix(solar, sunTex * coreCol * 1.25, 0.42);

    // Apply structure
    solar *= (granMod * superG + pMode);
    solar *= limbDk;
    solar += vec3(0.95, 0.85, 0.55) * facula * 0.22;

    // Sunspot darkening: umbra near-black, penumbra dark gray filaments
    vec3 umbraCol    = vec3(0.04, 0.028, 0.015);
    vec3 penumbraCol = vec3(0.28, 0.18, 0.08);
    solar = mix(solar, umbraCol,    spots    * 0.95);
    solar = mix(solar, penumbraCol, penumbra * 0.80);
    solar = mix(solar, penumbraCol, pRing    * 0.55);

    // Emission boost at centre
    solar += vec3(1.0, 0.82, 0.45) * limbDk * 0.16;

    solar = max(vec3(0.0), solar);

    gl_FragColor = vec4(solar, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Solar Corona — two transparent sphere meshes (inner + outer) with BackSide
// ─────────────────────────────────────────────────────────────────────────────

export const SUN_CORONA_VERTEX_SHADER = `
  varying vec3 vNormalView;
  varying vec2 vUv;

  void main() {
    vUv         = uv;
    vNormalView  = normalize((modelViewMatrix * vec4(normal, 0.0)).xyz);
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SUN_CORONA_FRAGMENT_SHADER = `
  uniform float u_time;
  uniform float u_corona_radius; // 0 = inner shell, 1 = outer shell

  varying vec3 vNormalView;
  varying vec2 vUv;

  float hash2c(vec2 p) {
    vec2 q = fract(p * vec2(127.1, 311.7));
    q += dot(q, q + 19.19);
    return fract(q.x * q.y);
  }
  float noise2c(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2c(i), hash2c(i + vec2(1,0)), u.x),
      mix(hash2c(i + vec2(0,1)), hash2c(i + vec2(1,1)), u.x),
      u.y
    );
  }

  void main() {
    float t = u_time * 0.55;

    // Rim glow factor
    float rim = 1.0 - max(0.0, dot(vNormalView, vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 2.1);

    // Helmet streamer belt — concentrated at solar equator (y ≈ 0.5 in UV)
    float lat   = (vUv.y - 0.5) * 3.14159;
    float belt  = exp(-lat * lat * 7.5);

    // Radial streamer rays — 12 primary, angular azimuth variation
    float phi   = vUv.x * 6.28318;
    float rays  = 0.0;

    float ang0  = t * 0.07;
    float w0    = 0.18;
    float d0    = abs(mod(phi - ang0,                     6.28318) - 3.14159);
    float d1    = abs(mod(phi - ang0 + 0.5236,            6.28318) - 3.14159);
    float d2    = abs(mod(phi - ang0 + 1.0472,            6.28318) - 3.14159);
    float d3    = abs(mod(phi - ang0 + 1.5708,            6.28318) - 3.14159);
    float d4    = abs(mod(phi - ang0 + 2.0944,            6.28318) - 3.14159);
    float d5    = abs(mod(phi - ang0 + 2.6180,            6.28318) - 3.14159);
    float d6    = abs(mod(phi - ang0 + 3.1416,            6.28318) - 3.14159);
    float d7    = abs(mod(phi - ang0 + 3.6652,            6.28318) - 3.14159);
    float d8    = abs(mod(phi - ang0 + 4.1888,            6.28318) - 3.14159);
    float d9    = abs(mod(phi - ang0 + 4.7124,            6.28318) - 3.14159);
    float d10   = abs(mod(phi - ang0 + 5.2360,            6.28318) - 3.14159);
    float d11   = abs(mod(phi - ang0 + 5.7596,            6.28318) - 3.14159);

    rays += exp(-d0  * d0  / (w0 * w0));
    rays += exp(-d1  * d1  / (w0 * w0)) * 0.85;
    rays += exp(-d2  * d2  / (w0 * w0)) * 0.90;
    rays += exp(-d3  * d3  / (w0 * w0)) * 0.75;
    rays += exp(-d4  * d4  / (w0 * w0)) * 0.80;
    rays += exp(-d5  * d5  / (w0 * w0)) * 0.88;
    rays += exp(-d6  * d6  / (w0 * w0)) * 0.72;
    rays += exp(-d7  * d7  / (w0 * w0)) * 0.82;
    rays += exp(-d8  * d8  / (w0 * w0)) * 0.90;
    rays += exp(-d9  * d9  / (w0 * w0)) * 0.78;
    rays += exp(-d10 * d10 / (w0 * w0)) * 0.86;
    rays += exp(-d11 * d11 / (w0 * w0)) * 0.70;

    rays *= belt;

    // Polar plumes (narrow beams at poles)
    float pN = exp(-((vUv.y - 0.93) * (vUv.y - 0.93)) / 0.003) * 0.55;
    float pS = exp(-((vUv.y - 0.07) * (vUv.y - 0.07)) / 0.003) * 0.55;

    // Turbulence
    float turb = noise2c(vec2(vUv.x * 5.5 + t * 0.18, vUv.y * 3.5 + t * 0.12)) * 0.4 + 0.6;

    // Final intensity
    float intensity = rim * (0.40 + rays * 0.55 + (pN + pS) * 0.30) * turb;

    // Color: inner warm gold → outer pale cyan-white
    float r       = u_corona_radius;
    vec3 inner    = vec3(1.00, 0.80, 0.38);
    vec3 outer    = vec3(0.80, 0.92, 1.00);
    vec3 col      = mix(inner, outer, r * r);
    col           = mix(col, vec3(1.00, 0.75, 0.32), rays * 0.22 * (1.0 - r));

    float alpha = clamp(intensity * mix(0.95, 0.28, r), 0.0, 1.0);

    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/**
 * GLSL Shaders for Photorealistic 3D Moon surface and 3D Solar Corona
 */

export const MOON_VERTEX_SHADER = `
  varying vec3 vNormalWorld;
  varying vec3 vPositionWorld;
  varying vec2 vUv;

  // Simple 3D noise function for procedural topography
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  // Fractal Brownian Motion for rugged lunar terrain
  float fbm(vec3 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 4; i++) {
      f += w * snoise(p);
      p *= 2.5;
      w *= 0.45;
    }
    return f;
  }

  void main() {
    vUv = uv;
    
    // Generate procedural lunar topography (mountains and craters) based on spherical coordinates
    // We sample noise based on the normalized position to wrap seamlessly around the sphere
    vec3 pNorm = normalize(position);
    float displacement = fbm(pNorm * 12.0) * 0.12; 
    
    // Deform the vertex outward/inward along its normal to create rugged limb profile for Baily's Beads
    vec3 deformedPosition = position + normal * displacement;

    vNormalWorld = normalize(normalMatrix * normal); // Ideally we'd recalculate normals for lighting, but for silhouette/limb it's fine
    vPositionWorld = (modelMatrix * vec4(deformedPosition, 1.0)).xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
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

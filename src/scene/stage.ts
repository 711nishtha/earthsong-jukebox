import { gsap } from 'gsap';
import * as THREE from 'three';
import { duration, ease, nebula as NEBULA } from '../design/tokens';

/**
 * The WebGL "stage" behind the page: a procedural nebula and a starfield you can fly through.
 * Purely decorative (the canvas is aria-hidden); every control lives in the HTML layer.
 * It never touches audio, so rendering hiccups can't glitch the sound.
 */
export interface Stage {
  /** Fly through the galaxy: stars streak, then settle. Resolves when done. */
  warp(seconds?: number): Promise<void>;
  /** Cross-fade the nebula to a palette from tokens.nebula. */
  setPalette(key: string, seconds?: number): void;
  /** 0–1 activity from the data: brightens the nebula and speeds the star drift. */
  setEnergy(x: number): void;
  /**
   * A soft swell of light for a percussive data event (0–1). Capped in brightness and rate;
   * callers must not pulse in Calm mode or when "Reduce flashing" is on.
   */
  pulse(strength: number): void;
  setCalm(calm: boolean): void;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** Called every frame with seconds since last frame (for Phase 2 objects). */
  onFrame(fn: (dt: number, t: number) => void): () => void;
  dispose(): void;
}

export interface StageOptions {
  calm: boolean;
  /** The device can't keep up even at the lowest quality: switch to the CSS fallback. */
  onLowPerf?: () => void;
}

const DEPTH = 220;
const IDLE_SPEED = 0.8;

const NOISE = /* glsl */ `
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
`;

const nebulaFrag = /* glsl */ `
  precision highp float;
  uniform float uTime, uEnergy, uWarp, uGrain, uPulse;
  uniform vec2 uRes, uParallax;
  uniform vec3 uC1, uC2, uC3;
  ${NOISE}
  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 p = uv * 1.5 + uParallax * 0.04;
    float t = uTime * (0.012 + 0.02 * uEnergy);
    float n1 = fbm(p * 1.1 + vec2(t, -t * 0.7));
    float n2 = fbm(p * 2.2 - vec2(t * 0.6, t) + n1 * 1.3);
    float n3 = fbm(p * 0.7 + n2 * 0.8 + vec2(-t * 0.4, 0.0));
    vec3 col = vec3(0.020, 0.024, 0.039);
    col += uC1 * smoothstep(0.28, 0.95, n1) * 1.9;
    col += uC2 * smoothstep(0.36, 1.00, n2) * 1.7;
    col += uC3 * smoothstep(0.40, 1.00, n3) * 1.4;
    col += (uC2 + uC3) * pow(smoothstep(0.55, 1.0, n2 * n1 * 1.6), 2.0) * 1.2; // brighter cores
    // faint dust lanes
    col *= 0.82 + 0.18 * smoothstep(0.2, 0.8, fbm(p * 4.0 + 3.0));
    col *= 0.8 + 0.45 * uEnergy;
    float r = length(uv);
    col += uWarp * 0.22 * vec3(0.55, 0.65, 1.0) * smoothstep(1.0, 0.0, r);
    col += uPulse * 0.09 * (uC2 + uC3) * 6.0 * smoothstep(1.1, 0.1, r); // soft, low-contrast swell
    col *= smoothstep(1.35, 0.15, r);                                   // vignette
    col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 311.0) - 0.5) * uGrain; // film grain
    gl_FragColor = vec4(col, 1.0);
  }
`;

const starVert = /* glsl */ `
  uniform float uTravel, uPixelRatio, uTime, uTwinkle;
  attribute float aSize, aPhase;
  attribute vec3 aTint;
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTravel, ${DEPTH.toFixed(1)}) - ${DEPTH.toFixed(1)};
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = mix(1.0, 0.7 + 0.3 * sin(uTime * 1.3 + aPhase), uTwinkle);
    gl_PointSize = clamp(aSize * uPixelRatio * (55.0 / -mv.z), 0.0, 6.0 * uPixelRatio);
    vAlpha = tw * smoothstep(-${DEPTH.toFixed(1)}, -${(DEPTH * 0.65).toFixed(1)}, p.z) * smoothstep(-0.5, -6.0, p.z);
    vTint = aTint;
  }
`;
const starFrag = /* glsl */ `
  precision mediump float;
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vTint * a, a * vAlpha);
  }
`;
const streakVert = /* glsl */ `
  uniform float uTravel, uStreak;
  attribute float aEnd;
  attribute vec3 aTint;
  varying vec3 vTint;
  varying float vFade;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTravel, ${DEPTH.toFixed(1)}) - ${DEPTH.toFixed(1)};
    float head = p.z;
    p.z -= aEnd * uStreak;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    // bright at the head, fading along the tail; fade in from the far distance
    vFade = mix(1.0, 0.0, aEnd) * smoothstep(-${DEPTH.toFixed(1)}, -${(DEPTH * 0.75).toFixed(1)}, head);
    vTint = aTint;
  }
`;
const streakFrag = /* glsl */ `
  precision mediump float;
  uniform float uAlpha;
  varying vec3 vTint;
  varying float vFade;
  void main() { gl_FragColor = vec4(vTint * 1.6, vFade * uAlpha); }
`;

/**
 * Palette colours go to the shader as plain sRGB 0–1 values. THREE.Color(hex) would convert to
 * linear, and our raw ShaderMaterial writes straight to the screen, which made the nebula near-black.
 */
const hexToVec3 = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Color().setRGB(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, THREE.LinearSRGBColorSpace);
};

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function createStage(canvas: HTMLCanvasElement, opts: StageOptions): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.autoClear = false;

  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4 || /Android|iPhone|iPad/i.test(navigator.userAgent);
  let starCount = lowEnd ? 2500 : 6000;

  // Background nebula: one full-screen triangle with its own camera.
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pal = NEBULA.intro.map(hexToVec3);
  const nebulaMat = new THREE.ShaderMaterial({
    fragmentShader: nebulaFrag,
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    uniforms: {
      uTime: { value: 0 }, uEnergy: { value: 0.35 }, uWarp: { value: 0 }, uGrain: { value: 0.03 }, uPulse: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) }, uParallax: { value: new THREE.Vector2() },
      uC1: { value: pal[0] }, uC2: { value: pal[1] }, uC3: { value: pal[2] },
    },
    depthWrite: false,
    depthTest: false,
  });
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  bgScene.add(new THREE.Mesh(tri, nebulaMat));

  // Foreground: stars (and, in Phase 2, Earth).
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

  const starUniforms = {
    uTravel: { value: 0 }, uPixelRatio: { value: pixelRatio }, uTime: { value: 0 }, uTwinkle: { value: opts.calm ? 0 : 1 },
  };
  const streakUniforms = { uTravel: starUniforms.uTravel, uStreak: { value: 0 }, uAlpha: { value: 0 } };
  let stars: THREE.Points | null = null;
  let streaks: THREE.LineSegments | null = null;
  /** Survives buildStars() (adaptive quality can rebuild geometry mid-warp). */
  let warping = false;

  function buildStars(n: number) {
    if (stars) { scene.remove(stars); stars.geometry.dispose(); }
    if (streaks) { scene.remove(streaks); streaks.geometry.dispose(); }
    const pos = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n), tint = new Float32Array(n * 3);
    const tints = [[0.85, 0.9, 1.0], [1.0, 0.92, 0.8], [0.75, 0.85, 1.0], [1.0, 1.0, 1.0]];
    for (let i = 0; i < n; i++) {
      // A wide tube around the line of flight; keep a clear corridor so nothing hits the camera.
      const r = 6 + Math.pow(Math.random(), 0.6) * 90, a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, Math.sin(a) * r, -Math.random() * DEPTH], i * 3);
      size[i] = 0.9 + Math.pow(Math.random(), 3) * 3.2;
      phase[i] = Math.random() * 6.28;
      tint.set(tints[(Math.random() * tints.length) | 0], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    stars = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: starVert, fragmentShader: starFrag, uniforms: starUniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(stars);

    // Streaks: every star as a 2-vertex line whose tail stretches with speed during the warp.
    const lp = new Float32Array(n * 6), le = new Float32Array(n * 2), lt = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      lp.set(pos.subarray(i * 3, i * 3 + 3), i * 6);
      lp.set(pos.subarray(i * 3, i * 3 + 3), i * 6 + 3);
      le[i * 2] = 0; le[i * 2 + 1] = 1;
      lt.set(tint.subarray(i * 3, i * 3 + 3), i * 6);
      lt.set(tint.subarray(i * 3, i * 3 + 3), i * 6 + 3);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lg.setAttribute('aEnd', new THREE.BufferAttribute(le, 1));
    lg.setAttribute('aTint', new THREE.BufferAttribute(lt, 3));
    streaks = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
      vertexShader: streakVert, fragmentShader: streakFrag, uniforms: streakUniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    streaks.visible = warping;
    scene.add(streaks);
  }
  buildStars(starCount);

  let calm = opts.calm;
  const motion = { speed: calm ? 0 : IDLE_SPEED };
  let energy = 0.35;
  let lastPulseAt = 0;
  const pointer = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  const onPointer = (e: PointerEvent) => pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
  addEventListener('pointermove', onPointer, { passive: true });

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    nebulaMat.uniforms.uRes.value.set(w * pixelRatio, h * pixelRatio);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const frameHooks = new Set<(dt: number, t: number) => void>();
  const clock = new THREE.Clock();
  let raf = 0, elapsed = 0;
  // Adaptive quality: average frame time over a window, then step DPR / star count down.
  let acc = 0, frames = 0, degradeSteps = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;
    starUniforms.uTime.value = elapsed;
    // Data activity speeds the drift a little (never during the warp tween, which owns motion.speed).
    starUniforms.uTravel.value += motion.speed * (warping ? 1 : 1 + 2.5 * energy) * dt;
    nebulaMat.uniforms.uPulse.value *= Math.exp(-dt / 0.35); // pulses fade in ~1 s
    streakUniforms.uStreak.value = motion.speed * 0.09; // tails stretch with speed
    nebulaMat.uniforms.uTime.value = calm ? 0 : elapsed;
    if (!calm) parallax.lerp(pointer, 0.03);
    nebulaMat.uniforms.uParallax.value.copy(parallax);
    camera.rotation.set(-parallax.y * 0.05, -parallax.x * 0.08, 0);
    frameHooks.forEach((fn) => fn(dt, elapsed));
    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.render(scene, camera);

    acc += dt; frames++;
    if (acc > 2) {
      const avg = acc / frames;
      acc = 0; frames = 0;
      if (avg > 1 / 45 && degradeSteps < 3) {
        degradeSteps++;
        if (pixelRatio > 1) pixelRatio = Math.max(1, pixelRatio - 0.5);
        else starCount = Math.max(1200, Math.floor(starCount / 2));
        renderer.setPixelRatio(pixelRatio);
        starUniforms.uPixelRatio.value = pixelRatio;
        buildStars(starCount);
        resize();
      } else if (avg > 1 / 24 && degradeSteps >= 3) {
        opts.onLowPerf?.();
      }
    }
  }
  const onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { clock.getDelta(); raf = requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(frame);

  let palTween: gsap.core.Tween | null = null;

  return {
    scene,
    camera,
    warp(seconds = duration.warp) {
      if (calm) return Promise.resolve();
      warping = true;
      streaks!.visible = true;
      return new Promise((resolve) => {
        gsap.timeline({ onComplete: () => { warping = false; streaks!.visible = false; resolve(); } })
          .to(motion, { speed: 160, duration: seconds * 0.45, ease: 'expo.in' }, 0)
          .to(streakUniforms.uAlpha, { value: 0.9, duration: seconds * 0.4, ease: ease.outQuart }, 0)
          .to(nebulaMat.uniforms.uWarp, { value: 1, duration: seconds * 0.45, ease: 'expo.in' }, 0)
          .to(motion, { speed: IDLE_SPEED, duration: seconds * 0.55, ease: ease.outExpo }, seconds * 0.45)
          .to(streakUniforms.uAlpha, { value: 0, duration: seconds * 0.5, ease: ease.outExpo }, seconds * 0.45)
          .to(nebulaMat.uniforms.uWarp, { value: 0, duration: seconds * 0.55, ease: ease.outExpo }, seconds * 0.45);
      });
    },
    setPalette(key, seconds = duration.slow) {
      const target = (NEBULA[key] ?? NEBULA.intro).map(hexToVec3);
      palTween?.kill();
      const from = [0, 1, 2].map((i) => (nebulaMat.uniforms[`uC${i + 1}`].value as THREE.Color).clone());
      const mix = { t: 0 };
      palTween = gsap.to(mix, {
        t: 1, duration: calm ? duration.crossfade : seconds, ease: ease.inOutQuart,
        onUpdate: () => [0, 1, 2].forEach((i) => (nebulaMat.uniforms[`uC${i + 1}`].value as THREE.Color).lerpColors(from[i], target[i], mix.t)),
      });
    },
    setEnergy(x) {
      energy = Math.max(0, Math.min(1, x));
      gsap.to(nebulaMat.uniforms.uEnergy, { value: energy, duration: 0.6, ease: 'sine.out', overwrite: true });
    },
    pulse(strength) {
      const now = performance.now();
      if (calm || now - lastPulseAt < 300) return; // at most ~3 pulses a second
      lastPulseAt = now;
      nebulaMat.uniforms.uPulse.value = Math.min(1, nebulaMat.uniforms.uPulse.value + Math.min(1, strength) * 0.8);
    },
    setCalm(c) {
      calm = c;
      starUniforms.uTwinkle.value = c ? 0 : 1;
      motion.speed = c ? 0 : IDLE_SPEED;
      if (c) parallax.set(0, 0);
    },
    onFrame(fn) {
      frameHooks.add(fn);
      return () => frameHooks.delete(fn);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.dispose();
    },
  };
}

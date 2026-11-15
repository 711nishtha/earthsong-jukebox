import { gsap } from 'gsap';
import * as THREE from 'three';
import { duration, ease } from '../design/tokens';
import type { Stage } from './stage';

/**
 * Earth and its five "track moons", added to the stage scene. Decorative and mirrored: every
 * moon corresponds to a real radio button in the HTML, so nothing here is needed to use the app.
 *
 * Texture honesty: the idle globe is a land/ocean mask derived from SVS 3912 (no invented city
 * lights or imagery). When a track's visualization is a true 2:1 equirectangular map, its
 * live video is wrapped onto the globe so the globe *becomes* the data.
 */
export interface Earth {
  reveal(): void;
  setAccent(hex: string): void;
  /** Live data on the globe: a same-origin <video> showing an equirectangular map, or null. */
  setVideo(video: HTMLVideoElement | null): void;
  /** 0–1 from the analysis (Phase 3): halo intensity and breathing. */
  setEnergy(x: number): void;
  setSelected(index: number): void;
  /** 0–1: fades the globe as the page scrolls away from it. */
  setPresence(x: number): void;
  /** The globe centres itself in this element's box (an empty layout slot), every frame. */
  setAnchor(el: HTMLElement | null): void;
  /** orbit = globe + moons (chooser); focus = globe alone, filling its slot (the data on the globe). */
  setMode(mode: 'orbit' | 'focus'): void;
  /** Screen positions (CSS px) of the moons, for the HTML hover cards; null when hidden. */
  moonPositions(): ({ x: number; y: number; r: number; front: boolean } | null)[];
  dispose(): void;
}

const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const earthFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uLand, uVideo;
  uniform float uVideoMix, uTime, uEnergy, uOpacity;
  uniform vec3 uSun, uAccent;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float land = texture2D(uLand, vUv).r;
    float light = clamp(dot(vNormal, normalize(uSun)), 0.0, 1.0);
    float day = smoothstep(-0.15, 0.35, dot(vNormal, normalize(uSun)));
    vec3 ocean = mix(vec3(0.012, 0.035, 0.07), vec3(0.03, 0.09, 0.16), light);
    vec3 ground = mix(vec3(0.05, 0.06, 0.08), vec3(0.32, 0.36, 0.42), light);
    vec3 col = mix(ocean, ground, land);
    // coastline hairline in the accent colour, strongest on the night side
    float coast = smoothstep(0.25, 0.5, land) * (1.0 - smoothstep(0.5, 0.75, land));
    col += uAccent * coast * (0.25 + 0.35 * (1.0 - day));
    // live data map, kept bright so the visualization reads, with gentle shading
    vec3 data = texture2D(uVideo, vUv).rgb;
    col = mix(col, data * (0.55 + 0.6 * day), uVideoMix);
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.0);
    col += uAccent * fres * (0.16 + 0.3 * uEnergy);
    gl_FragColor = vec4(col, uOpacity);
  }
`;
const atmoFrag = /* glsl */ `
  precision mediump float;
  uniform vec3 uAccent;
  uniform float uEnergy, uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Back faces of a shell just larger than Earth: -dot(N,V) runs from ~0.41 at Earth's limb
    // to 0 at the shell's rim, so the glow is brightest at the limb and fades to nothing outward.
    float f = pow(smoothstep(0.0, 0.41, -dot(vNormal, vView)), 1.7);
    gl_FragColor = vec4(uAccent * f * (0.5 + 0.8 * uEnergy), f * uOpacity * 0.9);
  }
`;

const ORBIT_R = 2.05;

const moonGlowFrag = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(smoothstep(0.0, 0.66, -dot(vNormal, vView)), 2.2); // fades to 0 at the halo rim
    gl_FragColor = vec4(uColor * f * 1.1, f * uOpacity);
  }
`;

/** Region of a poster to wrap onto a moon: [u, v, width, height] in 0–1 texture space. */
export type Crop = [number, number, number, number];

export function createEarth(stage: Stage, posters: string[], crops: Crop[], accents: string[], landUrl: string, calm: () => boolean): Earth {
  const group = new THREE.Group();
  group.visible = false;
  stage.scene.add(group);
  const loader = new THREE.TextureLoader();
  const land = loader.load(landUrl);
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;

  const accent = new THREE.Color('#5fd4c8');
  const uniforms = {
    uLand: { value: land }, uVideo: { value: blank as THREE.Texture }, uVideoMix: { value: 0 },
    uTime: { value: 0 }, uEnergy: { value: 0.3 }, uOpacity: { value: 0 },
    uSun: { value: new THREE.Vector3(-0.6, 0.35, 0.8) }, uAccent: { value: accent },
  };
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.ShaderMaterial({ vertexShader: earthVert, fragmentShader: earthFrag, uniforms, transparent: true }),
  );
  // Lon −180 at the texture's left edge; turn so the Atlantic/Africa face the viewer first.
  earth.rotation.y = -Math.PI / 2;
  group.add(earth);

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.09, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: earthVert, fragmentShader: atmoFrag,
      uniforms: { uAccent: uniforms.uAccent, uEnergy: uniforms.uEnergy, uOpacity: uniforms.uOpacity },
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  group.add(atmo);

  // Orbit ring (hairline) and moons.
  const orbitTilt = new THREE.Group();
  orbitTilt.rotation.set(1.18, 0, 0.22);
  group.add(orbitTilt);
  const ringPts = Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0);
  });
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }),
  );
  orbitTilt.add(ring);

  const moons = posters.map((src, i) => {
    const tex = loader.load(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Globe-render posters are mostly black space: sample just the lit globe in the middle.
    const [u, v, cw, ch] = crops[i];
    tex.offset.set(u, v);
    tex.repeat.set(cw, ch);
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 32, 24),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 }),
    );
    m.userData.phase = (i / posters.length) * Math.PI * 2;
    // Soft rim glow in the track's accent, so dark-background posters still read as moons.
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 24),
      new THREE.ShaderMaterial({
        vertexShader: earthVert, fragmentShader: moonGlowFrag, side: THREE.BackSide, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(accents[i]) }, uOpacity: { value: 0 } },
      }),
    );
    m.add(glow);
    m.userData.glow = glow;
    orbitTilt.add(m);
    return m;
  });

  let selected = 0, presence = 1, orbitAngle = 0;
  let anchor: HTMLElement | null = null;
  let mode: 'orbit' | 'focus' = 'orbit';
  let moonsAlpha = 1;
  let videoTex: THREE.VideoTexture | null = null;
  const tmp = new THREE.Vector3();

  const DEPTH = 6.2;
  /** Project the anchor element's box into the 3D scene so CSS layout decides where Earth goes. */
  function layout() {
    const cam = stage.camera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * DEPTH;
    const halfW = halfH * cam.aspect;
    if (!anchor) {
      group.position.set(0, 0, -DEPTH);
      return;
    }
    const r = anchor.getBoundingClientRect();
    const nx = ((r.left + r.width / 2) / innerWidth) * 2 - 1;
    const ny = -(((r.top + r.height / 2) / innerHeight) * 2 - 1);
    // Fit the whole orbit (radius ≈ ORBIT_R + moon) inside the slot.
    const fitPx = Math.min(r.width, r.height) / 2;
    const worldPerPx = (2 * halfH) / innerHeight;
    const radius = mode === 'orbit' ? ORBIT_R + 0.35 : 1.18;
    const target = Math.max(0.2, (fitPx * worldPerPx) / radius);
    // Ease between slots/modes rather than jumping.
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x || target, target, 0.12));
    group.position.lerp(tmp.set(nx * halfW, ny * halfH, -DEPTH), 0.12);
  }

  const off = stage.onFrame((dt, t) => {
    if (!group.visible) return;
    layout();
    uniforms.uTime.value = t;
    if (!calm()) {
      earth.rotation.y += dt * 0.035;
      orbitAngle += dt * 0.06;
      uniforms.uSun.value.set(Math.cos(t * 0.02) * -0.6, 0.35, Math.sin(t * 0.02) * 0.4 + 0.8);
    }
    moons.forEach((m, i) => {
      const a = m.userData.phase + orbitAngle;
      m.position.set(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0);
      const target = i === selected ? 1.55 : 1;
      m.scale.lerp(tmp.setScalar(target), 0.08);
      const mm = m.material as THREE.MeshBasicMaterial;
      mm.opacity = Math.min(presence, moonsAlpha);
      const gm = (m.userData.glow as THREE.Mesh).material as THREE.ShaderMaterial;
      gm.uniforms.uOpacity.value = mm.opacity * (i === selected ? 1 : 0.45);
      m.rotation.y += dt * 0.2;
    });
  });

  return {
    reveal() {
      group.visible = true;
      layout();
      const d = calm() ? duration.crossfade : duration.reveal * 1.6;
      gsap.fromTo(uniforms.uOpacity, { value: 0 }, { value: presence, duration: d, ease: ease.outQuart });
      if (!calm()) gsap.fromTo(group.rotation, { y: -0.6 }, { y: 0, duration: d, ease: ease.outExpo });
      moons.forEach((m, i) =>
        gsap.to(m.material, { opacity: presence, duration: d, delay: calm() ? 0 : 0.6 + i * 0.12, ease: ease.outQuart }),
      );
      gsap.to(ring.material, { opacity: 0.14 * presence, duration: d, delay: calm() ? 0 : 0.4 });
    },
    setAccent(hex) {
      gsap.to(accent, { r: new THREE.Color(hex).r, g: new THREE.Color(hex).g, b: new THREE.Color(hex).b, duration: duration.slow, ease: ease.inOutQuart });
    },
    setVideo(video) {
      videoTex?.dispose();
      videoTex = null;
      if (video) {
        videoTex = new THREE.VideoTexture(video);
        videoTex.colorSpace = THREE.SRGBColorSpace;
        uniforms.uVideo.value = videoTex;
        gsap.to(uniforms.uVideoMix, { value: 1, duration: calm() ? duration.crossfade : duration.slow, ease: ease.inOutQuart });
      } else {
        gsap.to(uniforms.uVideoMix, {
          value: 0, duration: duration.base, ease: ease.inOutQuart,
          onComplete: () => void (uniforms.uVideo.value = blank),
        });
      }
    },
    setEnergy(x) {
      uniforms.uEnergy.value = Math.max(0, Math.min(1, x));
    },
    setSelected(i) {
      selected = i;
    },
    setAnchor(el) {
      anchor = el;
    },
    setMode(m) {
      if (m === mode) return;
      mode = m;
      // In focus mode the globe belongs to the player, so the hero's scroll fade must not hide it.
      gsap.to(uniforms.uOpacity, { value: m === 'focus' ? 1 : presence, duration: duration.base, ease: ease.inOutQuart, overwrite: true });
      const fade = { a: moonsAlpha };
      gsap.to(fade, {
        a: m === 'orbit' ? 1 : 0, duration: duration.base, ease: ease.inOutQuart, overwrite: true,
        onUpdate: () => {
          moonsAlpha = fade.a;
          (ring.material as THREE.LineBasicMaterial).opacity = 0.14 * Math.min(presence, moonsAlpha);
        },
      });
    },
    setPresence(x) {
      presence = Math.max(0, Math.min(1, x));
      if (!group.visible || mode === 'focus') return;
      uniforms.uOpacity.value = presence;
      (ring.material as THREE.LineBasicMaterial).opacity = 0.14 * Math.min(presence, moonsAlpha);
    },
    moonPositions() {
      if (!group.visible || presence < 0.3 || moonsAlpha < 0.5) return moons.map(() => null);
      const w = innerWidth, h = innerHeight;
      return moons.map((m) => {
        m.getWorldPosition(tmp);
        const depth = tmp.z;
        tmp.project(stage.camera);
        return {
          x: (tmp.x * 0.5 + 0.5) * w,
          y: (-tmp.y * 0.5 + 0.5) * h,
          r: Math.max(18, (0.17 * m.scale.x * group.scale.x * innerHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)) * -depth)),
          front: depth > group.position.z - 0.2, // in front of the globe's centre
        };
      });
    },
    dispose() {
      off();
      videoTex?.dispose();
      stage.scene.remove(group);
    },
  };
}

import { useEffect, useRef, useState } from 'react';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script is already added
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', resolve);
        existing.addEventListener('error', reject);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function SingularityLoader() {
  const mountRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [mainTitle, setMainTitle] = useState('Stable Singularity');
  const [statusText, setStatusText] = useState('Topology: Nominal');
  const [statusColor, setStatusColor] = useState('#00f3ff');
  const [velVal, setVelVal] = useState('0.45c');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;
    let cleanup = () => {};

    const init = async () => {
      try {
        // Load scripts sequentially
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');

        if (!active) return;
        setLoaded(true);

        const THREE = window.THREE;
        const gsap = window.gsap;

        const container = mountRef.current;
        if (!container) return;

        const width = container.clientWidth || window.innerWidth;
        const height = 520;

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
        camera.position.set(60, 30, 60);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.6;
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.03;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;

        // Noise Chunk
        const noiseChunk = `
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
                vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
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
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
            }
        `;

        const coreGroup = new THREE.Group();
        scene.add(coreGroup);

        const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const bhGeo = new THREE.SphereGeometry(4, 64, 64);
        const bhMesh = new THREE.Mesh(bhGeo, bhMat);
        coreGroup.add(bhMesh);

        const auraMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uIntensity: { value: 1.0 } },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vView;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vView = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uIntensity;
                varying vec3 vNormal;
                varying vec3 vView;
                void main() {
                    float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 4.0);
                    gl_FragColor = vec4(vec3(1.0, 0.45, 0.1) * rim * uIntensity * 5.0, 1.0);
                }
            `,
            side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending
        });
        const auraGeo = new THREE.SphereGeometry(4.25, 64, 64);
        const auraMesh = new THREE.Mesh(auraGeo, auraMat);
        coreGroup.add(auraMesh);

        const instanceCount = 5000;
        const streakGeo = new THREE.CylinderGeometry(0.01, 0.12, 2.2, 3);
        streakGeo.rotateX(Math.PI / 2);
        
        const diskMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorph: { value: 0.1 },
                uCompression: { value: 1.0 },
                uIntensity: { value: 1.0 },
                uOrbitScale: { value: 1.0 }
            },
            vertexShader: `
                ${noiseChunk}
                uniform float uTime;
                uniform float uMorph;
                uniform float uCompression;
                uniform float uIntensity;
                uniform float uOrbitScale;
                varying vec3 vColor;
                varying float vOpacity;
                void main() {
                    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                    float rOriginal = length(instPos.xz);
                    float r = rOriginal * uCompression;
                    float initialAngle = atan(instPos.z, instPos.x);
                    float orbitalVelocity = (1.5 / sqrt(rOriginal)) * uOrbitScale;
                    float currentAngle = initialAngle + (uTime * orbitalVelocity);
                    vec3 morphedWorldPos = vec3(cos(currentAngle) * r, instPos.y, sin(currentAngle) * r);
                    float noise = snoise(vec3(morphedWorldPos.x * 0.08, morphedWorldPos.z * 0.08, uTime * 0.3));
                    morphedWorldPos.y += noise * uMorph * 4.0;
                    vec3 viewDir = normalize(cameraPosition - morphedWorldPos);
                    vec3 orbitDir = normalize(vec3(-sin(currentAngle), 0.0, cos(currentAngle)));
                    float doppler = dot(orbitDir, viewDir);
                    vec3 hot = vec3(1.0, 0.95, 0.9);
                    vec3 warm = vec3(1.0, 0.45, 0.1);
                    vec3 cool = vec3(0.1, 0.35, 1.0);
                    vec3 color = mix(cool, warm, smoothstep(45.0, 12.0, r));
                    color = mix(color, hot, smoothstep(10.0, 4.0, r));
                    vColor = color * (1.3 + doppler * 0.7) * uIntensity;
                    vOpacity = (smoothstep(3.8, 5.5, r) * (1.0 - smoothstep(38.0, 48.0, r))) * 0.8;
                    float deltaAngle = currentAngle - initialAngle;
                    float c = cos(deltaAngle);
                    float s = sin(deltaAngle);
                    mat3 rotY = mat3(
                        c, 0, s,
                        0, 1, 0,
                       -s, 0, c
                    );
                    vec3 localPos = (instanceMatrix * vec4(position, 0.0)).xyz;
                    vec3 rotatedLocalPos = rotY * localPos;
                    gl_Position = projectionMatrix * viewMatrix * vec4(morphedWorldPos + rotatedLocalPos, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vOpacity;
                void main() {
                    gl_FragColor = vec4(vColor, vOpacity);
                }
            `,
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        });

        const instancedDisk = new THREE.InstancedMesh(streakGeo, diskMaterial, instanceCount);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < instanceCount; i++) {
            const r = 5 + Math.pow(Math.random(), 1.3) * 40;
            const angle = Math.random() * Math.PI * 2;
            dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * (8 / r), Math.sin(angle) * r);
            dummy.lookAt(dummy.position.x + Math.sin(angle), dummy.position.y, dummy.position.z - Math.cos(angle));
            dummy.updateMatrix();
            instancedDisk.setMatrixAt(i, dummy.matrix);
        }
        scene.add(instancedDisk);

        const config = [
            { 
                title: "Stable Singularity", status: "Topology: Nominal", 
                morph: 0.1, compress: 1.0, intensity: 1.0, rotate: 0.4, camY: 25, camDist: 85, orbit: 1.0,
                color: "#00f3ff", vel: "0.45c"
            },
            { 
                title: "Accretion Turbulence", status: "Topology: Fluctuating", 
                morph: 4.5, compress: 1.15, intensity: 1.4, rotate: 1.5, camY: 45, camDist: 95, orbit: 1.8,
                color: "#ffaa00", vel: "0.78c"
            },
            { 
                title: "Relativistic Collapse", status: "Topology: Critical", 
                morph: 0.8, compress: 0.38, intensity: 3.5, rotate: 5.0, camY: 12, camDist: 55, orbit: 4.5,
                color: "#ff0044", vel: "0.99c"
            }
        ];

        let stateIdx = 0;
        const camControl = { distance: 85 };

        const intervalId = setInterval(() => {
          if (!active) return;
          stateIdx = (stateIdx + 1) % config.length;
          const s = config[stateIdx];
          
          gsap.to(diskMaterial.uniforms.uMorph, { value: s.morph, duration: 4.0, ease: "power2.inOut" });
          gsap.to(diskMaterial.uniforms.uCompression, { value: s.compress, duration: 4.0, ease: "power2.inOut" });
          gsap.to(diskMaterial.uniforms.uIntensity, { value: s.intensity, duration: 4.0, ease: "power2.inOut" });
          gsap.to(diskMaterial.uniforms.uOrbitScale, { value: s.orbit, duration: 4.0, ease: "power2.inOut" });
          gsap.to(auraMat.uniforms.uIntensity, { value: s.intensity, duration: 4.0, ease: "power2.inOut" });
          gsap.to(controls, { autoRotateSpeed: s.rotate, duration: 4.0, ease: "power2.inOut" });
          gsap.to(camera.position, { y: s.camY, duration: 4.0, ease: "power2.inOut" });
          gsap.to(camControl, { distance: s.camDist, duration: 4.0, ease: "power2.inOut" });

          gsap.to(".hud-fade-target", { opacity: 0, duration: 0.8, onComplete: () => {
            if (!active) return;
            setMainTitle(s.title);
            setStatusText(s.status);
            setStatusColor(s.color);
            setVelVal(s.vel);
            gsap.to(".hud-fade-target", { opacity: 1, duration: 1.2 });
          }});
        }, 6000);

        const clock = new THREE.Clock();
        let animationFrameId;

        function animate() {
            if (!active) return;
            const time = clock.getElapsedTime();
            diskMaterial.uniforms.uTime.value = time;
            auraMat.uniforms.uTime.value = time;
            instancedDisk.rotation.y += 0.0005;

            const currentDir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
            camera.position.x = controls.target.x + currentDir.x * camControl.distance;
            camera.position.z = controls.target.z + currentDir.z * camControl.distance;

            controls.update();
            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        }

        animate();

        const handleResize = () => {
          const w = container.clientWidth || window.innerWidth;
          camera.aspect = w / height;
          camera.updateProjectionMatrix();
          renderer.setSize(w, height);
        };
        window.addEventListener('resize', handleResize);

        // Bind cleanup
        cleanup = () => {
          clearInterval(intervalId);
          cancelAnimationFrame(animationFrameId);
          window.removeEventListener('resize', handleResize);
          
          controls.dispose();
          bhGeo.dispose();
          bhMat.dispose();
          auraGeo.dispose();
          auraMat.dispose();
          streakGeo.dispose();
          diskMaterial.dispose();
          instancedDisk.dispose();
          renderer.dispose();
          if (renderer.domElement && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error('Failed to load SingularityLoader WebGL:', err);
      }
    };

    init();

    return () => {
      active = false;
      cleanup();
    };
  }, []);

  return (
    <div className="loader-container">
      {!loaded && (
        <div className="placeholder-spinner">
          <div className="pulse-ring" />
          <div className="spinner-text">INITIALIZING QUANTUM SINGULARITY...</div>
        </div>
      )}
      <div ref={mountRef} className="canvas-wrapper" style={{ visibility: loaded ? 'visible' : 'hidden' }} />
      <div className="vignette" />
      
      <div className="overlay" style={{ display: loaded ? 'flex' : 'none' }}>
        <div className="header">
          <div className="title hud-fade-target">{mainTitle}</div>
          <div className="status-pill hud-fade-target" style={{ color: statusColor, borderColor: statusColor }}>
            {statusText}
          </div>
        </div>
        
        <div className="hud-bottom">
          <div>
            <div className="metric">MASS_INDEX: <span className="val" style={{ color: statusColor }}>4.2M SOL</span></div>
            <div className="metric">LENSING: <span className="val" style={{ color: statusColor }}>SCHWARZSCHILD</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="metric">RELATIVITY: <span className="val hud-fade-target" style={{ color: statusColor }}>{velVal}</span></div>
            <div className="metric">RADIATION: <span className="val" style={{ color: statusColor }}>DETECTION ON</span></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .loader-container {
          position: relative;
          width: 100%;
          height: 520px;
          border-radius: 12px;
          overflow: hidden;
          background-color: #010103;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .placeholder-spinner {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #010103;
          z-index: 100;
        }
        .pulse-ring {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid #00f3ff;
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.5);
          animation: pulse 1.5s infinite ease-in-out;
          margin-bottom: 20px;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
        }
        .spinner-text {
          font-family: monospace;
          font-size: 0.7rem;
          color: #00f3ff;
          letter-spacing: 2px;
          text-shadow: 0 0 8px rgba(0, 243, 255, 0.5);
        }
        .canvas-wrapper {
          width: 100%;
          height: 100%;
        }
        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, transparent 50%, black 150%);
          pointer-events: none;
          z-index: 5;
        }
        .overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          flex-direction: column;
          justify-content: space-between;
          padding: 30px;
          background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.5) 100%);
          z-index: 10;
        }
        .header {
          text-align: center;
        }
        .title {
          font-family: 'Outfit', 'Inter', sans-serif;
          font-size: 1.1rem;
          letter-spacing: 0.6em;
          text-transform: uppercase;
          color: #fff;
          margin-bottom: 10px;
          font-weight: 300;
          opacity: 0.9;
        }
        .status-pill {
          display: inline-block;
          padding: 4px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 30px;
          font-size: 0.6rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hud-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-family: monospace;
          font-size: 0.65rem;
          opacity: 0.8;
          letter-spacing: 1px;
        }
        .metric {
          margin-bottom: 4px;
          color: #cbd5e1;
        }
        .val {
          font-weight: bold;
          transition: color 1.2s ease;
        }
      `}</style>
    </div>
  );
}

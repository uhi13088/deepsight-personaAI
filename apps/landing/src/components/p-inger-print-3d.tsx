"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import * as THREE from "three"
import { TRAIT_DIMENSIONS } from "@/lib/trait-colors"

interface PingerPrint3DProps {
  /** 6D 벡터 데이터 (key: 0.0~1.0) */
  data: Record<string, number>
  /** 컨테이너 크기 (px) */
  size?: number
  /** 자동 회전 */
  autoRotate?: boolean
  /** 라벨 표시 여부 */
  showLabel?: boolean
}

/**
 * 6D 벡터값에 따라 구체 표면을 변형하는 셰이더 머티리얼
 * 각 차원이 특정 방향의 돌기/함몰을 생성 (세포/아메바 형태)
 */
const vertexShader = `
  uniform float uDepth;
  uniform float uLens;
  uniform float uStance;
  uniform float uScope;
  uniform float uTaste;
  uniform float uPurpose;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // 3D 심플렉스 노이즈 근사
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vec3 pos = position;
    vec3 dir = normalize(pos);
    float t = uTime * 0.3;

    // 각 6D 차원이 특정 축 방향으로 변형
    // depth: Y축(상하) 돌기 — 높을수록 뾰족
    float dDepth = uDepth * 0.35 * pow(max(dot(dir, vec3(0.0, 1.0, 0.0)), 0.0), 2.0 + (1.0 - uDepth) * 3.0);

    // lens: X축(좌우) 변형
    float dLens = uLens * 0.3 * pow(max(dot(dir, vec3(1.0, 0.0, 0.0)), 0.0), 2.0 + (1.0 - uLens) * 3.0);

    // stance: Z축(전후) 변형
    float dStance = uStance * 0.3 * pow(max(dot(dir, vec3(0.0, 0.0, 1.0)), 0.0), 2.0 + (1.0 - uStance) * 3.0);

    // scope: 대각선 돌기들
    float dScope = uScope * 0.25 * pow(max(dot(dir, normalize(vec3(1.0, 1.0, 0.0))), 0.0), 3.0);
    dScope += uScope * 0.25 * pow(max(dot(dir, normalize(vec3(-1.0, -1.0, 0.0))), 0.0), 3.0);

    // taste: 유기적 노이즈 변형 (불규칙 울퉁불퉁)
    float dTaste = uTaste * 0.2 * snoise(pos * 2.5 + t);

    // purpose: 저주파 맥동 (부드럽게 숨쉬는 느낌)
    float dPurpose = uPurpose * 0.1 * sin(t * 0.8) * snoise(pos * 1.2);

    float totalDisplacement = dDepth + dLens + dStance + dScope + dTaste + dPurpose;

    // 기본 유기적 노이즈 (세포막 텍스처)
    float baseNoise = snoise(pos * 3.0 + t * 0.5) * 0.05;
    totalDisplacement += baseNoise;

    pos += dir * totalDisplacement;

    vDisplacement = totalDisplacement;
    vNormal = normalMatrix * normal;
    vPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform vec3 uColor5;
  uniform vec3 uColor6;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    // 프레넬 효과 (가장자리 글로우)
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

    // displacement 기반 색상 혼합 (6D 각 차원 컬러)
    float t = vDisplacement * 3.0 + 0.5;
    vec3 color;
    if (t < 0.2) color = mix(uColor1, uColor2, t * 5.0);
    else if (t < 0.4) color = mix(uColor2, uColor3, (t - 0.2) * 5.0);
    else if (t < 0.6) color = mix(uColor3, uColor4, (t - 0.4) * 5.0);
    else if (t < 0.8) color = mix(uColor4, uColor5, (t - 0.6) * 5.0);
    else color = mix(uColor5, uColor6, (t - 0.8) * 5.0);

    // 기본 라이팅
    vec3 lightDir = normalize(vec3(1.0, 1.5, 2.0));
    float diffuse = max(dot(normal, lightDir), 0.0) * 0.6 + 0.4;

    // 스펙큘러
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.3;

    // 프레넬 글로우 (가장자리에 밝은 색상)
    vec3 fresnelColor = mix(uColor1, uColor6, 0.5);

    vec3 finalColor = color * diffuse + specular + fresnel * fresnelColor * 0.4;

    // 서브서피스 스캐터링 근사 (세포 느낌)
    float sss = pow(max(dot(-normal, lightDir), 0.0), 2.0) * 0.15;
    finalColor += color * sss;

    gl_FragColor = vec4(finalColor, 0.92 + fresnel * 0.08);
  }
`

function hexToVec3(hex: string): THREE.Vector3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new THREE.Vector3(r, g, b)
}

function CellSphere({ data }: { data: Record<string, number> }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])

  const uniforms = useMemo(
    () => ({
      uDepth: { value: data.depth ?? 0.5 },
      uLens: { value: data.lens ?? 0.5 },
      uStance: { value: data.stance ?? 0.5 },
      uScope: { value: data.scope ?? 0.5 },
      uTaste: { value: data.taste ?? 0.5 },
      uPurpose: { value: data.purpose ?? 0.5 },
      uTime: { value: 0 },
      uColor1: { value: hexToVec3(dimensions[0]?.color.primary ?? "#3B82F6") },
      uColor2: { value: hexToVec3(dimensions[1]?.color.primary ?? "#10B981") },
      uColor3: { value: hexToVec3(dimensions[2]?.color.primary ?? "#F59E0B") },
      uColor4: { value: hexToVec3(dimensions[3]?.color.primary ?? "#EF4444") },
      uColor5: { value: hexToVec3(dimensions[4]?.color.primary ?? "#8B5CF6") },
      uColor6: { value: hexToVec3(dimensions[5]?.color.primary ?? "#EC4899") },
    }),
    [data, dimensions]
  )

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value = state.clock.elapsedTime
      meshRef.current.rotation.y += 0.003
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}

export function PingerPrint3D({
  data,
  size = 280,
  autoRotate = true,
  showLabel = true,
}: PingerPrint3DProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }}>
        <Canvas
          camera={{ position: [0, 0, 2.8], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[2, 3, 4]} intensity={0.8} />
          <directionalLight position={[-2, -1, -3]} intensity={0.3} color="#667eea" />
          <CellSphere data={data} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={1.5}
          />
        </Canvas>
      </div>
      {showLabel && <span className="text-xs font-medium text-gray-400">3D P-inger Print</span>}
    </div>
  )
}

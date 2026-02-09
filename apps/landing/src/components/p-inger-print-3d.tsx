"use client"

import { useRef, useMemo, useEffect } from "react"
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
 * 부드러운 유기적 형태 + 알루미늄 아노다이징 질감
 * 6D 벡터값에 따라 구체가 자연스러운 pebble/제품 형태로 변형
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
  varying vec3 vWorldNormal;
  varying float vDisplacement;

  // 3D simplex noise
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
    float t = uTime * 0.12;

    // 부드러운 구형 조화(spherical harmonics) 기반 변형
    // depth: Y축 살짝 늘림/찌그러트림
    float d = uDepth * 0.1 * (dir.y * dir.y - 0.33);

    // lens: X축 늘림
    d += uLens * 0.09 * (dir.x * dir.x - 0.33);

    // stance: Z축 늘림
    d += uStance * 0.08 * (dir.z * dir.z - 0.33);

    // scope: 안장(saddle) 변형 — 유기적 비대칭
    d += uScope * 0.07 * dir.x * dir.y;
    d += uScope * 0.05 * dir.y * dir.z;

    // taste: 부드러운 저주파 노이즈 (유기적 울렁임)
    d += uTaste * 0.07 * snoise(pos * 1.2 + t);

    // purpose: 매우 느린 맥동
    d += uPurpose * 0.03 * sin(t * 0.4) * (0.5 + 0.5 * snoise(pos * 0.8));

    // 기본 미세 텍스처 (제품 표면의 아주 미세한 울퉁)
    d += snoise(pos * 1.8 + t * 0.15) * 0.012;

    pos += dir * d;

    vDisplacement = d;
    vNormal = normalMatrix * normal;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
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
  varying vec3 vWorldNormal;
  varying float vDisplacement;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vPosition);

    // === 아노다이징 컬러 계산 (6D 기반) ===
    float ct = clamp(vDisplacement * 5.0 + 0.5, 0.0, 1.0);
    vec3 anodizeColor;
    if (ct < 0.2) anodizeColor = mix(uColor1, uColor2, ct * 5.0);
    else if (ct < 0.4) anodizeColor = mix(uColor2, uColor3, (ct - 0.2) * 5.0);
    else if (ct < 0.6) anodizeColor = mix(uColor3, uColor4, (ct - 0.4) * 5.0);
    else if (ct < 0.8) anodizeColor = mix(uColor4, uColor5, (ct - 0.6) * 5.0);
    else anodizeColor = mix(uColor5, uColor6, (ct - 0.8) * 5.0);

    // === 알루미늄 베이스 ===
    vec3 metalBase = vec3(0.82, 0.84, 0.88);
    // 아노다이징: 금속 위에 컬러 틴트 (60% 투과)
    vec3 baseColor = mix(metalBase, anodizeColor, 0.55);

    // === 3-라이트 프로덕트 라이팅 ===
    vec3 L1 = normalize(vec3(1.5, 2.0, 3.0));   // 메인 키라이트
    vec3 L2 = normalize(vec3(-2.0, 0.5, 1.0));   // 필 라이트
    vec3 L3 = normalize(vec3(0.0, -1.0, 2.0));   // 림 라이트

    // Diffuse (부드러운 램버트)
    float d1 = max(dot(N, L1), 0.0);
    float d2 = max(dot(N, L2), 0.0) * 0.35;
    float d3 = max(dot(N, L3), 0.0) * 0.15;
    float diffuse = d1 * 0.5 + d2 + d3 + 0.3; // 높은 ambient

    // Specular (알루미늄: 날카로운 하이라이트)
    vec3 H1 = normalize(L1 + V);
    vec3 H2 = normalize(L2 + V);
    float s1 = pow(max(dot(N, H1), 0.0), 120.0) * 0.7;
    float s2 = pow(max(dot(N, H2), 0.0), 80.0) * 0.25;

    // Fresnel (금속 가장자리 반사)
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);

    // === 최종 합성 ===
    vec3 finalColor = baseColor * diffuse;

    // 금속 스펙큘러: 반사광도 베이스 컬러에 의해 틴트됨
    finalColor += baseColor * s1 + vec3(0.95) * s2 * 0.4;

    // 엣지 리플렉션 (환경 반사 시뮬레이션)
    vec3 envReflect = mix(baseColor, vec3(1.0), 0.4);
    finalColor += envReflect * fresnel * 0.3;

    // 미세한 브러시드 텍스처 (양극산화 알루미늄의 미세 결)
    float micro = 1.0 + sin(vWorldNormal.y * 80.0 + vWorldNormal.x * 40.0) * 0.008;
    finalColor *= micro;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

function hexToVec3(hex: string): THREE.Vector3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return new THREE.Vector3(r, g, b)
}

function ProductSphere({ data }: { data: Record<string, number> }) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // 페르소나 전환 시 uniform 값 업데이트
  useEffect(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uDepth.value = data.depth ?? 0.5
    mat.uniforms.uLens.value = data.lens ?? 0.5
    mat.uniforms.uStance.value = data.stance ?? 0.5
    mat.uniforms.uScope.value = data.scope ?? 0.5
    mat.uniforms.uTaste.value = data.taste ?? 0.5
    mat.uniforms.uPurpose.value = data.purpose ?? 0.5

    const colors = dimensions.map((d) => hexToVec3(d.color.primary))
    if (colors[0]) mat.uniforms.uColor1.value = colors[0]
    if (colors[1]) mat.uniforms.uColor2.value = colors[1]
    if (colors[2]) mat.uniforms.uColor3.value = colors[2]
    if (colors[3]) mat.uniforms.uColor4.value = colors[3]
    if (colors[4]) mat.uniforms.uColor5.value = colors[4]
    if (colors[5]) mat.uniforms.uColor6.value = colors[5]
  }, [data, dimensions])

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = state.clock.elapsedTime
      meshRef.current.rotation.y += 0.002
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

export function PingerPrint3D({
  data,
  size = 200,
  autoRotate = true,
  showLabel = true,
}: PingerPrint3DProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }}>
        <Canvas
          camera={{ position: [0, 0.2, 2.6], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 4, 5]} intensity={1.0} />
          <directionalLight position={[-3, 1, 2]} intensity={0.4} color="#e8ecf4" />
          <directionalLight position={[0, -2, 3]} intensity={0.2} color="#f0f0f5" />
          <ProductSphere data={data} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
          />
          <Environment preset="studio" />
        </Canvas>
      </div>
      {showLabel && <span className="text-xs font-medium text-gray-400">3D P-inger Print</span>}
    </div>
  )
}

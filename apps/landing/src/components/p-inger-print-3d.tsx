"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
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

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

/**
 * 잭스(Jacks) 오브젝트 — 6D 벡터값에 따라 팔(arm) 길이/굵기가 결정됨
 * 컬러 크롬 질감: 높은 반사 + 6D 컬러 틴트
 */
function JacksObject({ data }: { data: Record<string, number> }) {
  const groupRef = useRef<THREE.Group>(null)
  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])

  // 6D 벡터에 대응하는 6개 팔 방향 (잭스 형태)
  const arms = useMemo(() => {
    const keys = ["depth", "lens", "stance", "scope", "taste", "purpose"]
    // 잭스 팔 방향: 3축 양방향 = 6방향, 약간 틀어서 유기적으로
    const directions: [number, number, number][] = [
      [0, 1, 0.15], // depth: 위
      [0, -1, -0.15], // lens: 아래
      [1, 0.15, 0], // stance: 오른쪽
      [-1, -0.15, 0], // scope: 왼쪽
      [0.15, 0, 1], // taste: 앞
      [-0.15, 0, -1], // purpose: 뒤
    ]

    return keys.map((key, i) => {
      const val = data[key] ?? 0.5
      const dim = dimensions.find((d) => d.key === key)
      const color = dim?.color.primary ?? "#888888"
      const dir = new THREE.Vector3(...directions[i]).normalize()
      // 팔 길이: 값에 비례 (0.3 ~ 1.0)
      const length = 0.3 + val * 0.7
      // 팔 굵기: 값에 비례 (0.06 ~ 0.12)
      const radius = 0.06 + val * 0.06
      // 끝 구체 크기: 값에 비례 (0.08 ~ 0.16)
      const tipRadius = 0.08 + val * 0.08
      return { key, dir, length, radius, tipRadius, color, val }
    })
  }, [data, dimensions])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003
      groupRef.current.rotation.x += 0.001
    }
  })

  // 크롬 머테리얼 생성
  const createChromeMaterial = (color: string, val: number) => {
    const baseColor = hexToColor(color)
    // 값이 높을수록 채도 강하게
    const mixFactor = 0.3 + val * 0.4
    const chromeBase = new THREE.Color(0.85, 0.87, 0.9)
    chromeBase.lerp(baseColor, mixFactor)

    return (
      <meshPhysicalMaterial
        color={chromeBase}
        metalness={0.95}
        roughness={0.05}
        reflectivity={1.0}
        clearcoat={1.0}
        clearcoatRoughness={0.03}
        envMapIntensity={1.5}
      />
    )
  }

  return (
    <group ref={groupRef} scale={0.55}>
      {/* 중심 구체 */}
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial
          color={new THREE.Color(0.82, 0.84, 0.88)}
          metalness={0.95}
          roughness={0.04}
          reflectivity={1.0}
          clearcoat={1.0}
          clearcoatRoughness={0.02}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* 6개 팔 */}
      {arms.map((arm) => {
        // 팔의 중심 위치 (방향 * 길이/2)
        const midPoint = arm.dir.clone().multiplyScalar(arm.length / 2)
        // 팔 끝 위치
        const tipPoint = arm.dir.clone().multiplyScalar(arm.length)

        // CylinderGeometry는 Y축 기준이므로 방향 회전 계산
        const quaternion = new THREE.Quaternion()
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arm.dir)
        const euler = new THREE.Euler().setFromQuaternion(quaternion)

        return (
          <group key={arm.key}>
            {/* 팔 (실린더) */}
            <mesh
              position={[midPoint.x, midPoint.y, midPoint.z]}
              rotation={[euler.x, euler.y, euler.z]}
            >
              <cylinderGeometry args={[arm.radius, arm.radius * 0.8, arm.length, 16]} />
              {createChromeMaterial(arm.color, arm.val)}
            </mesh>
            {/* 끝 구체 (볼록한 팁) */}
            <mesh position={[tipPoint.x, tipPoint.y, tipPoint.z]}>
              <sphereGeometry args={[arm.tipRadius, 24, 24]} />
              {createChromeMaterial(arm.color, arm.val)}
            </mesh>
          </group>
        )
      })}
    </group>
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
          camera={{ position: [0, 0.5, 4.5], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          {/* 3-포인트 라이팅 (제품 촬영 느낌) */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 8]} intensity={1.2} color="#ffffff" />
          <directionalLight position={[-4, 2, 3]} intensity={0.5} color="#e0e4f0" />
          <directionalLight position={[0, -3, 5]} intensity={0.3} color="#f0f0ff" />
          {/* 상단 림라이트 */}
          <pointLight position={[0, 5, 0]} intensity={0.4} color="#ffffff" />
          <JacksObject data={data} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={autoRotate}
            autoRotateSpeed={1.2}
          />
        </Canvas>
      </div>
      {showLabel && <span className="text-xs font-medium text-gray-400">3D P-inger Print</span>}
    </div>
  )
}

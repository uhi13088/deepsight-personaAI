"use client"

import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { TRAIT_DIMENSIONS } from "@/lib/trait-colors"

interface PingerPrint3DProps {
  data: Record<string, number>
  size?: number
  autoRotate?: boolean
  showLabel?: boolean
}

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

/** 프로그래매틱 큐브맵 생성 — 그라디언트 스튜디오 환경 */
function useStudioEnvMap() {
  const { gl } = useThree()
  return useMemo(() => {
    const cubeRT = new THREE.WebGLCubeRenderTarget(256)
    const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRT)
    const scene = new THREE.Scene()

    // 스튜디오 느낌의 그라디언트 배경
    const topColor = new THREE.Color(0.95, 0.95, 1.0)
    const bottomColor = new THREE.Color(0.6, 0.65, 0.75)
    const highlight = new THREE.Color(1.0, 1.0, 1.0)

    // 큰 구체에 그라디언트 머테리얼
    const envGeo = new THREE.SphereGeometry(5, 32, 32)
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: topColor },
        bottomColor: { value: bottomColor },
        highlight: { value: highlight },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 highlight;
        varying vec3 vWorldPosition;
        void main() {
          vec3 dir = normalize(vWorldPosition);
          float t = dir.y * 0.5 + 0.5;
          vec3 col = mix(bottomColor, topColor, t);
          // 상단 하이라이트 스폿
          float spot = pow(max(dot(dir, normalize(vec3(0.5, 0.8, 0.3))), 0.0), 8.0);
          col += highlight * spot * 0.4;
          // 하단 리플렉션
          float spot2 = pow(max(dot(dir, normalize(vec3(-0.3, -0.5, 0.8))), 0.0), 6.0);
          col += vec3(0.8, 0.85, 0.9) * spot2 * 0.2;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })

    const envMesh = new THREE.Mesh(envGeo, envMat)
    scene.add(envMesh)
    cubeCamera.update(gl, scene)
    scene.remove(envMesh)
    envGeo.dispose()
    envMat.dispose()

    return cubeRT.texture
  }, [gl])
}

/**
 * 잭스(Jacks) 오브젝트 — 6D 벡터에 따라 팔 길이/굵기/컬러 결정
 * 컬러 크롬: meshPhysicalMaterial + 프로그래매틱 envMap
 */
function JacksObject({ data }: { data: Record<string, number> }) {
  const groupRef = useRef<THREE.Group>(null)
  const dimensions = useMemo(() => TRAIT_DIMENSIONS.filter((d) => d.key in data), [data])
  const envMap = useStudioEnvMap()

  const arms = useMemo(() => {
    const keys = ["depth", "lens", "stance", "scope", "taste", "purpose"]
    const directions: [number, number, number][] = [
      [0, 1, 0.15],
      [0, -1, -0.15],
      [1, 0.15, 0],
      [-1, -0.15, 0],
      [0.15, 0, 1],
      [-0.15, 0, -1],
    ]

    return keys.map((key, i) => {
      const val = data[key] ?? 0.5
      const dim = dimensions.find((d) => d.key === key)
      const color = dim?.color.primary ?? "#888888"
      const dir = new THREE.Vector3(...directions[i]).normalize()
      const length = 0.3 + val * 0.7
      const radius = 0.06 + val * 0.06
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

  const createMaterial = (color: string, val: number) => {
    const baseColor = hexToColor(color)
    const mixFactor = 0.35 + val * 0.35
    const chromeBase = new THREE.Color(0.88, 0.9, 0.93)
    chromeBase.lerp(baseColor, mixFactor)

    return (
      <meshPhysicalMaterial
        color={chromeBase}
        metalness={0.95}
        roughness={0.08}
        reflectivity={1.0}
        clearcoat={1.0}
        clearcoatRoughness={0.05}
        envMap={envMap}
        envMapIntensity={2.0}
      />
    )
  }

  return (
    <group ref={groupRef} scale={0.5}>
      {/* 중심 구체 */}
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial
          color={new THREE.Color(0.85, 0.87, 0.9)}
          metalness={0.95}
          roughness={0.06}
          reflectivity={1.0}
          clearcoat={1.0}
          clearcoatRoughness={0.03}
          envMap={envMap}
          envMapIntensity={2.0}
        />
      </mesh>

      {/* 6개 팔 */}
      {arms.map((arm) => {
        const midPoint = arm.dir.clone().multiplyScalar(arm.length / 2)
        const tipPoint = arm.dir.clone().multiplyScalar(arm.length)
        const quaternion = new THREE.Quaternion()
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arm.dir)
        const euler = new THREE.Euler().setFromQuaternion(quaternion)

        return (
          <group key={arm.key}>
            <mesh
              position={[midPoint.x, midPoint.y, midPoint.z]}
              rotation={[euler.x, euler.y, euler.z]}
            >
              <cylinderGeometry args={[arm.radius, arm.radius * 0.8, arm.length, 16]} />
              {createMaterial(arm.color, arm.val)}
            </mesh>
            <mesh position={[tipPoint.x, tipPoint.y, tipPoint.z]}>
              <sphereGeometry args={[arm.tipRadius, 24, 24]} />
              {createMaterial(arm.color, arm.val)}
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
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 8]} intensity={1.2} />
          <directionalLight position={[-4, 2, 3]} intensity={0.5} color="#e0e4f0" />
          <directionalLight position={[0, -3, 5]} intensity={0.3} color="#f0f0ff" />
          <pointLight position={[0, 5, 0]} intensity={0.4} />
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

// ═══════════════════════════════════════════════════════════════
// 색상 공간 변환 — CIELAB ↔ OKLCH ↔ sRGB
// T63-AC1: 디바이스 독립적 색상 변환, Pantone-free
// ═══════════════════════════════════════════════════════════════

// ── 타입 ─────────────────────────────────────────────────────

export interface LabColor {
  L: number // 0–100
  a: number // roughly -128–127
  b: number // roughly -128–127
}

export interface OklchColor {
  L: number // 0–1
  C: number // 0–0.4+
  h: number // 0–360 (degrees)
}

export interface RgbColor {
  r: number // 0–255
  g: number // 0–255
  b: number // 0–255
}

// ── 상수 ─────────────────────────────────────────────────────

// D50 illuminant (CIELAB 표준)
const D50_X = 0.96422
const D50_Y = 1.0
const D50_Z = 0.82521

// CIE epsilon / kappa
const CIE_E = 216 / 24389 // 0.008856
const CIE_K = 24389 / 27 // 903.3

// ── sRGB ↔ Linear RGB ───────────────────────────────────────

function srgbToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c: number): number {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(Math.min(255, Math.max(0, s * 255)))
}

// ── Linear RGB ↔ XYZ (D50) ──────────────────────────────────
// sRGB → D65 → D50 chromatic adaptation (Bradford)

function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
  // sRGB to XYZ D65
  const x65 = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b
  const y65 = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
  const z65 = 0.0193339 * r + 0.119192 * g + 0.9503041 * b

  // D65 → D50 Bradford adaptation
  const x = 1.0479 * x65 + 0.0229 * y65 - 0.0502 * z65
  const y = 0.0296 * x65 + 0.9904 * y65 - 0.0171 * z65
  const z = -0.0092 * x65 + 0.0151 * y65 + 0.7519 * z65

  return [x, y, z]
}

function xyzToLinearRgb(x: number, y: number, z: number): [number, number, number] {
  // D50 → D65 Bradford inverse
  const x65 = 0.9555 * x - 0.0231 * y + 0.0632 * z
  const y65 = -0.0284 * x + 1.01 * y + 0.0211 * z
  const z65 = 0.0123 * x - 0.0205 * y + 1.3302 * z

  // XYZ D65 to linear sRGB
  const r = 3.2404542 * x65 - 1.5371385 * y65 - 0.4985314 * z65
  const g = -0.969266 * x65 + 1.8760108 * y65 + 0.041556 * z65
  const b = 0.0556434 * x65 - 0.2040259 * y65 + 1.0572252 * z65

  return [r, g, b]
}

// ── XYZ (D50) ↔ CIELAB ──────────────────────────────────────

function xyzToLab(x: number, y: number, z: number): LabColor {
  const fx = pivotXyz(x / D50_X)
  const fy = pivotXyz(y / D50_Y)
  const fz = pivotXyz(z / D50_Z)

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

function labToXyz(lab: LabColor): [number, number, number] {
  const fy = (lab.L + 16) / 116
  const fx = lab.a / 500 + fy
  const fz = fy - lab.b / 200

  const x = inversePivotXyz(fx) * D50_X
  const y = inversePivotXyz(fy) * D50_Y
  const z = inversePivotXyz(fz) * D50_Z

  return [x, y, z]
}

function pivotXyz(t: number): number {
  return t > CIE_E ? Math.cbrt(t) : (CIE_K * t + 16) / 116
}

function inversePivotXyz(t: number): number {
  const t3 = t * t * t
  return t3 > CIE_E ? t3 : (116 * t - 16) / CIE_K
}

// ── CIELAB ↔ LCH (cylindrical) ──────────────────────────────

function labToLch(lab: LabColor): { L: number; C: number; h: number } {
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI)
  if (h < 0) h += 360
  return { L: lab.L, C, h }
}

function lchToLab(L: number, C: number, h: number): LabColor {
  const rad = h * (Math.PI / 180)
  return {
    L,
    a: C * Math.cos(rad),
    b: C * Math.sin(rad),
  }
}

// ── OKLCH ↔ OKLab ↔ linear sRGB (직접 변환) ─────────────────
// 참조: Björn Ottosson — sRGB ↔ LMS 직접 변환 (XYZ 미경유)

function linearSrgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  // linear sRGB → LMS
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  // OKLab → LMS (cube root space)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  // LMS → linear sRGB (직접)
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return [r, g, bl]
}

// ── 공개 API ─────────────────────────────────────────────────

/** sRGB → CIELAB (D50) */
export function rgbToLab(rgb: RgbColor): LabColor {
  const lr = srgbToLinear(rgb.r)
  const lg = srgbToLinear(rgb.g)
  const lb = srgbToLinear(rgb.b)
  const [x, y, z] = linearRgbToXyz(lr, lg, lb)
  return xyzToLab(x, y, z)
}

/** CIELAB (D50) → sRGB */
export function labToRgb(lab: LabColor): RgbColor {
  const [x, y, z] = labToXyz(lab)
  const [lr, lg, lb] = xyzToLinearRgb(x, y, z)
  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  }
}

/** sRGB → OKLCH */
export function rgbToOklch(rgb: RgbColor): OklchColor {
  const lr = srgbToLinear(rgb.r)
  const lg = srgbToLinear(rgb.g)
  const lb = srgbToLinear(rgb.b)

  const oklab = linearSrgbToOklab(lr, lg, lb)
  const C = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b)
  let h = Math.atan2(oklab.b, oklab.a) * (180 / Math.PI)
  if (h < 0) h += 360

  return { L: oklab.L, C, h }
}

/** OKLCH → sRGB */
export function oklchToRgb(oklch: OklchColor): RgbColor {
  const rad = oklch.h * (Math.PI / 180)
  const a = oklch.C * Math.cos(rad)
  const b = oklch.C * Math.sin(rad)

  const [lr, lg, lb] = oklabToLinearSrgb(oklch.L, a, b)

  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  }
}

/** CIELAB (D50) → OKLCH */
export function labToOklch(lab: LabColor): OklchColor {
  const rgb = labToRgb(lab)
  return rgbToOklch(rgb)
}

/** OKLCH → CIELAB (D50) */
export function oklchToLab(oklch: OklchColor): LabColor {
  const rgb = oklchToRgb(oklch)
  return rgbToLab(rgb)
}

/** sRGB → HEX 문자열 */
export function rgbToHex(rgb: RgbColor): string {
  const r = Math.min(255, Math.max(0, rgb.r))
  const g = Math.min(255, Math.max(0, rgb.g))
  const b = Math.min(255, Math.max(0, rgb.b))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

/** HEX → sRGB */
export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace("#", "")
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

// ── ΔE00 (CIEDE2000) ────────────────────────────────────────
// 지각적 색차 계산 — 색상 인코더(AC2)에서 사용

export function deltaE00(lab1: LabColor, lab2: LabColor): number {
  const { L: L1, a: a1, b: b1 } = lab1
  const { L: L2, a: a2, b: b2 } = lab2

  // 1. Lab → LCh
  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cab = (C1 + C2) / 2

  const Cab7 = Math.pow(Cab, 7)
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + Math.pow(25, 7))))

  const a1p = a1 * (1 + G)
  const a2p = a2 * (1 + G)

  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  let h1p = Math.atan2(b1, a1p) * (180 / Math.PI)
  if (h1p < 0) h1p += 360
  let h2p = Math.atan2(b2, a2p) * (180 / Math.PI)
  if (h2p < 0) h2p += 360

  // 2. Delta values
  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp: number
  if (C1p * C2p === 0) {
    dhp = 0
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360
  } else {
    dhp = h2p - h1p + 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360)

  // 3. Weighted terms
  const Lbp = (L1 + L2) / 2
  const Cbp = (C1p + C2p) / 2

  let hbp: number
  if (C1p * C2p === 0) {
    hbp = h1p + h2p
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbp = (h1p + h2p) / 2
  } else if (h1p + h2p < 360) {
    hbp = (h1p + h2p + 360) / 2
  } else {
    hbp = (h1p + h2p - 360) / 2
  }

  const T =
    1 -
    0.17 * Math.cos(((hbp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hbp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hbp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hbp - 63) * Math.PI) / 180)

  const Lbp50sq = (Lbp - 50) * (Lbp - 50)
  const SL = 1 + (0.015 * Lbp50sq) / Math.sqrt(20 + Lbp50sq)
  const SC = 1 + 0.045 * Cbp
  const SH = 1 + 0.015 * Cbp * T

  const Cbp7 = Math.pow(Cbp, 7)
  const RT =
    -2 *
    Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7))) *
    Math.sin((60 * Math.exp(-Math.pow((hbp - 275) / 25, 2)) * Math.PI) / 180)

  const result = Math.sqrt(
    Math.pow(dLp / SL, 2) +
      Math.pow(dCp / SC, 2) +
      Math.pow(dHp / SH, 2) +
      RT * (dCp / SC) * (dHp / SH)
  )

  return result
}

// ── LAB 공간 보간 ────────────────────────────────────────────

/** LAB 공간에서 두 색상 사이 보간 (t: 0~1) */
export function interpolateLab(lab1: LabColor, lab2: LabColor, t: number): LabColor {
  return {
    L: lab1.L + (lab2.L - lab1.L) * t,
    a: lab1.a + (lab2.a - lab1.a) * t,
    b: lab1.b + (lab2.b - lab1.b) * t,
  }
}

/** 벡터 차원 값(0~1)을 Lab 색상 범위에 매핑 */
export function dimensionToLabHue(value: number, hueSeed: number, hueStep: number): LabColor {
  const hue = (hueSeed + value * hueStep) % 360
  const lch = { L: 60, C: 50, h: hue } // 중간 밝기/채도
  return lchToLab(lch.L, lch.C, lch.h)
}

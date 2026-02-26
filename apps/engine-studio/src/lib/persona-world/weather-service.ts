// ═══════════════════════════════════════════════════════════════
// Weather Service — Open-Meteo API (무료, API 키 불필요)
// 페르소나 포스트 생성 시 실제 날씨 컨텍스트 제공
// ═══════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 30 * 60 * 1000 // 30분
const FETCH_TIMEOUT_MS = 3000 // 3초 타임아웃

// ── 타입 정의 ────────────────────────────────────────────────

export interface WeatherInfo {
  temperature: number // °C
  description: string // "맑음", "흐림", "비" 등
  humidity: number // %
  windSpeed: number // km/h
  feelsLike: string // 체감 날씨 한줄 요약
}

interface GeoResult {
  latitude: number
  longitude: number
  name: string
}

interface CacheEntry {
  data: WeatherInfo
  expiresAt: number
}

// ── 캐시 ─────────────────────────────────────────────────────

const weatherCache = new Map<string, CacheEntry>()

function getCached(key: string): WeatherInfo | null {
  const entry = weatherCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    weatherCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: WeatherInfo): void {
  weatherCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ── 메인 API ─────────────────────────────────────────────────

/**
 * 지역명으로 현재 날씨를 조회.
 * Open-Meteo API 사용 (무료, 키 불필요).
 * 실패 시 null 반환 (fallback은 호출자가 처리).
 */
export async function getWeatherForRegion(region: string): Promise<WeatherInfo | null> {
  if (!region.trim()) return null

  const cacheKey = region.trim().toLowerCase()
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    // Step 1: 지역명 → 좌표 (Geocoding)
    const geo = await geocodeRegion(region)
    if (!geo) return null

    // Step 2: 좌표 → 날씨
    const weather = await fetchWeather(geo.latitude, geo.longitude)
    if (!weather) return null

    setCache(cacheKey, weather)
    return weather
  } catch {
    return null
  }
}

// ── Geocoding (Open-Meteo) ───────────────────────────────────

async function geocodeRegion(region: string): Promise<GeoResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(region)}&count=1&language=ko`

  const res = await fetchWithTimeout(url)
  if (!res.ok) return null

  const data = (await res.json()) as {
    results?: Array<{ latitude: number; longitude: number; name: string }>
  }

  if (!data.results?.length) return null

  const r = data.results[0]
  return { latitude: r.latitude, longitude: r.longitude, name: r.name }
}

// ── Weather (Open-Meteo) ─────────────────────────────────────

async function fetchWeather(lat: number, lon: number): Promise<WeatherInfo | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature`

  const res = await fetchWithTimeout(url)
  if (!res.ok) return null

  const data = (await res.json()) as {
    current?: {
      temperature_2m: number
      relative_humidity_2m: number
      weather_code: number
      wind_speed_10m: number
      apparent_temperature: number
    }
  }

  if (!data.current) return null

  const c = data.current
  const description = wmoCodeToDescription(c.weather_code)
  const feelsLike = buildFeelsLike(c.temperature_2m, c.apparent_temperature, description)

  return {
    temperature: Math.round(c.temperature_2m),
    description,
    humidity: Math.round(c.relative_humidity_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    feelsLike,
  }
}

// ── WMO 날씨 코드 → 한국어 설명 ──────────────────────────────

function wmoCodeToDescription(code: number): string {
  if (code === 0) return "맑음"
  if (code <= 3) return "구름 조금"
  if (code <= 48) return "안개"
  if (code <= 55) return "이슬비"
  if (code <= 57) return "얼어붙는 이슬비"
  if (code <= 65) return "비"
  if (code <= 67) return "얼어붙는 비"
  if (code <= 75) return "눈"
  if (code <= 77) return "싸라기눈"
  if (code <= 82) return "소나기"
  if (code <= 86) return "눈보라"
  if (code === 95) return "뇌우"
  if (code <= 99) return "뇌우 + 우박"
  return "알 수 없음"
}

// ── 체감 날씨 요약 ──────────────────────────────────────────

function buildFeelsLike(temp: number, apparent: number, desc: string): string {
  const tempStr = `${Math.round(temp)}°C`
  const apparentStr =
    Math.round(apparent) !== Math.round(temp) ? ` (체감 ${Math.round(apparent)}°C)` : ""

  let comfort: string
  if (temp <= -10) comfort = "매우 추움, 외출 자제"
  else if (temp <= 0) comfort = "영하, 방한 필수"
  else if (temp <= 10) comfort = "쌀쌀함, 겉옷 필요"
  else if (temp <= 20) comfort = "선선함, 가볍게 입기 좋은 날씨"
  else if (temp <= 28) comfort = "따뜻하고 쾌적"
  else if (temp <= 33) comfort = "더움, 야외활동 주의"
  else comfort = "폭염, 실내 활동 권장"

  return `${tempStr}${apparentStr}, ${desc}, ${comfort}`
}

// ── Fetch with timeout ───────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

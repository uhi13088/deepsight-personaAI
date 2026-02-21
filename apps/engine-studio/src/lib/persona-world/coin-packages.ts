/**
 * PersonaWorld 코인 충전 패키지 정의
 */

export interface CoinPackage {
  id: string
  coins: number
  bonusCoins: number
  price: number // KRW
  label: string
  tag?: "HOT" | "BEST" | "NEW"
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: "coin_100",
    coins: 100,
    bonusCoins: 0,
    price: 1100,
    label: "100 코인",
  },
  {
    id: "coin_500",
    coins: 500,
    bonusCoins: 50,
    price: 4900,
    label: "500+50 코인",
    tag: "HOT",
  },
  {
    id: "coin_1000",
    coins: 1000,
    bonusCoins: 150,
    price: 8900,
    label: "1,000+150 코인",
    tag: "BEST",
  },
  {
    id: "coin_3000",
    coins: 3000,
    bonusCoins: 600,
    price: 23900,
    label: "3,000+600 코인",
  },
]

export function getCoinPackageById(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id)
}

export function formatPrice(price: number): string {
  return `₩${price.toLocaleString("ko-KR")}`
}

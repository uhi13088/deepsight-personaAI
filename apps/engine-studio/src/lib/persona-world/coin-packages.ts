/**
 * PersonaWorld - 코인 충전 패키지
 */

export interface CoinPackage {
  id: string
  coins: number
  priceKRW: number
  bonusCoins: number
  label: string
  tag?: "BEST" | "HOT"
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: "coin_100",
    coins: 100,
    priceKRW: 1100,
    bonusCoins: 0,
    label: "100 코인",
  },
  {
    id: "coin_500",
    coins: 500,
    priceKRW: 4900,
    bonusCoins: 50,
    label: "500 + 50 코인",
    tag: "HOT",
  },
  {
    id: "coin_1000",
    coins: 1000,
    priceKRW: 8900,
    bonusCoins: 150,
    label: "1,000 + 150 코인",
    tag: "BEST",
  },
  {
    id: "coin_3000",
    coins: 3000,
    priceKRW: 23900,
    bonusCoins: 600,
    label: "3,000 + 600 코인",
  },
]

export function getCoinPackageById(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id)
}

export function formatPrice(priceKRW: number): string {
  return `₩${priceKRW.toLocaleString()}`
}

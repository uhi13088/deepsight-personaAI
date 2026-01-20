/**
 * DeepSight Engine Studio - i18n Module
 * 다국어 지원을 위한 기본 모듈입니다.
 */

import { ko, type TranslationKeys } from "./ko"

// 지원 언어 목록
export const SUPPORTED_LOCALES = ["ko", "en"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

// 기본 언어
export const DEFAULT_LOCALE: SupportedLocale = "ko"

// 언어별 번역 데이터
const translations: Record<SupportedLocale, TranslationKeys> = {
  ko,
  en: ko, // 영어 번역이 추가될 때까지 한국어를 기본으로 사용
}

/**
 * 번역 데이터 가져오기
 */
export function getTranslations(locale: SupportedLocale = DEFAULT_LOCALE): TranslationKeys {
  return translations[locale] || translations[DEFAULT_LOCALE]
}

/**
 * 번역 키로 문자열 가져오기
 * @param key 점 표기법 키 (예: "common.buttons.save")
 * @param locale 언어
 */
export function t(key: string, locale: SupportedLocale = DEFAULT_LOCALE): string {
  const trans = getTranslations(locale)
  const keys = key.split(".")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = trans
  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = result[k]
    } else {
      console.warn(`[i18n] Translation key not found: ${key}`)
      return key
    }
  }

  if (typeof result === "string") {
    return result
  }

  console.warn(`[i18n] Translation key is not a string: ${key}`)
  return key
}

/**
 * 플레이스홀더가 있는 번역 문자열 처리
 * @param key 번역 키
 * @param params 플레이스홀더 값
 * @param locale 언어
 */
export function tWithParams(
  key: string,
  params: Record<string, string | number>,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  let result = t(key, locale)

  for (const [paramKey, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value))
  }

  return result
}

// 편의를 위한 재내보내기
export { ko }
export type { TranslationKeys }

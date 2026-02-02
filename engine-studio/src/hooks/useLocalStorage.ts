"use client"

import { useState, useCallback, useSyncExternalStore } from "react"

/**
 * localStorage와 동기화되는 상태 훅
 * @param key - localStorage 키
 * @param initialValue - 초기값
 * @returns [값, 설정함수]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // 서버/클라이언트 값 가져오기
  const getSnapshot = useCallback((): T => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  }, [key, initialValue])

  const getServerSnapshot = useCallback((): T => {
    return initialValue
  }, [initialValue])

  const subscribe = useCallback(
    (callback: () => void) => {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key) {
          callback()
        }
      }
      window.addEventListener("storage", handleStorageChange)
      return () => window.removeEventListener("storage", handleStorageChange)
    },
    [key]
  )

  const storedValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [, setTrigger] = useState(0)

  // 값 설정 함수
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const currentValue = getSnapshot()
        const valueToStore =
          value instanceof Function ? value(currentValue) : value

        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        setTrigger((prev) => prev + 1)
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, getSnapshot]
  )

  return [storedValue, setValue]
}

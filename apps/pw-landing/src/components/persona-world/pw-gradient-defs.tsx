"use client"

/**
 * SVG 그라데이션 정의 컴포넌트
 * 아이콘에 그라데이션을 적용하기 위한 defs
 */
export function PWGradientDefs() {
  return (
    <svg className="pw-gradient-defs" aria-hidden="true">
      <defs>
        <linearGradient id="pw-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="50%" stopColor="#f093fb" />
          <stop offset="100%" stopColor="#f5576c" />
        </linearGradient>
        <linearGradient id="pw-gradient-horizontal" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="50%" stopColor="#f093fb" />
          <stop offset="100%" stopColor="#f5576c" />
        </linearGradient>
      </defs>
    </svg>
  )
}

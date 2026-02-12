// ═══════════════════════════════════════════════════════════════
// Theme Toggle — Unit Tests
// T102: Light/Dark 테마 전환 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

// ── CSS 변수 검증 ───────────────────────────────────────────

describe("T102: 테마 CSS 변수", () => {
  const cssPath = path.resolve(__dirname, "../../src/app/globals.css")
  const css = fs.readFileSync(cssPath, "utf-8")

  it("light 테마 변수가 @theme 블록에 정의되어야 한다", () => {
    expect(css).toContain("--color-background")
    expect(css).toContain("--color-foreground")
    expect(css).toContain("--color-card")
    expect(css).toContain("--color-primary")
    expect(css).toContain("--color-secondary")
    expect(css).toContain("--color-muted")
    expect(css).toContain("--color-accent")
    expect(css).toContain("--color-border")
    expect(css).toContain("--color-sidebar")
  })

  it("dark 테마 변수가 .dark 블록에 정의되어야 한다", () => {
    expect(css).toContain(".dark {")
    // dark 블록 내에서 변수 오버라이드 확인
    const darkBlock = css.slice(css.indexOf(".dark {"))
    expect(darkBlock).toContain("--color-background")
    expect(darkBlock).toContain("--color-foreground")
    expect(darkBlock).toContain("--color-card")
    expect(darkBlock).toContain("--color-sidebar")
  })

  it("dark 배경이 Claude 스타일 다크 그레이 (#1a1a2e 계열)이어야 한다", () => {
    const darkBlock = css.slice(css.indexOf(".dark {"))
    expect(darkBlock).toContain("#1a1a2e")
  })

  it("light 배경이 흰색 계열이어야 한다", () => {
    // @theme 블록 (dark 앞)
    const themeBlock = css.slice(0, css.indexOf(".dark {"))
    expect(themeBlock).toContain("#ffffff")
  })

  it("light/dark 모두 radius 변수를 공유해야 한다", () => {
    expect(css).toContain("--radius-sm")
    expect(css).toContain("--radius-md")
    expect(css).toContain("--radius-lg")
    expect(css).toContain("--radius-xl")
  })
})

// ── Layout 검증 ─────────────────────────────────────────────

describe("T102: Layout ThemeProvider 통합", () => {
  const layoutPath = path.resolve(__dirname, "../../src/app/layout.tsx")
  const layout = fs.readFileSync(layoutPath, "utf-8")

  it("ThemeProvider가 import되어야 한다", () => {
    expect(layout).toContain("ThemeProvider")
  })

  it("html 태그에 suppressHydrationWarning이 있어야 한다", () => {
    expect(layout).toContain("suppressHydrationWarning")
  })

  it("html 태그에 hardcoded dark 클래스가 없어야 한다", () => {
    expect(layout).not.toContain('className="dark"')
  })
})

// ── ThemeProvider 검증 ──────────────────────────────────────

describe("T102: ThemeProvider 컴포넌트", () => {
  const providerPath = path.resolve(__dirname, "../../src/components/theme-provider.tsx")
  const provider = fs.readFileSync(providerPath, "utf-8")

  it("next-themes를 사용해야 한다", () => {
    expect(provider).toContain("next-themes")
  })

  it('attribute="class"를 설정해야 한다', () => {
    expect(provider).toContain('attribute="class"')
  })

  it('defaultTheme="dark"을 설정해야 한다', () => {
    expect(provider).toContain('defaultTheme="dark"')
  })

  it("enableSystem을 설정해야 한다", () => {
    expect(provider).toContain("enableSystem")
  })
})

// ── LNB 토글 버튼 검증 ──────────────────────────────────────

describe("T102: LNB 테마 토글 버튼", () => {
  const lnbPath = path.resolve(__dirname, "../../src/components/layout/lnb.tsx")
  const lnb = fs.readFileSync(lnbPath, "utf-8")

  it("useTheme 훅을 import해야 한다", () => {
    expect(lnb).toContain("useTheme")
    expect(lnb).toContain("next-themes")
  })

  it("Sun/Moon 아이콘을 import해야 한다", () => {
    expect(lnb).toContain("Sun")
    expect(lnb).toContain("Moon")
  })

  it("setTheme 호출 코드가 있어야 한다", () => {
    expect(lnb).toContain("setTheme")
  })

  it("mounted 상태로 hydration mismatch를 방지해야 한다", () => {
    expect(lnb).toContain("mounted")
    expect(lnb).toContain("setMounted(true)")
  })

  it("Light Mode / Dark Mode 텍스트가 있어야 한다", () => {
    expect(lnb).toContain("Light Mode")
    expect(lnb).toContain("Dark Mode")
  })
})

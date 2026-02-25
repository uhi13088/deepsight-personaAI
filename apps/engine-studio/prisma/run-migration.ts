/**
 * SQL Migration Runner — psql 없이 Prisma Client로 SQL 실행
 * Usage: pnpm db:run-sql <file1.sql> [file2.sql ...]
 */

import { PrismaClient } from "../src/generated/prisma"
import { readFileSync } from "fs"
import { resolve } from "path"

const prisma = new PrismaClient()

async function runSqlFile(filePath: string) {
  const resolved = resolve(filePath)
  console.log(`\n📄 Executing: ${resolved}`)

  const sql = readFileSync(resolved, "utf-8")

  // SQL을 개별 문(statement)으로 분리
  // DO $$ ... END $$; 블록과 일반 세미콜론 구문을 구분
  const statements = splitSqlStatements(sql)

  let executed = 0
  for (const stmt of statements) {
    const trimmed = stmt.trim()
    if (!trimmed || trimmed.startsWith("--")) continue

    try {
      await prisma.$executeRawUnsafe(trimmed)
      executed++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // 이미 적용된 변경은 무시 (멱등성)
      if (message.includes("already exists") || message.includes("does not exist")) {
        console.log(`  ⏭ Skipped (already applied): ${trimmed.slice(0, 60)}...`)
      } else {
        console.error(`  ❌ Failed: ${trimmed.slice(0, 80)}...`)
        throw err
      }
    }
  }

  console.log(`  ✅ Done — ${executed} statement(s) executed`)
}

/**
 * SQL 텍스트를 개별 statement로 분리
 * DO $$ ... END $$; 블록을 하나의 단위로 유지
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ""
  let inDollarBlock = false

  const lines = sql.split("\n")
  for (const line of lines) {
    const trimmedLine = line.trim()

    // 주석 전용 라인 스킵
    if (trimmedLine.startsWith("--") && !inDollarBlock) {
      continue
    }

    // DO $$ 블록 시작 감지
    if (trimmedLine.match(/^DO\s+\$\$/i)) {
      inDollarBlock = true
    }

    current += line + "\n"

    // DO $$ 블록 종료 감지
    if (inDollarBlock && trimmedLine.match(/END\s+\$\$\s*;/i)) {
      statements.push(current.trim())
      current = ""
      inDollarBlock = false
      continue
    }

    // 일반 statement 종료 (세미콜론)
    if (!inDollarBlock && trimmedLine.endsWith(";")) {
      statements.push(current.trim())
      current = ""
    }
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

async function main() {
  const files = process.argv.slice(2)

  if (files.length === 0) {
    console.error("Usage: pnpm db:run-sql <file1.sql> [file2.sql ...]")
    process.exit(1)
  }

  for (const file of files) {
    await runSqlFile(file)
  }

  console.log("\n🎉 All migrations applied!")
}

main()
  .catch((e) => {
    console.error("\n❌ Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

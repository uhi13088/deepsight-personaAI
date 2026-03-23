-- Migration: Add all missing columns to users table
-- The users table was created before 001_full_schema.sql added new columns.
-- CREATE TABLE IF NOT EXISTS skips if table already exists, so these columns were never added.
-- Date: 2026-03-23

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- sessions 테이블 누락 컬럼 (동일 CREATE TABLE IF NOT EXISTS 문제)
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

-- Migration: Add emailVerified column to users table
-- Required for NextAuth OAuth sign-in flow (Google login)
-- Date: 2026-03-23

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);

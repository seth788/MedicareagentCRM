/**
 * Application-level encryption for PHI (e.g. Medicare numbers).
 * Uses AES-256-CBC with a unique IV per value. Server-only; do not import in client components.
 * ENCRYPTION_KEY must be 32 bytes, typically stored as 64 hex chars (e.g. openssl rand -hex 32).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-cbc"
const IV_LENGTH = 16
const KEY_BYTES = 32
const SEP = ":"

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || typeof raw !== "string") {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }
  const trimmed = raw.trim()
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex")
  }
  const b64 = Buffer.from(trimmed, "base64")
  if (b64.length === KEY_BYTES) return b64
  throw new Error("ENCRYPTION_KEY must be 32 bytes: use 64 hex chars (e.g. openssl rand -hex 32) or 44 base64 chars")
}

/**
 * Encrypts plaintext. Output format: ivHex:base64Ciphertext (safe for text column).
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim() === "") {
    return ""
  }
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return iv.toString("hex") + SEP + enc.toString("base64")
}

/**
 * Decrypts a value produced by encrypt(). If the value does not look like iv:ciphertext,
 * returns empty string (e.g. for null/empty or legacy plaintext that was never migrated).
 */
export function decrypt(encrypted: string): string {
  if (!encrypted || typeof encrypted !== "string" || encrypted.trim() === "") {
    return ""
  }
  const idx = encrypted.indexOf(SEP)
  if (idx === -1) {
    return ""
  }
  const ivHex = encrypted.slice(0, idx)
  const ciphertextB64 = encrypted.slice(idx + SEP.length)
  if (!ivHex || !ciphertextB64) return ""
  try {
    const key = getKey()
    const iv = Buffer.from(ivHex, "hex")
    if (iv.length !== IV_LENGTH) return ""
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    return decipher.update(ciphertextB64, "base64", "utf8") + decipher.final("utf8")
  } catch {
    return ""
  }
}

/**
 * Returns true if the value appears to be in encrypted format (iv:ciphertext).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false
  const idx = value.indexOf(SEP)
  if (idx === -1) return false
  const ivHex = value.slice(0, idx)
  return ivHex.length === IV_LENGTH * 2 && /^[0-9a-f]+$/i.test(ivHex)
}

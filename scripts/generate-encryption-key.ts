/**
 * Outputs a 32-byte hex key for ENCRYPTION_KEY. Run with: npx tsx scripts/generate-encryption-key.ts
 * Add to .env.local: ENCRYPTION_KEY=<paste output>
 */

import { randomBytes } from "node:crypto"
console.log(randomBytes(32).toString("hex"))

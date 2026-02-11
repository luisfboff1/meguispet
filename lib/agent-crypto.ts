import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.AGENT_ENCRYPTION_KEY
  if (!key) {
    throw new Error('AGENT_ENCRYPTION_KEY environment variable is not set')
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypts an API key using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (all hex)
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypts an API key encrypted with encryptApiKey
 * Expects format: iv:authTag:encryptedData (all hex)
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted API key format')
  }

  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid IV or auth tag length')
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Returns a masked preview of an API key
 * e.g. "sk-proj-abc123...xyz" -> "sk-...xyz"
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 6) return '***'
  const prefix = apiKey.substring(0, 3)
  const suffix = apiKey.substring(apiKey.length - 3)
  return `${prefix}...${suffix}`
}

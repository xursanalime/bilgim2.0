import { Injectable } from '@nestjs/common';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';

const CIPHER_ALGO = 'aes-256-gcm';
const IV_LEN = 12;

/**
 * Refresh token (va kelajakda boshqa ephemeral maxfiy qiymatlar) uchun
 * app-level encryption (docs §9). Kalit AUTH_REFRESH_SECRET'dan sha256
 * orqali olinadi; shifrlangan token DB'da saqlanadi, rotation/reuse
 * detection uchun `hashValue` deterministik sha256 beradi.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash('sha256').update(secret).digest().subarray(0, 32);
  }

  /** Deterministik hash — buffer'larni compare qilish uchun. */
  hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** AES-256-GCM shifrlash — `v1:<iv>.<tag>.<data>` (iv/tag/data base64url). */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(CIPHER_ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  decrypt(payload: string): string {
    const [version, rest] = payload.split(':');
    if (version !== 'v1' || !rest) throw new Error('Unexpected ciphertext format');
    const [ivB64, tagB64, dataB64] = rest.split('.');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Malformed ciphertext');
    const decipher = createDecipheriv(CIPHER_ALGO, this.key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const KEYLEN = 32;

function deriveKey(pin: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pin, salt, KEYLEN, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await deriveKey(pin, salt);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    const [algo, salt, storedHex] = hash.split(':');
    if (algo !== 'scrypt' || !salt || !storedHex) return false;
    const derived = await deriveKey(pin, salt);
    const stored = Buffer.from(storedHex, 'hex');
    return derived.length === stored.length && timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}

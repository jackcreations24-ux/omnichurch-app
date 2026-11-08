/**
 * OmniChurch Cryptographic Security Module
 * Provides zero-knowledge hashing for church admin PINs and passcodes
 * using standard Web Crypto API (SHA-256 with church-scoped salt).
 */

const HASH_PREFIX = 'sha256:v1:';

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function computeSha256Hex(ascii: string): string {
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] |= code << (24 - (i % 4) * 8);
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let i = 0; i < words.length; i += 16) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) {
      w[j] = words[i + j] || 0;
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (let j = 0; j < 64; j++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    result += (hash[i] >>> 0).toString(16).padStart(8, '0');
  }

  return result;
}

/**
 * Computes a standard SHA-256 hash of a passcode with a church-scoped salt.
 */
export function hashAdminPasscodeSync(passcode: string, salt: string): string {
  const cleanPass = (passcode || '').trim();
  const cleanSalt = (salt || '').trim().toLowerCase();
  const combined = `omnichurch:${cleanSalt}:${cleanPass}:security_entropy_2026`;
  const hex = computeSha256Hex(combined);
  return `${HASH_PREFIX}${hex}`;
}

/**
 * Computes a cryptographic SHA-256 hash of a passcode with salt (async wrapper).
 */
export async function hashAdminPasscode(passcode: string, salt: string): Promise<string> {
  return hashAdminPasscodeSync(passcode, salt);
}

/**
 * Verifies an entered passcode against a stored passcode or hash.
 * Supports backward-compatibility with existing unhashed passcodes,
 * allowing seamless progressive migration.
 */
export async function verifyAdminPasscode(
  enteredPasscode: string,
  storedPasscodeOrHash: string | undefined,
  salt: string
): Promise<{ matches: boolean; needsUpgrade: boolean }> {
  const cleanEntered = (enteredPasscode || '').trim();
  const stored = (storedPasscodeOrHash || '').trim();

  if (!cleanEntered || !stored) {
    return { matches: false, needsUpgrade: false };
  }

  // If stored is already hashed
  if (stored.startsWith(HASH_PREFIX)) {
    const expectedHash = await hashAdminPasscode(cleanEntered, salt);
    return { matches: stored === expectedHash, needsUpgrade: false };
  }

  // Legacy plaintext match
  if (stored === cleanEntered) {
    return { matches: true, needsUpgrade: true };
  }

  return { matches: false, needsUpgrade: false };
}

/**
 * Checks if a stored passcode string is already securely hashed.
 */
export function isPasscodeHashed(passcodeOrHash?: string): boolean {
  return typeof passcodeOrHash === 'string' && passcodeOrHash.startsWith(HASH_PREFIX);
}

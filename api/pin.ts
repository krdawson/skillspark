import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { adminClient, requireUser } from './_auth.js';

// ── PIN hashing (salted scrypt) ───────────────────────────────────────────────
function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyHash(pin: string, stored: string): boolean {
  // Legacy plaintext rows migrated as "plain:1234"
  if (stored.startsWith('plain:')) return stored.slice(6) === pin;

  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const isPin = (v: unknown): v is string => typeof v === 'string' && /^\d{4}$/.test(v);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  // Any valid session (anonymous kid device or Google parent) may call this.
  const user = await requireUser(req, res);
  if (!user) return;

  const { action, profileId, pin } = req.body ?? {};
  if (!profileId || typeof profileId !== 'string') {
    return res.status(400).json({ error: 'Missing profileId' });
  }

  const db = adminClient();

  // ── verify ──────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!isPin(pin)) return res.status(400).json({ error: 'PIN must be 4 digits' });

    const { data } = await db.from('profile_pins')
      .select('pin_hash').eq('profile_id', profileId).maybeSingle();

    if (!data) return res.status(200).json({ ok: false });

    const ok = verifyHash(pin, data.pin_hash);

    // Transparently upgrade legacy plaintext to a salted hash on success.
    if (ok && data.pin_hash.startsWith('plain:')) {
      await db.from('profile_pins').update({ pin_hash: hashPin(pin) }).eq('profile_id', profileId);
    }
    return res.status(200).json({ ok });
  }

  // ── set (kid creates their PIN) ───────────────────────────────────────────
  if (action === 'set') {
    if (!isPin(pin)) return res.status(400).json({ error: 'PIN must be 4 digits' });

    const { error } = await db.from('profile_pins')
      .upsert({ profile_id: profileId, pin_hash: hashPin(pin), updated_at: new Date().toISOString() });
    if (error) return res.status(500).json({ error: error.message });

    await db.from('profiles').update({ has_pin: true }).eq('id', profileId);
    return res.status(200).json({ ok: true });
  }

  // ── clear (admin resets a kid's PIN) ──────────────────────────────────────
  if (action === 'clear') {
    if (user.is_anonymous) return res.status(403).json({ error: 'Admin only' });

    await db.from('profile_pins').delete().eq('profile_id', profileId);
    await db.from('profiles').update({ has_pin: false }).eq('id', profileId);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

import jwt from 'npm:jsonwebtoken@9';

// JWT_SECRET must be set as a Supabase function secret (see deploy notes)
// — unlike SUPABASE_URL/SERVICE_ROLE_KEY it is NOT auto-injected.
const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'dev-only-secret-change-me';

export class AuthError extends Error {}

export function signToken(user: { id: number; phone: string }) {
  return jwt.sign({ sub: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });
}

export function getUserIdFromRequest(req: Request): number {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AuthError('נדרשת התחברות');
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: number };
    return payload.sub;
  } catch {
    throw new AuthError('החיבור פג תוקף, יש להתחבר מחדש');
  }
}

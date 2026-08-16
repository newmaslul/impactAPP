import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

export function signToken(user) {
  return jwt.sign({ sub: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'נדרשת התחברות' });

  try {
    req.userId = jwt.verify(token, JWT_SECRET).sub;
    next();
  } catch {
    return res.status(401).json({ error: 'החיבור פג תוקף, יש להתחבר מחדש' });
  }
}

import jwt, { Secret } from 'jsonwebtoken';

interface Payload {
  [key: string]: any;
}

/**
 * Génère un token JWT à partir d'un payload utilisateur
 */
export function generateToken(payload: Payload): string {
  const secret: Secret = process.env.JWT_SECRET || 'secret';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

/**
 * Vérifie la validité d'un token JWT
 */
export function verifyToken(token: string): Payload | null {
  try {
    const secret: Secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret);
    return decoded as Payload;
  } catch (error) {
    return null;
  }
}

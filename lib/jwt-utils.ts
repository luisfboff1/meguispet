import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: number;
  email: string;
  role: string;
  exp?: number;
}

const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

export const signJWT = (payload: Omit<JWTPayload, 'exp'>): string => {
  const secret = getJWTSecret();
  return jwt.sign(payload, secret, { expiresIn: '24h' });
};

export const verifyJWT = (token: string): JWTPayload | null => {
  try {
    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

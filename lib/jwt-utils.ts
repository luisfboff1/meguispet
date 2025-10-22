import { SignJWT, jwtVerify } from 'jose';

interface JWTPayload {
  id: number;
  email: string;
  role: string;
}

// Usa o JWT_SECRET do Supabase que já é injetado automaticamente pela Vercel
// Fallback para desenvolvimento local
const JWT_SECRET = 
  process.env.SUPABASE_JWT_SECRET || 
  process.env.JWT_SECRET || 
  'meguispet_jwt_secret_2025_super_secure_key_luisfboff_production';
const JWT_EXPIRY = '24h';

// Converte a secret string para Uint8Array (requerido pelo jose)
const getSecretKey = () => new TextEncoder().encode(JWT_SECRET);

export const signJWT = async (payload: JWTPayload): Promise<string> => {
  try {
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(getSecretKey());
    
    return token;
  } catch (error) {
    console.error('❌ Erro ao criar JWT:', error);
    throw new Error('Falha ao criar token de autenticação');
  }
};

export const verifyJWT = async (token: string): Promise<JWTPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    
    return {
      id: payload.id as number,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch (error) {
    console.error('❌ Erro ao verificar JWT:', error);
    return null;
  }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

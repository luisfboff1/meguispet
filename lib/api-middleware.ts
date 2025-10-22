import { NextApiRequest, NextApiResponse } from 'next';
import { verifyJWT, extractTokenFromHeader } from './jwt-utils';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: number;
    email: string;
    role: string;
  };
}

export const withAuth = (
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido',
      });
    }

    const payload = verifyJWT(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado',
      });
    }

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    return handler(authenticatedReq, res);
  };
};

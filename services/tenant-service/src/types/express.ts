import { Request } from 'express';
import { AuthenticatedUser } from '../middleware/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
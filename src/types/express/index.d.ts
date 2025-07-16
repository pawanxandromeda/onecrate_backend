// types/express.d.ts or types/custom.d.ts
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Every response carries an id you can quote from a support ticket straight into the logs. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming)?.slice(0, 64) || randomUUID();
  (req as Request & { requestId: string }).requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

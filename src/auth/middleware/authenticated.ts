import { NextFunction, Request, Response } from 'express';

/**
 * This middleware should be called AFTER 'validate'
 * Checks for a user and returns a 401 if none found
 */
export async function authenticated(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).send();
    }

    next();
};

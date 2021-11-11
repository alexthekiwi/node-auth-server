import { NextFunction, Request, Response } from 'express';

/**
 * Only allow non-authenticated users
 */
export async function guest(req: Request, res: Response, next: NextFunction) {
    if (req.user) {
        return res.redirect('/');
    }

    next();
};

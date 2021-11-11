import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getSecret } from '../../lib/secret';

/**
 * Checks the request for a valid password reset token
 */
export async function validateResetToken(req: Request, res: Response, next: NextFunction) {
    let token: string|undefined;

    // First check the query string
    token = req.query.token ? req.query.token.toString() : undefined;

    // Now check the post body (used for submitting the form)
    if (!token) {
        token = req.body._token;
    }

    // No token found, get outta here
    if (!token) {
        return res.redirect('/login');
    }

    try {
        // Validate the token
        jwt.verify(token, getSecret());

        // Save the token to the current request for the next part
        req.passwordResetToken = token;

        // Went well, okay to proceed
        return next();
    } catch(err) {
        // Token expired
        return res.redirect('/login');
    }
};

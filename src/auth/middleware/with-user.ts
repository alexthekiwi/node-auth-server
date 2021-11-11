import { Request, Response, NextFunction } from 'express';
import { isAfter } from 'date-fns';

import { validateToken, parseRequestTokens, generateAccessToken } from '../auth.services';
import { prisma } from '../../lib/prisma';

/**
 * This middleware just attempts to add the user to our request
 * It does not redirect if unauthenticated
 */
export async function validateAndRefreshTokens(req: Request, res: Response, next: NextFunction) {
    const { accessToken: accessTokenValue, refreshToken: refreshTokenId } = parseRequestTokens(req);

    // Check the validity of our access token
    const accessTokenValid = accessTokenValue && validateToken(accessTokenValue);

    if (accessTokenValid) {
        // Access token is all good, let's find it in the db and grab the user from it
        const accessToken = await prisma.accessToken.findUnique({
            where: { value: accessTokenValue },
            include: {
                user: {
                    // Sanitise the user fields
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (accessToken) {
            // Add our user and accessTokenValue to the request
            req.user = accessToken.user;
            req.accessToken = accessTokenValue;
            req.refreshToken = refreshTokenId;

            // Send the request along
            return next();
        }
    }

    if (!accessTokenValid && refreshTokenId) {
        // Access token was invalid, let's check our refresh token
        const refreshToken = await prisma.refreshToken.findUnique({
            where: { id: refreshTokenId },
            include: {
                user: {
                    // Sanitise the user fields
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (refreshToken) {
            // Is the date now after the expiry date?
            const refreshTokenExpired = isAfter(new Date(), refreshToken.expiresAt);

            if (!refreshTokenExpired) {
                // Refresh token is OK, let's use it to create a new access token
                const newAccessToken = await generateAccessToken(refreshToken.userId);

                // Add our user and tokens to the request
                req.user = refreshToken.user;
                req.accessToken = newAccessToken.value;
                req.refreshToken = refreshTokenId;

                // Send the request along
                return next();
            }
        }
    }

    // Send the request along with no user attached (can be validated later with the "authenticated" middleware)
    return next();
}

import jwt from 'jsonwebtoken';
import { User, AccessToken, RefreshToken } from '@prisma/client';
import { Request, Response } from 'express';
import { endOfDay, addMilliseconds, differenceInMilliseconds } from 'date-fns';
import ms from 'ms';

import { prisma } from '../lib/prisma';
import { getSecret } from '../lib/secret';

/**
 * Generates a new access token
 */
export async function generateAccessToken(userId: User['id']): Promise<AccessToken> {
    const secret = getSecret();

    const tokenLifetime = process.env.ACCESS_TOKEN_EXPIRY ?? '6 hours';

    const { expiresIn, expiresAt } = generateExpiryTime(tokenLifetime);

    const tokenValue = jwt.sign({ id: userId }, secret, { expiresIn: `${expiresIn} ms` });

    // Make sure we don't try create a duplicate token value in the db
    const existing = await prisma.accessToken.findUnique({ where: { value: tokenValue } });

    if (existing) {
        return existing;
    }

    // Update or create a token
    const token = await prisma.accessToken.upsert({
        where: { value: tokenValue },
        create: {
            value: tokenValue,
            expiresAt,
            userId,
        },
        update: {
            expiresAt,
        }
    });

    return token;
}

/**
 * Generates a new refresh token
 */
export async function generateRefreshToken(userId: User['id']): Promise<RefreshToken> {
    const tokenLifetime = process.env.REFRESH_TOKEN_EXPIRY ?? '30 days';

    const { expiresAt } = generateExpiryTime(tokenLifetime);

    const existingToken = await prisma.refreshToken.findUnique({ where: { userId } });

    let token: RefreshToken|undefined;

    // Upsert the existing token (could still exist if someone cleared cookies rather than actually logging out)
    if (existingToken) {
        token = await prisma.refreshToken.update({
            where: { id: existingToken.id },
            data: { expiresAt }
        });
    } else {
        token = await prisma.refreshToken.create({
            data: {
                expiresAt,
                userId,
            }
        });
    }

    return token;
}

/**
 * Verify a valid JWT in an access token's value
 */
export function validateToken(accessTokenValue: AccessToken['value']): boolean {
    const secret = getSecret();

    try {
        jwt.verify(accessTokenValue, secret);
        return true;
    } catch (err) {
        return false;
    }
}

interface ResponseOptions {
    res: Response;
    accessTokenValue: string|undefined;
    refreshTokenId: string|undefined;
    redirectUrl?: string;
};

/**
 * A higher order function that wraps a response to send back authentication cookies
 * This method can also be used to clear cookies by not passing through tokens
 */
export function setAuthCookies({ res, accessTokenValue: accessToken, refreshTokenId: refreshToken, redirectUrl }: ResponseOptions) {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.COOKIE_DOMAIN,
    };

    let modifiedResponse: Response = res;

    if (accessToken && refreshToken) {
        modifiedResponse
            // accessToken.value is a JWT
            .cookie('access_token', accessToken, cookieOptions)
            // refreshToken.id is a CUID (smaller than JWTs), don't want every request having huge amounts of data
            .cookie('refresh_token', refreshToken, cookieOptions);
    } else {
        modifiedResponse.clearCookie('access_token').clearCookie('refresh_token');
    }

    if (redirectUrl) {
        return modifiedResponse.redirect(redirectUrl);
    }

    return modifiedResponse;
}

/**
 * Reusable function to search the request for an access token
 */
export function parseRequestTokens(req: Request): { accessToken: string|undefined, refreshToken: string|undefined } {
    let accessToken: string|undefined;
    let refreshToken: string|undefined;

    // First check the request headers for a bearer token
    if (req.headers.authorization) {
        const bearerToken = req.headers.authorization.split('Bearer ');

        if (bearerToken.length > 1) {
            accessToken = bearerToken[1]
        }
    }

    // Check cookies second (for SSO)
    if (!accessToken) {
        if (req.cookies.access_token && req.cookies.access_token !== 'undefined') {
            accessToken = req.cookies.access_token;
        }
    }

    // Refresh tokens will only exist on cookies (i.e. not passed by the client)
    if (req.cookies.refresh_token && req.cookies.refresh_token !== 'undefined') {
        refreshToken = req.cookies.refresh_token;
    }

    return { accessToken, refreshToken };
}

interface TokenExpiry {
    expiresIn: number;
    expiresAt: Date;
}

/**
 * Turns environment variables like "in 3 hours" to a difference between now and then in milliseconds
 */
function generateExpiryTime(tokenLifetime: string, expireAtEndOfDay: boolean = false): TokenExpiry {
    // Create a new date X + tokenLifetime
    let expiresAt = addMilliseconds(new Date, ms(tokenLifetime));

    if (expireAtEndOfDay) {
        // Optionally expire at the end of the day
        expiresAt = endOfDay(expiresAt);
    }

    // Get the difference between our expiryTime and now, and return the milliseconds
    const expiresIn = differenceInMilliseconds(expiresAt, new Date);

    return { expiresIn, expiresAt };
}

import jwt from 'jsonwebtoken';
import { User, Token } from '@prisma/client';
import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';

function getSecret(): string|undefined {
    return process.env.TOKEN_SECRET;
}

function generateAccessToken(userId: Number) {
    const secret = getSecret();

    // TODO: Make this an end of day expiry, regardless of current time
    const expiresIn = process.env.ACCESS_TOKEN_EXPIRY ?? '3 hours';

    if (!secret) {
        return null;
    }

    return jwt.sign({ id: userId }, secret, { expiresIn });
}

function generateRefreshToken(userId: Number) {
    const secret = getSecret();

    // TODO: Make this an end of day expiry, regardless of current time
    const expiresIn = process.env.REFRESH_TOKEN_EXPIRY ?? '3 days';

    if (!secret) {
        return null;
    }

    return jwt.sign({ id: userId }, secret, { expiresIn });
}

export async function generateTokens(user: User): Promise<Token|null> {
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    if (!accessToken || !refreshToken) return null;

    const token = await prisma.token.create({
        data: {
            userId: user.id,
            accessToken,
            refreshToken,
        }
    });

    return token;
}

export function validateToken(accessToken: string): boolean {
    const secret = getSecret();
    if (!secret) return false;

    try {
        jwt.verify(accessToken, secret)
        return true;
    } catch (err) {
        return false;
    }
}

export async function refreshToken(refreshToken: string): Promise<Token | undefined> {
    const secret: string|undefined = process.env.TOKEN_SECRET;

    if (!secret) {
        return undefined;
    }

    try {
        jwt.verify(refreshToken, secret)
    } catch(err) {
        return undefined;
    }

    const token = await prisma.token.findUnique({
        where: {
            refreshToken
        }
    });

    if (!token) return undefined;

    const newAccessToken = generateAccessToken(token.userId);
    const newRefreshToken = generateRefreshToken(token.userId);

    if (!newAccessToken || !newRefreshToken) return undefined;

    const newToken = await prisma.token.update({
        where: {
            refreshToken
        },
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        }
    });

    return newToken;
}

/**
 * A higher order function that wraps a response to send back
 * authentication cookies automatically
 *
 * This method can also be used to clear cookies by not passing through a token
 */
export function withCookies(res: Response, token: Token | undefined = undefined): Response {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.COOKIE_DOMAIN,
    }

    if (token) {
        return res
            .cookie('access_token', token.accessToken, cookieOptions)
            .cookie('refresh_token', token.refreshToken, cookieOptions)
    } else {
        return res.clearCookie('access_token').clearCookie('refresh_token');
    }
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

    if (req.cookies.refresh_token && req.cookies.refresh_token !== 'undefined') {
        refreshToken = req.cookies.refresh_token;
    }

    // Now search for a refresh token in the POST body
    if (!refreshToken && req.method === 'POST') {
        if (req.body.refreshToken) {
            refreshToken = req.body.refreshToken;
        }
    }

    return { accessToken, refreshToken };
}

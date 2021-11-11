import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import { setAuthCookies, generateAccessToken, generateRefreshToken } from './auth.services';
import { prisma } from '../lib/prisma';

/**
 * Shows the login form
 */
export async function index(req: Request, res: Response) {
    return res.render('login');
}

/**
 * Creates a new logged in session
 */
export async function store(req: Request, res: Response) {
    const { email, password } = req.body;

    // Check required inputs
    if (!email || !password) {
        return loginFail(res);
    }

    // Validate types
    if (typeof email !== 'string' || typeof password !== 'string') {
        return loginFail(res);
    }

    // Find a user
    const user = await prisma.user.findUnique({
        where: { email },
    });

    // Abort if no match by email
    if (!user) {
        return loginFail(res);
    }

    // Compare the input with hashed password
    try {
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            // Generate tokens for the user
            const accessToken = await generateAccessToken(user.id);
            const refreshToken = await generateRefreshToken(user.id);

            if (accessToken && refreshToken) {
                // Select only certain fields from the user
                const { id, name, email } = user;
                const sanitisedUser = { id, name, email };

                // Set our cookies and return the user, along with the access token
                const response = setAuthCookies({ res, accessTokenValue: accessToken.value, refreshTokenId: refreshToken.id });

                if (response) {
                    response.send({ user: sanitisedUser, accessToken });
                }
            } else {
                return loginFail(res);
            }
        } else {
            loginFail(res);
        }
    } catch(err) {
        return loginFail(res);
    }
}

/**
 * Destroys all logged in sessions for a user
 */
export async function destroy(req: Request, res: Response) {
    const { redirectUrl: redirectOnLogout } = req.query;

    // Kill all of this user's tokens from the database
    await prisma.accessToken.deleteMany({
        where: {
            userId: req.user?.id
        }
    });

    await prisma.refreshToken.deleteMany({
        where: {
            userId: req.user?.id
        }
    });

    let redirectUrl: string|undefined;

    if (redirectOnLogout && typeof redirectOnLogout === 'string') {
        redirectUrl = redirectOnLogout;
    }

    // Set all cookies to null
    const response = setAuthCookies({ res, accessTokenValue: undefined, refreshTokenId: undefined, redirectUrl });

    if (response) {
        return response.send({ message: 'Logout successful' });
    }
}

/**
 * Generic login error function
 */
function loginFail(res: Response) {
    return res.status(404).send('Invalid credentials supplied');
}

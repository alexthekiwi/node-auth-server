import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import { generateTokens, withCookies, refreshToken, parseRequestTokens } from './auth.services';
import { prisma } from '../lib/prisma';
import { Token } from '.prisma/client';


/**
 * Creates a new logged in session
 *
 * @param req
 * @param res
 * @returns
 */
export async function store(req: Request, res: Response) {
    const { email, password } = req.query;

    // Check required inputs
    if(!email || !password) {
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
        const pwCorrect = await bcrypt.compare(password, user.password);

        if (pwCorrect === true) {
            // Generate a token for the user
            const token = await generateTokens(user);

            if (token) {
                const { id, name, email } = user;
                const sanitisedUser = {id, name, email};

                return withCookies(res, token).send({ user: sanitisedUser, token })
            } else {
                return loginFail(res);
            }
        } else {
            loginFail(res);;
        }
    } catch(err) {
        return loginFail(res);
    }
}

/**
 * Destroys all logged in sessions for a user
 *
 * @param req
 * @param res
 */
export async function destroy(req: Request, res: Response) {
    // Kill all of this user's tokens from the database
    await prisma.token.deleteMany({
        where: {
            userId: req.user?.id
        }
    });

    // Set all cookies to null by not passing through a token
    return withCookies(res).send({ message: 'Logout successful' });
}

/**
 * The handler for refreshing an access token
 *
 * @param req
 * @param res
 */
export async function refresh(req: Request, res: Response) {
    const { refreshToken: oldRefreshToken } = parseRequestTokens(req);
    let updatedToken: Token|undefined;

    if (oldRefreshToken) {
        updatedToken = await refreshToken(oldRefreshToken);
    }

    if (updatedToken) {
        return withCookies(res, updatedToken).send({ token: updatedToken });
    } else {
        res.status(403).send();
    }
}

/**
 * Generic login error function
 *
 * @param res {Response}
 * @returns {Response}
 */
function loginFail(res: Response) {
    return res.status(404).send('Invalid credentials supplied');
}

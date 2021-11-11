import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { sendResetEmail } from './forgot-password.services';
import { prisma } from '../lib/prisma';

/**
 * Shows the forgot password form
 */
export async function index(req: Request, res: Response) {
    return res.render('forgot-password');
}

/**
 * Handles the form submission
 */
export async function store(req: Request, res: Response) {
    // Validate submission
    const { email } = req.body;

    if (!email) {
        return res.status(400).send('Invalid input');
    }

    // Make the request
    await sendResetEmail(email);

    // Respond
    return res.status(201).send();
}

/**
 * Shows the form for setting a new password
 */
export async function show(req: Request, res: Response) {
    const token = req.passwordResetToken;

    if (!token || typeof token === 'undefined') {
        return res.redirect('/login');
    }

    const tokenBody = jwt.decode(token);
    let email;

    if (tokenBody && typeof tokenBody !== 'string') {
        email = tokenBody.email;
    }

    return res.render('forgot-password-reset', {
        email,
        token,
    });
}

/**
 * Handles saving the new password form
 */
export async function save(req: Request, res: Response) {
    const { email, password, passwordConfirm } = req.body;

    const token = req.passwordResetToken;

    // Validate inputs
    if (!email || !password || !passwordConfirm || !token) {
        return res.redirect('/login');
    }

    // Make sure the passwords match
    if (password !== passwordConfirm) {
        return res.status(400).send({ message: 'Passwords must match' });
    }

    // Make sure the token actually matches this email address
    const tokenData = jwt.decode(token);

    // Token exists, token is an object, token has "email", "email" is identical to the post body
    if (!tokenData || typeof tokenData !== 'object' || !tokenData.email || tokenData.email !== email) {
        return res.status(400).send({ message: 'Invalid token/email' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    await prisma.user.update({
        where: { email },
        data: {
            password: hashedPassword,
        }
    });

    // Send an empty 200 response
    return res.send();
}

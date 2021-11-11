import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { getSecret } from '../lib/secret';
import { sendEmail } from '../lib/mailer';

export async function sendResetEmail(email: string): Promise<void> {
    // Check for a valid user
    const user = await prisma.user.findUnique({
        where: {
            email,
        }
    });

    // Nothing to do here, we don't want to let the user know if the user was valid or not
    if (!user) return;

    // Sign a token which can be used later
    // This contains the user's email, and expires in 30 minutes
    const token = jwt.sign({ email }, getSecret(), { expiresIn: '30 minutes'});

    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT}`;
    const resetUrl = `${baseUrl}/forgot-password/reset?token=${token}`;

    const body = `
        <h1>Your password reset</h1>
        <p><a href="${resetUrl}">Click here</a> to reset your password</p>
        <p>Or copy and paste the below in to your web browser if the above link doesn't work:</p>
        <p>${resetUrl}</p>
    `;

    // Send the user an email with their token
    sendEmail({
        toEmail: user.email,
        toName: user.name,
        subject: 'Your password reset',
        body,
    });
}

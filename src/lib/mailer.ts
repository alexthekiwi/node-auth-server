import nodemailer from 'nodemailer';

export function mailer() {
    const host = process.env.MAIL_HOST;
    const port = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587;
    const user = process.env.MAIL_USERNAME;
    const pass = process.env.MAIL_PASSWORD;
    const secure = Boolean(process.env.MAIL_SECURE) || false;
    const encryption = process.env.MAIL_ENCRYPTION || false;

    if (!host || !user || !pass) {
        throw new Error('Invalid mail config');
    };

    return nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS: encryption ? true : false,
        auth: {
            user,
            pass
        }
    });
}

interface NewEmail {
    toEmail: string;
    toName?: string;
    fromEmail?: string;
    fromName?: string;
    subject: string;
    body: string;
}

function compose({ toEmail, toName, fromEmail, fromName, subject, body }: NewEmail, sendPlain: boolean = false) {
    const from = (fromName && fromEmail) ? `${fromName} <${fromEmail}>` : 'auth@example.com';

    const data = {
        to: toName ? `${toName} <${toEmail}>` : toEmail,
        from,
        subject,
        text: '',
        html: '',
    };

    if (sendPlain) {
        data.text = body;
    } else {
        data.html = body;
    }

    return data;
}

export async function sendEmail(params: NewEmail) {
    const email = compose(params, false);

    try {
        await mailer().sendMail(email);
    } catch(err) {
        console.log(err);
    }
}

export async function sendPlainEmail(params: NewEmail) {
    const email = compose(params, true);
    await mailer().sendMail(email);
}

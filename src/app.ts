import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fetch from 'isomorphic-fetch';

import userRouter from './users/user.router';
import authRouter from './auth/auth.router';
import forgotPasswordRouter from './forgot-password/forgot-password.router';
import { authenticated, validateAndRefreshTokens } from './auth/middleware';
import { me } from './users/user.controller';
import expressHbs from 'express-handlebars';
import { prisma } from './lib/prisma';
import { setAuthCookies } from './auth/auth.services';

const app: Express = express();

// Environment config
app.set('port', process.env.PORT || 8888);
app.set('env', process.env.NODE_ENV || 'local');

// Set the view engine
app.engine('hbs', expressHbs({
    layoutsDir: path.join(__dirname, '../views', 'layouts'),
    defaultLayout: 'main.hbs',
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../views'));

// Set the public directory
app.use(express.static(path.join(__dirname, '../public')))

// Request/Response config
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: true,
}));

// Global middleware (Must run before router registrations)
app.use(validateAndRefreshTokens);

// Register our routers
app.use(authRouter);
app.use('/users', userRouter);
app.get('/me', authenticated, me);
app.use('/forgot-password', forgotPasswordRouter);

// App default route
app.get('/', async (req: Request, res: Response) => {
    // Check for a redirect URL and client/session IDs in the request
    const { redirectUrl, clientId, sessionId } = req.query;

    // Redirect to login if there's no user or accessToken (added in the "with-user" middleware)
    if (!req.user || !req.accessToken) {
        return res.redirect(redirectUrl ? `/login?redirectUrl=${redirectUrl}` : '/login');
    }

    const { user, accessToken: accessTokenValue, refreshToken: refreshTokenId } = req;

    // If we passed in a redirect URL
    if (redirectUrl && typeof redirectUrl === 'string') {
        if (clientId && typeof clientId === 'string') {
            // Make sure we have a matching client in our database
            const client = await prisma.client.findUnique({ where: { id: clientId }});

            if (client) {
                // Ping the client's callback URL with our token values
                // This relies on the client application having a valid route handler for this POST request
                const config = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        accessToken: accessTokenValue,
                        user,
                        // We may have received a session ID, send it back so the consuming app can associate a webhook with a session
                        sessionId,
                    }),
                };

                const ping = await fetch(client.callbackUrl, config);

                if (ping) {
                    return setAuthCookies({ res, accessTokenValue, refreshTokenId, redirectUrl });
                }
            } else {
                // Invalid client ID, stop here and force a login (avoiding an infinite loop)
                return res.redirect('/login');
            }
        }

        // Send the user back to the specified redirect URL
        return res.redirect(redirectUrl);
    }

    // Display the user's dashboard
    return setAuthCookies({ res, accessTokenValue, refreshTokenId, redirectUrl: '/dashboard' });
});

app.use(function(req, res) {
    res.status(404).render('404');
});

// Start up the server
app.listen(app.get("port"), () => {
    console.log(
        "  App is running at http://localhost:%d in a %s environment",
        app.get("port"),
        app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
})

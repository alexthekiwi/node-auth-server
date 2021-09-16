import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';

import userRouter from './users/user.router';
import authRouter from './auth/auth.router';
import { authenticated } from './auth/middleware';
import { me } from './users/user.controller';

const app: Express = express();

app.set("port", process.env.PORT || 3000);
app.set("env", process.env.NODE_ENV || 'local');

app.use(express.json());
app.use(cookieParser());

app.use('/users', userRouter);
app.use('/auth', authRouter);
app.get('/me', authenticated, me);

// Default route, maybe make this a docs page?
app.get('/', (req: Request, res: Response) => {
    res.send(`
        <html>
            <body style="display: flex; justify-content: center; align-items: center;">
                <h1 style="font-family: sans-serif;">Start making some requests 😘</h1>
            </body>
        </html>
    `);
})

app.listen(app.get("port"), () => {
    console.log(
        "  App is running at http://localhost:%d in a %s environment",
        app.get("port"),
        app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
})

import express, { Express, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';

import userRouter from './users/user.router';
import authRouter from './auth/auth.router';
import { authenticated } from './auth/middleware';
import { me } from './users/user.controller';

const app: Express = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cookieParser());

app.use('/users', userRouter);
app.use('/auth', authRouter);
app.get('/me', authenticated, me);

app.get('/', (req: Request, res: Response) => {
    const users = prisma.user.findMany({});
    return res.json(users);
})

app.listen(3000, () => {
    console.log('Listening on port 3000');
})

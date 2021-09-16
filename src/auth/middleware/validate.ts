import { Request, Response, NextFunction } from 'express';

import { validateToken, parseRequestTokens } from '../auth.services';
import { prisma } from '../../lib/prisma';

export async function authenticated(req: Request, res: Response, next: NextFunction) {
    const { accessToken } = parseRequestTokens(req);

    if (typeof accessToken === 'string') {
            if (validateToken(accessToken)) {
                req.accessToken = accessToken;
                try {
                    const token = await prisma.token.findUnique({
                        where: { accessToken },
                        include: {
                            user: {
                                select: { id: true, name: true, email: true }
                            }
                        }
                    });

                    if (token) {
                        req.user = token.user;
                        next();
                    } else {
                        res.status(403).send('No user found');
                    }

                } catch(err) {
                    res.status(403).send(err);
                }
            } else {
                return res.status(403).send({ message: 'Token expired'});
            }
    } else {
        return res.status(403).send({ message: 'No token found'});
    }
}

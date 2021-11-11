import { Request, Response } from 'express'
import { Prisma } from '.prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { setAuthCookies } from '../auth/auth.services';

export interface UserDAO {
    id: string;
    name: string;
    email: string;
}

interface UserDTO {
    email: string;
    name: string;
    password?: string;
}

/**
 * Define what fields we return from the database
 */
function getSelectFields() {
    return { id: true, email: true, name: true };
}

/**
 * List all users
 */
export async function index(req: Request, res: Response) {
    const { id, name, email } = req.query;
    const q: { id?: string; name?: string; email?: string; } = {};
    let where;

    if (id) q.id = id.toString();
    if (name) q.name = (name.toString());
    if (email) q.email = (email.toString());

    if (Object.keys(q).length) {
        where = {
            OR: [q]
        }
    }

    const users = await prisma.user.findMany({
        select: getSelectFields(),
        where,
    });

    return res.json(users);
}

/**
 * Show a particular user
 */
export async function show(req: Request, res: Response) {
    const id: string = req.params.id;

    const user = await prisma.user.findUnique({
        select: getSelectFields(),
        where: {
            id,
        }
    });

    if (user) {
        return res.json(user);
    } else {
        return res.status(404).send();
    }
}

/**
 * Get my details
 */
export async function me(req: Request, res: Response) {
    const response = setAuthCookies({res, accessTokenValue: req.accessToken, refreshTokenId: req.refreshToken });

    if (response) {
        return response.send(req.user);
    }

    res.status(500).send();
}

/**
 * Create a new user
 */
export async function store(req: Request, res: Response) {
    const { name, email, password }: UserDTO = req.body;

    if (!name || !email || !password) {
        return res.status(400).send('Invalid arguments. You must provde "name", "email" and "password".');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const data = {
        name, email, password: hashedPassword
    }

    try {
        // Create a user
        const user = await prisma.user.create({ data });

        // Send back the user
        return res.status(201).send({ user });
    } catch(err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(400).send(err.message);
        }
        return res.status(500).send(JSON.stringify(err));
    }
}

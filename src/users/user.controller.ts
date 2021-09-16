import { Request, Response } from 'express'
import { Prisma, PrismaClient } from '.prisma/client';
import bcrypt from 'bcrypt';
import { generateTokens, withCookies } from '../auth/auth.services';

const prisma = new PrismaClient;

export interface UserDAO {
    id: number;
    name: string;
    email: string;
}

interface UserDTO {
    email: string;
    name: string;
    password?: string;
}

function getSelectFields() {
    return { id: true, email: true, name: true };
}

export async function index(req: Request, res: Response) {
    const { id, name, email } = req.query;
    const q: { id?: number; name?: string; email?: string; } = {};
    let where;

    if (id) q.id = parseInt(id.toString());
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

export async function show(req: Request, res: Response) {
    const id: string = req.params.id;

    const user = await prisma.user.findUnique({
        select: getSelectFields(),
        where: {
            id: parseInt(id)
        }
    });

    if (user) {
        return res.json(user);
    } else {
        return res.status(404).send();
    }
}

export async function me(req: Request, res: Response) {
    return res.send(req.user);
}

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

        // Generate tokens for this user so they're instantly logged in
        const token = await generateTokens(user);

        if (token) {
            return withCookies(res, token).send({ user, token })
        } else {
            return res.status(500).send('Error generating auth token');
        }
    } catch(err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            return res.status(400).send(err.message);
        }
        return res.status(500).send('Uh oh, something went wrong.');
    }
}

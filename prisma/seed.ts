import { PrismaClient } from ".prisma/client";
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = process.env.DEFAULT_ADMIN_EMAIL;
    const name = process.env.DEFAULT_ADMIN_NAME || 'Default Admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || '2390jf0@dQWorf0';
    const hashedPassword = await bcrypt.hash(password, 10);

    if (email && name && password) {
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        });
    }

    const clientName = process.env.DEFAULT_CLIENT_NAME;
    const clientCallbackUrl = process.env.DEFAULT_CLIENT_CALLBACK_URL;

    if (clientName && clientCallbackUrl) {
        await prisma.client.create({
            data: {
                name: clientName,
                callbackUrl: clientCallbackUrl
            }
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

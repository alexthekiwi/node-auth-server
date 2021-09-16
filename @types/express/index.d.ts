import { UserDAO } from '../../src/users/user.controller';

declare global {
    namespace Express {
        interface Request {
            user?: UserDAO;
            accessToken?: string
        }
    }
}

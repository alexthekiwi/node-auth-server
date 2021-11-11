import express, { Request, Response, Router } from 'express';

import { index, store, destroy } from './auth.controller';
import { authenticated, guest } from './middleware';

const router: Router = express.Router();

// View routes
router.get('/login', guest, index);
router.get('/dashboard', authenticated, function(req: Request, res: Response) {
    return res.render('dashboard', { user: req.user });
});

// API Routes
router.post('/login', store);
router.post('/logout', authenticated, destroy);
// Other apps can make GET requests to log out and redirect back
router.get('/logout', authenticated, destroy);

export default router;

import express, { Router } from 'express';

import { store, destroy, refresh } from './auth.controller';
import { authenticated } from './middleware';

const router: Router = express.Router();

router.get('/login', store);
router.get('/logout', authenticated, destroy);
router.post('/refresh', refresh);

export default router;

import express, { Router } from 'express';

import { index, store, show, save } from './forgot-password.controller';
import { validateResetToken } from './middleware';

const router: Router = express.Router();

// View routes
router.get('/', index);
router.get('/reset', validateResetToken, show);

// API Routes
router.post('/', store);
router.post('/reset', validateResetToken, save);

export default router;

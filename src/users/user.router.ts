import express from 'express'

import { index, show, store, me } from './user.controller';
import { authenticated } from '../auth/middleware';

const router = express.Router();

router.get('/', authenticated, index);
router.get('/:id', authenticated, show);
router.get('/me', authenticated, me);

// Make the create user route non-authenticated in other environments
if (process.env.APP_ENV === 'production') {
    router.post('/', authenticated, store)
} else {
    router.post('/', store)
}

export default router;

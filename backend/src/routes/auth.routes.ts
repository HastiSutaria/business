import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { loginRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.get('/me', requireAuth, me);

export default router;

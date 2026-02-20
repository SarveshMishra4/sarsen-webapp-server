import { Router } from 'express';
import { validateService } from '../controllers/public.controller';

const router = Router();

/**
 * @route   GET /api/public/validate/:slug
 * @desc    Public endpoint to check if a service exists and is active
 * @access  Public
 */
router.get('/validate/:slug', validateService);

export default router;
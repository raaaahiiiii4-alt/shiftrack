import express from 'express';
import { register, login, refresh, logout, getProfile, getMines, seedMines } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateUserInput } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', validateUserInput, register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.get('/mines', getMines);
router.post('/seed-mines', seedMines);

export default router;
import express from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Маршруты, требующие авторизации
router.use(authMiddleware);

// Маршруты для управления сессиями
router.post('/', SessionController.createSession);
router.get('/active', SessionController.getActiveSession);
router.get('/history', SessionController.getUserSessions);

// Маршруты для управления конкретной сессией
router.post('/:sessionId/participants', SessionController.addParticipant);
router.post('/:sessionId/votes', SessionController.addVote);
router.post('/:sessionId/reveal', SessionController.revealVotes);
router.post('/:sessionId/complete', SessionController.completeSession);
router.post('/:sessionId/emoji', SessionController.addEmoji);
router.get('/:sessionId/stats', SessionController.getSessionStats);

export default router; 
import express from 'express';
import { chat } from '../controllers/chatbot.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/chat', chat);

export default router;

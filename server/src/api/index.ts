import express from 'express';

import MessageResponse from '../interfaces/MessageResponse.js';
import auth from './auth.js';

const router = express.Router();

router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

router.use('/auth', auth);

export default router;

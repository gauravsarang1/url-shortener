import { Router } from 'express';
import { urlController } from '../controllers/url.controller';

const router = Router();

// POST /api/urls - Create a new shortened URL
router.post('/urls', (req, res, next) => {
  urlController.createShortUrl(req, res, next);
});

export default router;

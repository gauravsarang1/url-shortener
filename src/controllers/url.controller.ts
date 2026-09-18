import { Request, Response, NextFunction } from 'express';
import { createUrlSchema } from '../schemas/url.schema';
import { urlService } from '../services/url.service';
import { AppError } from '../middleware/error.middleware';

export class UrlController {
  /**
   * POST /api/urls
   * Validate long URL, generate unique short code, store, and return short URL.
   */
  async createShortUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body with Zod
      const validated = createUrlSchema.parse(req.body);

      const record = await urlService.createShortUrl(validated.url);

      const baseUrl = process.env.BASE_URL
        ? process.env.BASE_URL.replace(/\/+$/, '')
        : `${req.protocol}://${req.get('host')}`;

      const shortUrl = `${baseUrl}/${record.shortCode}`;

      res.status(201).json({ shortUrl });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /:shortCode
   * Lookup short code and redirect 302 to original URL.
   */
  async redirect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shortCode } = req.params;

      if (!shortCode) {
        throw new AppError('Short URL not found', 404);
      }

      const record = await urlService.findByShortCode(shortCode);

      if (!record) {
        res.status(404).json({ message: 'Short URL not found' });
        return;
      }

      // 302 redirect to original URL
      res.redirect(302, record.originalUrl);
    } catch (err) {
      next(err);
    }
  }
}

export const urlController = new UrlController();

import express, { Express } from 'express';
import urlRoutes from './routes/url.routes';
import { urlController } from './controllers/url.controller';
import { requestLogger } from './middleware/request-logger.middleware';

/**
 * Creates and configures the Express application.
 */
export function createApp(): Express {
  const app = express();

  // Log every request, including requests handled by the frontend fallback.
  app.use(requestLogger);

  // Parse JSON bodies
  app.use(express.json());

  // API endpoints
  app.use('/api', urlRoutes);

  // Short URL redirect endpoint: GET /:shortCode
  // Matches alphanumeric short codes (e.g. 6-8 chars)
  app.get('/:shortCode([a-zA-Z0-9]{5,12})', (req, res, next) => {
    urlController.redirect(req, res, next);
  });

  return app;
}

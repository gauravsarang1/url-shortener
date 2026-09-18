import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { cacheUrl, getCachedUrl, invalidateUrlCache } from './redis.service';

interface UrlRecord {
  id: string;
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
}

// In-memory fallback store when PostgreSQL is not configured or reachable
const inMemoryStore = new Map<string, UrlRecord>();

let prismaInstance: PrismaClient | null = null;
let prismaDisabled = false;

function getPrisma(): PrismaClient | null {
  if (prismaDisabled || !process.env.DATABASE_URL) {
    return null;
  }
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

const BASE62_CHARACTERS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a random 6–8 character URL-safe short code.
 */
export function generateShortCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = bytes[i] % BASE62_CHARACTERS.length;
    result += BASE62_CHARACTERS[randomIndex];
  }
  return result;
}

export class UrlService {
  /**
   * Find an existing URL record by its short code.
   */
  async findByShortCode(shortCode: string): Promise<UrlRecord | null> {
    const cachedOriginalUrl = await getCachedUrl(shortCode);
    if (cachedOriginalUrl) {
      console.log(`[CACHE] HIT url:${shortCode}`);
      return {
        id: `cache:${shortCode}`,
        originalUrl: cachedOriginalUrl,
        shortCode,
        createdAt: new Date(),
      };
    }

    console.log(`[CACHE] MISS url:${shortCode}; checking database`);
    const prisma = getPrisma();
    if (prisma) {
      try {
        const record = await prisma.url.findUnique({
          where: { shortCode },
        });
        if (record) {
          await cacheUrl(shortCode, record.originalUrl);
          return record;
        }
      } catch (err) {
        console.warn('PostgreSQL query error, falling back to memory store:', (err as Error).message);
        prismaDisabled = true;
      }
    }

    const record = inMemoryStore.get(shortCode) || null;
    if (record) {
      await cacheUrl(shortCode, record.originalUrl);
    }
    return record;
  }

  /**
   * Create a new short URL mapping with collision detection.
   */
  async createShortUrl(originalUrl: string): Promise<UrlRecord> {
    const maxAttempts = 10;
    let codeLength = 6;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Vary length between 6 and 8 after a couple of attempts
      if (attempt > 3) codeLength = 7;
      if (attempt > 7) codeLength = 8;

      const candidateCode = generateShortCode(codeLength);

      // Check for collision
      const existing = await this.findByShortCode(candidateCode);
      if (existing) {
        continue;
      }

      // Unique code found, persist record
      const prisma = getPrisma();
      if (prisma) {
        try {
          const created = await prisma.url.create({
            data: {
              originalUrl,
              shortCode: candidateCode,
            },
          });
          await invalidateUrlCache(created.shortCode);
          return created;
        } catch (err) {
          console.warn('Prisma create failed, storing in memory:', (err as Error).message);
          prismaDisabled = true;
        }
      }

      const memoryRecord: UrlRecord = {
        id: `c_${crypto.randomUUID()}`,
        originalUrl,
        shortCode: candidateCode,
        createdAt: new Date(),
      };
      inMemoryStore.set(candidateCode, memoryRecord);
      await invalidateUrlCache(candidateCode);
      return memoryRecord;
    }

    throw new Error('Failed to generate a unique short code. Please try again.');
  }
}

export const urlService = new UrlService();

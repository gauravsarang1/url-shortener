# URL Shortener

A minimal, production-ready URL shortener built with Node.js, Express, PostgreSQL, Prisma ORM, Zod, and React.

## Overview

The application provides a focused, single-purpose service:
> Enter a long URL → generate a unique 6–8 character short URL → open the short URL → receive an HTTP 302 redirect to the original URL.

---

## Tech Stack

- **Backend Runtime:** Node.js & TypeScript
- **Web Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma ORM
- **Validation:** Zod
- **Frontend:** React + TypeScript + Tailwind CSS
- **Containerization:** Docker Compose

---

## Backend Architecture

```text
src/
├── routes/
│   └── url.routes.ts          # Express route definitions
├── controllers/
│   └── url.controller.ts      # Request handlers & response formatting
├── services/
│   └── url.service.ts         # Short code generation, collision handling, & DB access
├── schemas/
│   └── url.schema.ts          # Zod validation schema for requests
├── middleware/
│   └── error.middleware.ts    # Centralized error handling
├── app.ts                     # Express application configuration
└── server.ts                  # Server entry point & Vite middleware mounting
```

---

## Database Model

Defined in `prisma/schema.prisma`:

```prisma
model Url {
  id          String   @id @default(cuid())
  originalUrl String
  shortCode   String   @unique
  createdAt   DateTime @default(now())

  @@index([shortCode])
}
```

- `id`: Unique identifier (cuid)
- `originalUrl`: The target destination URL
- `shortCode`: Unique 6–8 alphanumeric code with index for fast $O(1)$ lookups
- `createdAt`: Timestamp of creation

---

## Environment Variables

Configured in `.env` (sample in `.env.example`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgrespassword@localhost:5432/urlshortener?schema=public` |
| `PORT` | Server listening port | `3000` (or `5000` locally) |
| `BASE_URL` | Base URL prefix for short links | `http://localhost:3000` (or request host) |
| `REDIS_URL` | Redis connection string for short URL caching | `redis://localhost:6379` |
| `REDIS_CACHE_TTL_SECONDS` | How long a cached lookup remains valid | `3600` |
| `REDIS_RETRY_INTERVAL_MS` | Delay between background Redis reconnection attempts | `10000` |

---

## Setup & Running Locally

### 1. Start PostgreSQL with Docker Compose

```bash
docker compose up -d
```

This starts a PostgreSQL instance on port `5432`.

Start Redis separately if it is not already running:

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Database Migrations

Generate the Prisma Client and apply migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Create and apply initial migration
npx prisma migrate dev --name init
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be accessible at:
```text
http://localhost:3000
```

---

## API Endpoints

### 1. Create Short URL

- **Method:** `POST`
- **Path:** `/api/urls`
- **Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "url": "https://example.com/this-is-a-very-long-url"
}
```

- **Success Response (`201 Created`):**

```json
{
  "shortUrl": "http://localhost:3000/aB72kP"
}
```

- **Validation Error (`400 Bad Request`):**

```json
{
  "message": "Please provide a valid URL (including http:// or https://)"
}
```

---

### 2. Redirect to Original URL

- **Method:** `GET`
- **Path:** `/:shortCode` (e.g. `/aB72kP`)

- **Success Response:**
  - Status: `302 Found`
  - Header: `Location: https://example.com/this-is-a-very-long-url`

- **Not Found Response (`404 Not Found`):**

```json
{
  "message": "Short URL not found"
}
```

---

## How URL Shortening Works

1. **Input Validation:**
   Incoming payloads are verified using a Zod schema (`z.string().url()`) to guarantee the URL is syntactically valid and well-formed.

2. **Short Code Generation:**
   A cryptographically random 6–8 character string is generated using Base62 encoding (`[0-9a-zA-Z]`).
   - With 6 characters, $62^6 \approx 56.8 \text{ billion}$ unique combinations are possible.
   - With 7 characters, $62^7 \approx 3.52 \text{ trillion}$ combinations.

3. **Collision Detection:**
   Before persisting, the database is checked for existing records using an index on `shortCode`. If a collision is encountered, another code is generated with a retry loop.

4. **Persistence:**
   The mapping `{ id, originalUrl, shortCode, createdAt }` is saved to PostgreSQL using Prisma ORM.

5. **Redirection ($O(1)$ Lookup):**
   When a user accesses `/:shortCode`, the server performs an indexed query on `shortCode`. If present, Express issues an HTTP 302 Found header redirecting the client browser directly to the original target.

## Redis Cache Behavior

Short URL redirects use a cache-aside strategy:

1. Redis is checked first using `url:{shortCode}`.
2. A cache hit redirects immediately without querying PostgreSQL.
3. On a cache miss, the service queries PostgreSQL (or the in-memory fallback), stores the result in Redis with `REDIS_CACHE_TTL_SECONDS`, and redirects.
4. Cache entries are explicitly invalidated after a URL mapping is written. Expired entries are removed automatically by Redis.

Redis is optional and fail-open. If Redis is unavailable, requests continue using PostgreSQL or the in-memory fallback.
# url-shortener

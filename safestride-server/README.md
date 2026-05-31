# SafeStride — Backend Server

Node.js/Express backend for the SafeStride women's safety platform.

## Setup

```bash
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

## Health Check

```
GET http://localhost:5000/health
```

## Project Structure

```
src/
  app.js          — Express app (middleware, routes)
  server.js       — HTTP server entry point
  config/         — DB, Redis, Firebase, Twilio, env validation
  routes/         — Express route definitions
  controllers/    — Request handlers
  services/       — Business logic
  models/         — Mongoose schemas
  middleware/     — Auth, validation, rate limiting, error handling
  sockets/        — Socket.io event handlers
  jobs/           — Bull queue job processors
  utils/          — Pure utility functions
  validators/     — Joi request validation schemas
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Production start |
| `npm test` | Run all tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run lint` | Lint all source files |

## Reference

See `PROJECT_CONTEXT.md` for full architecture, schemas, and API specs.

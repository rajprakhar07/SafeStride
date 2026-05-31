# SafeStride — Client (PWA)

React + TypeScript + Vite Progressive Web App.

## Setup

```bash
cp .env.example .env.local
# Fill in all VITE_ values
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest tests |
| `npm run type-check` | TypeScript type check |
| `npm run lint` | Lint source files |

## Architecture

- **React 18** with TypeScript
- **Zustand** for global state (auth, journey, SOS, UI)
- **React Query** for server state and API caching
- **Leaflet** for maps
- **Socket.io** for real-time location
- **Web Speech API** for voice commands
- **Tailwind CSS v4** for styling
- **Vite PWA** for installability and offline support

## Reference

See `PROJECT_CONTEXT.md` for full architecture decisions.

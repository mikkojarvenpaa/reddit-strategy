# Copilot / AI contributor quick instructions

Purpose: Give AI coding agents the exact, actionable repository knowledge needed to be productive immediately.

Quick start (how dev runs the app)
- Root: run `npm install` then `npm run dev` — this uses `concurrently` to start backend and frontend together.
- Backend dev: `cd backend && npm run dev` (uses `tsx watch src/server.ts`).
- Frontend dev: `cd frontend && npm run dev` (Vite, serves at :3000 by default).

Architecture overview
- Backend (Express + TypeScript): entry `backend/src/server.ts`. Routes live in `backend/src/routes/*` and delegate work to services in `backend/src/services/*` (e.g. `redditService.ts`, `aiService.ts`).
- Frontend (React + Vite): entry `frontend/src/main.tsx`, root component `frontend/src/App.tsx`. Pages: `frontend/src/pages/SearchPage.tsx` and `frontend/src/pages/GeneratorPage.tsx`.
- API contract: frontend calls `/api/*` (see `frontend/src/services/api.ts`). The root dev command runs both servers so `/api` resolves to the backend.

Important patterns & conventions (be precise)
- Service pattern: create a class and export a singleton instance (e.g. `export default new RedditService();`). Keep business logic in `backend/src/services` and leave HTTP handling to `backend/src/routes`.
- Error handling: use `asyncHandler` + `AppError` and the centralized `errorHandler` middleware (`backend/src/middleware/errorHandler.ts`). API error responses follow `{ error: string, statusCode: number }`.
- AI outputs: `backend/src/services/aiService.ts` expects the model response to embed a JSON object and uses a regex to extract it before JSON.parse. When changing output format update the parsing logic — keep responses strictly JSON for reliability.
- Reddit integration: `backend/src/services/redditService.ts` implements client-credentials auth, caches access tokens, and sets a `User-Agent`. Respect rate limits and the token caching behavior.
- TypeScript + ESM: project uses `type: "module"` and strict TS. Backend dev uses `tsx` for fast iteration (`backend/package.json` scripts).

Environment & secrets
- Backend `.env` (copy from `backend/.env.example`) must include:
  - `REDDIT_CLIENT_ID`
  - `REDDIT_CLIENT_SECRET`
  - `OPENAI_API_KEY` (used by `aiService.ts`)
  - optional `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
  - optional `PORT` (defaults to 3001)

Developer workflows & commands (explicit)
- Start both dev servers: `npm run dev` (root).
- Backend only: `npm run dev:backend` (root) or `cd backend && npm run dev`.
- Frontend only: `npm run dev:frontend` (root) or `cd frontend && npm run dev`.
- Build: `npm run build` (root) — builds backend and frontend.
- Lint / type-check: `npm run lint`, `npm run type-check` (available in subpackages).
- Tests: `npm run test` runs vitest in each package.

Where to make changes (practical tips)
- Add a new API route: create a file in `backend/src/routes`, implement route handlers that call a new or existing service, then import the route in `backend/src/server.ts`.
- Add service logic: add to `backend/src/services/*`. Follow the existing pattern: class with methods, export default new Instance().
- Add frontend page: create component under `frontend/src/pages`, add route in `frontend/src/App.tsx`, and call backend through `frontend/src/services/api.ts`.

Integration gotchas to watch for
- AI parsing: `aiService` expects exact JSON in the model text — wrappers or extra commentary break parsing.
- Model name defaults to `gpt-4o-mini` and can be overridden with `OPENAI_MODEL`. Changing it may require prompt/token tweaks (see `aiService.ts`).
- Reddit auth: client-credentials flow is implemented; missing env vars lead to auth failures. Token caching lives in memory (service instance).
- Frontend assumes `/api` base path; during local dev both servers run together. If you run frontend alone, configure a proxy or set absolute backend URL in `frontend/src/services/api.ts`.

Files you should read first
- `backend/src/server.ts` (routing/middleware wiring)
- `backend/src/services/aiService.ts` (prompt construction + response parsing)
- `backend/src/services/redditService.ts` (Reddit API usage, token caching)
- `backend/src/middleware/errorHandler.ts` (error patterns)
- `frontend/src/services/api.ts` (client base path)
- `frontend/src/pages/SearchPage.tsx` and `GeneratorPage.tsx` (how the UI calls the APIs)

If you modify AI prompts or the expected JSON shape
- Update `aiService.ts` parsing logic and add unit tests (vitest) to mock model output and assert parsing behavior.

If anything here is unclear or you want the instructions tuned for a different agent persona (unit tests first, more security focus, or code style enforcements), tell me which emphasis you want and I'll iterate.

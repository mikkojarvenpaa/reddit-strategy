# Repository Guidelines

## Project Structure & Module Organization
The repo is split into `backend/` (Express + TypeScript) and `frontend/` (React + Vite). Server logic sits in `backend/src` under `routes/`, `services/`, `types/`, and `middleware/`; colocate supporting tests beside the code (e.g., `backend/src/services/redditService.test.ts`). React code lives in `frontend/src` with `pages/` for screens, `components/` for reusable UI, `store/` (Zustand) for client state, and `services/api.ts` for HTTP helpers. Work from the repo root so composite npm scripts can wire both apps.

## Build, Test, and Development Commands
- `npm run dev` — launches backend (3001) and frontend (3000) together.
- `npm run dev:backend` / `npm run dev:frontend` — focus on one side while debugging.
- `npm run build` — compiles TypeScript and bundles the React app; run before `npm start` for production parity.
- `npm run lint`, `npm run type-check`, `npm run test` — runs ESLint, strict TS checks, and Vitest suites across both packages; add the `:*` suffix to limit scope.

## Coding Style & Naming Conventions
Use TypeScript with strict mode and ESLint defaults in each package. Prefer 2-space indentation, single quotes, and descriptive named exports for services, middleware, and hooks. React components, Zustand stores, and TypeScript types follow PascalCase (`IdeaCard`, `SearchPage`), while file-scoped helpers and hooks use camelCase. Keep route names and API paths kebab-case (`/api/ai/generate-post-ideas`).

## Testing Guidelines
Vitest powers both backend and frontend tests; author `.test.ts`/`.test.tsx` files next to the modules under test. Mock outbound HTTP (Reddit/OpenAI) so suites run offline, and cover both happy paths and failure branches. There is no enforced coverage gate, but treat 80% statement coverage on new or modified code as the floor, and document intentional gaps in the PR.

## Commit & Pull Request Guidelines
Recent history favors concise, sentence-case subjects such as `post comment generation working nicely`. Keep subjects under 72 characters, default to the imperative mood, and note related issues in the body. PRs should include: a tight summary, test evidence (`npm run test` output and screenshots for UI regressions), configuration changes, reproduction steps, and cross-team reviewers when changes span backend and frontend.

## Security & Configuration Tips
Secrets live in `backend/.env`; start from `.env.example`, never commit populated files, and rotate OpenAI/Reddit credentials if leaked. When sharing logs, redact subreddit queries and generated ideas because they may contain user data. Keep local keys scoped to development and avoid reusing production credentials.

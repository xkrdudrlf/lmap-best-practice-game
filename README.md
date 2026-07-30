# Best Practice Game

An interactive coding puzzle game that teaches the LMAP coding standards — one rule at a time.

Each puzzle presents code that violates a specific best practice from the standards `rules/` and `examples/`. Fix the code, pass the checker, and move on. If you fail, you get a detailed explanation of **why the correct approach is correct** and **why the violation is wrong**, plus a similar retry problem for the same rule.

## Categories

| Category | Rules covered |
|----------|---------------|
| General Principles | Readability, edge cases, dead code, N+1 batching |
| Software Design | DRY, SRP, YAGNI, separation of concerns |
| PHP | DI, prepared statements, password hashing, input validation, DateTimeImmutable |
| JavaScript | const/let, for...of, pure getters, strict equality, textContent |
| Security | Secrets in repo, custom crypto, error disclosure |

**22 puzzles** across 5 categories, each with 1–2 variant scenarios for retry practice.

## Run locally

**Prerequisites:** [Node.js](https://nodejs.org/) 18 or newer.

From the project root:

```bash
npm install   # first time only (or after dependencies change)
npm run dev
```

- `npm install` downloads dependencies into `node_modules` (not committed to git).
- `npm run dev` starts the Vite dev server.

Open the URL shown in the terminal (usually `http://localhost:5173`).

## How it works

1. Pick a category from the home screen.
2. Open a puzzle — the sidebar shows the rule, why it matters, and the task.
3. Edit the code in the Monaco editor and click **Check solution**.
4. **Pass:** progress is saved in `localStorage`.
5. **Fail:** read the explanation, then click **Try a similar problem** for another scenario targeting the same rule.

## Source of truth

Rule text and explanations are derived from:

- `lmap-cursor-plugin/cursor-plugin/rules/*.mdc`
- `lmap-cursor-plugin/cursor-plugin/examples/*`

## Build

```bash
npm run build
npm run preview
```

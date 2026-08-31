# Design Desk

A reusable, self-hosted website review workbench. Reviewers can open a website preview at desktop, tablet, and mobile sizes, select an element or area, leave contextual comments, reply in threads, and resolve or archive feedback.

This public repository contains only the generic workbench, a synthetic sample site, and empty sample state. Client brands, websites, review data, access codes, deployment topology, and project-specific skills belong in private client repositories.

## Local setup

Requirements: Node.js 22+.

```bash
npm install
npm run build
cp .env.example .env
```

Replace every placeholder in `.env`, then export the values through your process manager and run:

```bash
npm start
```

The server intentionally refuses to start without `DESIGN_DESK_REVIEW_CODE`.

## Configuration

- `DESIGN_DESK_REVIEW_CODE`: required reviewer access code.
- `DESIGN_DESK_SESSION_SECRET`: recommended independent session-signing secret.
- `DESIGN_DESK_DATA_FILE`: writable runtime state file. Do not point deployments at the committed sample seed.
- `DESIGN_DESK_DEMO_DIR` or `DESIGN_DESK_DEMO_URL`: local or external website preview.
- `DESIGN_DESK_SITE_URL`: address displayed in the workbench browser bar.

## Quality gates

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

See [SECURITY.md](SECURITY.md) for deployment boundaries.

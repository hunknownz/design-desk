# Design Desk repository

- Keep this repository client-agnostic. Do not commit client brands, assets, annotations, decision records, deployment topology, access codes, or credentials.
- The workbench and the reviewed website communicate through the documented Review Bridge message protocol.
- Keep runtime state outside the source seed. Use `DESIGN_DESK_DATA_FILE` for each client instance.
- A review access code is mandatory. Never add a default or example value that can authenticate a deployed instance.
- Run `npm run check`, `npm test`, `npm run build`, and the relevant Playwright tests before release.

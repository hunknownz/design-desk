# Security policy

Design Desk is a review tool, not a public content site.

- Put the service behind HTTPS and an identity-aware access layer when exposed to the internet.
- Always supply a long random `DESIGN_DESK_REVIEW_CODE` and an independent `DESIGN_DESK_SESSION_SECRET` through environment variables.
- Store runtime state outside the repository and back it up with restricted filesystem permissions.
- Treat reviewed pages, screenshots, annotations, reviewer names, and activity history as customer-confidential data.
- Do not publish tunnels, hostnames, process-manager files, machine paths, or production environment files in this repository.

Report vulnerabilities privately to the repository owner rather than opening a public issue with exploit details.

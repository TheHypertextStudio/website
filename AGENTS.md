# Agent guidelines

## Commit scopes

Use `app` for product behavior and `dx` for development tooling. Omit the scope
for repository-wide maintenance that spans these areas.

## Worktree preparation

Run `./bootstrap worktree prepare` for a fresh worktree. Keep native shared
caches intact and keep `node_modules`, `.build`, DerivedData, and application
state local to the checkout. Use existing build and test commands after setup.
Do not replace the shared engine with another dependency installer or setup
framework.

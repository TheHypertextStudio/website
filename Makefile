# =============================================================================
# Hypertext Studio — canonical task surface
#
# Every key task runs through `make`. Run `make help` for the categorised list.
# Targets group into: setup, dev, quality, audits, content, and explicit deploy.
# =============================================================================

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

# Detect pnpm via corepack; fall back to system pnpm.
PNPM := $(shell command -v pnpm 2>/dev/null || echo "corepack pnpm")

# ----------------------------------------------------------------------------
# help
# ----------------------------------------------------------------------------

##@ Setup
##@ Day-to-day
##@ Quality
##@ Audits
##@ Content
##@ Deploy

.PHONY: help
help: ## show this help (the default)
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m\n\n"} \
	  /^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } \
	  /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------

.PHONY: bootstrap setup doctor install

bootstrap: ## one-shot setup: prereqs, deps, env, optional cloud + github
	@bash scripts/bootstrap.sh

setup: bootstrap ## alias for bootstrap

doctor: ## non-mutating health check (versions, files, deps)
	@bash scripts/doctor.sh

install: ## install or refresh pnpm dependencies
	@$(PNPM) install

# ----------------------------------------------------------------------------
# Day-to-day development
# ----------------------------------------------------------------------------

.PHONY: dev dev-workers dev-all build preview clean nuke

dev: ## start the site only via Portless (https://hypertext.localhost)
	@$(PNPM) run dev

dev-astro: ## raw astro dev (no Portless) on http://localhost:4321
	@$(PNPM) run dev:astro

dev-all: ## site + all five workers via Portless (subdomains on .localhost)
	@bash scripts/dev.sh

build: ## production build (generated metadata + Astro)
	@$(PNPM) run build

preview: build ## preview the production build locally
	@$(PNPM) run preview

clean: ## remove build artefacts
	@rm -rf dist .astro .wrangler test-results playwright-report coverage

nuke: clean ## clean + remove node_modules
	@rm -rf node_modules

# ----------------------------------------------------------------------------
# Quality gates
# ----------------------------------------------------------------------------

.PHONY: lint lint-fix format format-check typecheck typecheck-workers test test-workers test-artifact test-e2e test-a11y quality ci

lint: ## prettier --check + eslint
	@$(PNPM) run format:check
	@$(PNPM) run lint

lint-fix: ## auto-fix prettier + eslint
	@$(PNPM) run format
	@$(PNPM) run lint:fix

format: ## prettier --write
	@$(PNPM) run format

format-check: ## prettier --check
	@$(PNPM) run format:check

typecheck: ## astro check + tsc --noEmit
	@$(PNPM) run typecheck

typecheck-workers: ## generate binding types + typecheck all Workers
	@$(PNPM) run typecheck:workers

test: ## vitest unit tests
	@$(PNPM) run test

test-workers: ## Vitest inside workerd for all five Workers
	@$(PNPM) run test:workers

test-artifact: ## Playwright checks against the exact built dist directory
	@$(PNPM) run test:artifact

test-e2e: ## Playwright browser, responsive, and accessibility checks
	@$(PNPM) exec playwright test --project=chromium

test-e2e-all: ## playwright e2e across chromium + firefox + webkit
	@$(PNPM) exec playwright test

test-e2e-ui: ## interactive Playwright UI mode
	@$(PNPM) exec playwright test --ui

test-a11y: ## axe-playwright accessibility pass (filtered by @a11y tag)
	@$(PNPM) exec playwright test --project=chromium --grep @a11y

test-install: ## install Playwright browsers (run once after bootstrap)
	@$(PNPM) exec playwright install --with-deps

screenshots: ## capture every page state into .hypertext/screenshots/
	@node scripts/screenshots.mjs

quality: format-check lint typecheck typecheck-workers test test-workers ## local quality gate

ci: quality build test-artifact ## portable repository CI contract

# ----------------------------------------------------------------------------
# Audits (built site)
# ----------------------------------------------------------------------------

.PHONY: audit audit-lh audit-axe audit-html audit-schema embeds verify-rels

audit: audit-lh audit-axe audit-html audit-schema ## run every automated audit

audit-lh: ## lighthouse-ci against dist/ (target 100/100/100/100)
	@bash scripts/audit.sh lighthouse

audit-axe: ## axe-playwright zero-violations gate
	@bash scripts/audit.sh axe

audit-html: ## W3C html-validator on every built page
	@bash scripts/audit.sh html

audit-schema: ## schema.org validator on JSON-LD blocks
	@bash scripts/audit.sh schema

embeds: ## print embed validator URLs (Open Graph, LinkedIn, Schema.org)
	@bash scripts/embeds.sh

verify-rels: ## confirm rel=me reciprocity for configured identities
	@bash scripts/verify-rels.sh

# ----------------------------------------------------------------------------
# Content operations
# ----------------------------------------------------------------------------

.PHONY: new-study icons og

new-study: ## scaffold a new MDX study: make new-study TITLE="..."
	@bash scripts/new-study.sh "$(TITLE)"

icons: ## regenerate § favicon set
	@bash scripts/icons.sh

og: ## regenerate templated OG images
	@bash scripts/og.sh

# ----------------------------------------------------------------------------
# Deploy
# ----------------------------------------------------------------------------

.PHONY: deploy-preview deploy-break-glass

deploy-preview: ## explicitly deploy a Pages preview
	@bash scripts/deploy.sh preview

deploy-break-glass: ## manual production recovery; normal releases use GitHub Actions
	@bash scripts/deploy.sh break-glass

# ----------------------------------------------------------------------------
# Convenience
# ----------------------------------------------------------------------------

.PHONY: print-vars

print-vars: ## debug: show resolved make variables
	@echo "PNPM=$(PNPM)"
	@echo "MAKEFILE_LIST=$(MAKEFILE_LIST)"
	@echo "SHELL=$(SHELL)"

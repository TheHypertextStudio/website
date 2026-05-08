# =============================================================================
# Hypertext Studio — canonical task surface
#
# Every key task runs through `make`. Run `make help` for the categorised list.
# Targets group into: setup, dev, quality, audits, content ops, deploy, release.
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
##@ Release

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

dev-all: ## site + all four workers via Portless (subdomains on .localhost)
	@bash scripts/dev.sh

build: ## production build (astro + content-id stamp + word count)
	@bash scripts/build.sh

preview: build ## preview the production build locally
	@$(PNPM) run preview

clean: ## remove build artefacts
	@rm -rf dist .astro .wrangler test-results playwright-report coverage

nuke: clean ## clean + remove node_modules
	@rm -rf node_modules

# ----------------------------------------------------------------------------
# Quality gates
# ----------------------------------------------------------------------------

.PHONY: lint lint-fix format format-check typecheck test test-e2e test-a11y quality

lint: ## prettier --check + eslint + astro check
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

test: ## vitest unit tests
	@$(PNPM) run test

test-e2e: ## playwright e2e (palette, dialogs, status bar, print, …)
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

quality: format-check lint typecheck test ## full quality gate (CI default)

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

embeds: ## print embed validator URLs (FB, X, LinkedIn, Discord, Slack)
	@bash scripts/embeds.sh

verify-rels: ## confirm rel=me reciprocity (GitHub, Bluesky, fediverse)
	@bash scripts/verify-rels.sh

# ----------------------------------------------------------------------------
# Content operations
# ----------------------------------------------------------------------------

.PHONY: new-study icons og words content-id

new-study: ## scaffold a new MDX study: make new-study TITLE="..."
	@bash scripts/new-study.sh "$(TITLE)"

icons: ## regenerate § favicon set
	@bash scripts/icons.sh

og: ## regenerate templated OG images
	@bash scripts/og.sh

words: ## recompute total word count for status panel
	@bash scripts/words.sh

content-id: ## stamp BUILD_HASH and BUILD_TIME for the footer
	@bash scripts/content-id.sh

# ----------------------------------------------------------------------------
# Deploy
# ----------------------------------------------------------------------------

.PHONY: deploy deploy-prod deploy-workers

deploy: build ## preview deployment to Cloudflare Pages
	@bash scripts/deploy.sh preview

deploy-prod: build ## production deployment (Pages + workers)
	@bash scripts/deploy.sh prod

deploy-workers: ## wrangler deploy all four workers (without site)
	@bash scripts/deploy.sh workers

# ----------------------------------------------------------------------------
# Release
# ----------------------------------------------------------------------------

.PHONY: release

release: quality build ## version bump + changelog + tag + push
	@bash scripts/release.sh

# ----------------------------------------------------------------------------
# Convenience
# ----------------------------------------------------------------------------

.PHONY: print-vars

print-vars: ## debug: show resolved make variables
	@echo "PNPM=$(PNPM)"
	@echo "MAKEFILE_LIST=$(MAKEFILE_LIST)"
	@echo "SHELL=$(SHELL)"

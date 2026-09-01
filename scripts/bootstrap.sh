#!/usr/bin/env bash
# =============================================================================
# Hypertext Studio — bootstrap
#
# One command to take a fresh checkout from zero to a working dev environment.
# Idempotent: every section detects its own completion. Re-run as often as you
# like.
#
# Sections:
#   1. Prereqs         — Node, corepack, pnpm, optional CLIs (gh, wrangler)
#   2. Dependencies    — pnpm install, plus Chromium for make test-artifact
#   3. Env             — copy .env.example → .env
#   4. Git hooks       — wire .githooks/ as core.hooksPath
#   5. Cloudflare      — account, D1, Pages, domains, schema, Worker secrets
#   6. GitHub          — repository + Actions secrets   (skip with --skip-github)
#   7. Smoke           — typecheck + build to confirm everything wired up
#
# Flags:
#   --skip-cloud       skip Cloudflare auth and resource creation
#   --skip-github      skip GitHub repo + secrets setup
#   --non-interactive  fail rather than prompt; for CI / unattended runs
#   --doctor           run only the prereq checks (no mutation)
#   --verbose          print every command before running
#   -h, --help         show this message
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly REPO_ROOT
cd "$REPO_ROOT"

readonly CLOUDFLARE_PROFILE="${CLOUDFLARE_PROFILE:-hypertext-studio}"
readonly CLOUDFLARE_ACCOUNT_NAME="${CLOUDFLARE_ACCOUNT_NAME:-Hypertext Studio}"
CLOUDFLARE_PAGES_PROJECT="${CLOUDFLARE_PAGES_PROJECT:-}"
CLOUDFLARE_D1_DATABASE="${CLOUDFLARE_D1_DATABASE:-}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-${GITHUB_REPO:-}}"
SITE_URL="${SITE_URL:-}"
declare -a PAGES_DOMAINS=()

CF_ACCOUNT_ID=""

# shellcheck source=scripts/lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------

SKIP_CLOUD=0
SKIP_GITHUB=0
NON_INTERACTIVE=0
DOCTOR_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-cloud) SKIP_CLOUD=1 ;;
    --skip-github) SKIP_GITHUB=1 ;;
    --non-interactive) NON_INTERACTIVE=1 ;;
    --doctor) DOCTOR_ONLY=1 ;;
    --verbose) set -x ;;
    -h|--help)
      sed -n '2,/^# ===/p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      log::err "unknown flag: $1"
      exit 64
      ;;
  esac
  shift
done

readonly SKIP_CLOUD SKIP_GITHUB NON_INTERACTIVE DOCTOR_ONLY

# Tracks summary lines for the final report.
declare -a SUMMARY=()
record() { SUMMARY+=("$1"); }

ask() {
  # ask "Prompt" "default-or-empty"
  local prompt="$1" default="${2:-}" reply
  if (( NON_INTERACTIVE )); then
    if [[ -n "$default" ]]; then
      printf '%s\n' "$default"
    else
      log::err "$prompt — no default and --non-interactive set"
      exit 70
    fi
    return
  fi
  if [[ -n "$default" ]]; then
    read -r -p "  $prompt [$default]: " reply
    printf '%s\n' "${reply:-$default}"
  else
    read -r -p "  $prompt: " reply
    printf '%s\n' "$reply"
  fi
}

json_has_name() {
  local wanted="$1"
  node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const rows = JSON.parse(input || "[]");
      const wanted = process.argv[1];
      const found = rows.some((row) =>
        [row.name, row["Project Name"]].includes(wanted),
      );
      process.exit(found ? 0 : 1);
    });
  ' "$wanted"
}

json_d1_id() {
  local wanted="$1"
  node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const rows = JSON.parse(input || "[]");
      const row = rows.find((candidate) => candidate.name === process.argv[1]);
      if (row?.uuid) process.stdout.write(row.uuid);
    });
  ' "$wanted"
}

json_account_id() {
  local configured_id="$1" preferred_name="$2"
  node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const payload = JSON.parse(input || "{}");
      const accounts = payload.accounts || [];
      const configured = process.argv[1];
      const preferred = process.argv[2];
      const selected =
        accounts.find((account) => account.id === configured) ||
        accounts.find((account) => account.name === preferred) ||
        (accounts.length === 1 ? accounts[0] : undefined);
      if (selected?.id) process.stdout.write(selected.id);
    });
  ' "$configured_id" "$preferred_name"
}

write_wrangler_ids() {
  local account_id="$1" database_id="$2"
  # The JavaScript template literals and regex are intentionally single-quoted shell input.
  # shellcheck disable=SC2016
  node -e '
    const fs = require("node:fs");
    const path = process.argv[1];
    const accountId = process.argv[2];
    const databaseName = process.argv[3];
    const databaseId = process.argv[4];
    let config = fs.readFileSync(path, "utf8");

    if (/^account_id\s*=/m.test(config)) {
      config = config.replace(/^account_id\s*=.*$/m, `account_id = "${accountId}"`);
    } else {
      config = config.replace(/^(name\s*=.*)$/m, `$1\naccount_id = "${accountId}"`);
    }

    const escapedName = databaseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const binding = new RegExp(
      `(database_name\\s*=\\s*"${escapedName}"\\s*\\n\\s*database_id\\s*=\\s*)"[^"]*"`,
      "g",
    );
    config = config.replace(binding, `$1"${databaseId}"`);
    fs.writeFileSync(path, config);
  ' "$REPO_ROOT/wrangler.toml" "$account_id" "$CLOUDFLARE_D1_DATABASE" "$database_id"
}

missing_secret() {
  local json="$1" name="$2"
  ! printf '%s' "$json" | json_has_name "$name"
}

project_config_value() {
  local key="$1" override="$2" origin_url="$3"
  node -e '
    const fs = require("node:fs");

    const [key, override, originUrl] = process.argv.slice(1);
    const read = (path) => {
      try { return fs.readFileSync(path, "utf8"); } catch { return ""; }
    };
    const envValues = (path) => Object.fromEntries(
      read(path)
        .split(/\r?\n/)
        .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator), line.slice(separator + 1).trim()];
        }),
    );
    const localEnv = envValues(".env");
    const exampleEnv = envValues(".env.example");
    const env = (name) => localEnv[name] || exampleEnv[name] || "";
    const wrangler = read("wrangler.toml");
    const packageJson = JSON.parse(read("package.json") || "{}");
    const match = (pattern) => wrangler.match(pattern)?.[1] || "";
    const repositoryUrl = typeof packageJson.repository === "string"
      ? packageJson.repository
      : packageJson.repository?.url || "";
    const githubRepository = (url) => {
      const normalized = url.trim().replace(/\.git$/, "");
      const matched = normalized.match(
        /(?:github\.com[/:])([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/,
      );
      return matched?.[1] || "";
    };

    const values = {
      pages:
        override ||
        env("CLOUDFLARE_PAGES_PROJECT") ||
        match(/^name\s*=\s*"([^"]+)"/m),
      d1:
        override ||
        match(/^database_name\s*=\s*"([^"]+)"/m),
      repository:
        override ||
        githubRepository(originUrl) ||
        env("GITHUB_REPO") ||
        githubRepository(repositoryUrl) ||
        match(/^GITHUB_REPO\s*=\s*"([^"]+)"/m),
      site:
        override ||
        env("SITE_URL") ||
        env("PUBLIC_SITE_URL") ||
        packageJson.homepage ||
        match(/^SITE_URL\s*=\s*"([^"]+)"/m),
    };
    const value = values[key] || "";
    if (value) process.stdout.write(value);
  ' "$key" "$override" "$origin_url"
}

load_project_config() {
  local origin_url site_hostname apex_domain
  origin_url="$(git config --get remote.origin.url 2>/dev/null || true)"

  CLOUDFLARE_PAGES_PROJECT="$(project_config_value pages "$CLOUDFLARE_PAGES_PROJECT" "$origin_url")"
  CLOUDFLARE_D1_DATABASE="$(project_config_value d1 "$CLOUDFLARE_D1_DATABASE" "$origin_url")"
  GITHUB_REPOSITORY="$(project_config_value repository "$GITHUB_REPOSITORY" "$origin_url")"
  SITE_URL="$(project_config_value site "$SITE_URL" "$origin_url")"

  if [[ -z "$CLOUDFLARE_PAGES_PROJECT" || -z "$CLOUDFLARE_D1_DATABASE" || -z "$GITHUB_REPOSITORY" || -z "$SITE_URL" ]]; then
    log::err "could not resolve Pages project, D1 database, GitHub repository, and site URL from project configuration"
    exit 78
  fi
  if [[ ! "$GITHUB_REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    log::err "invalid GitHub repository: $GITHUB_REPOSITORY"
    exit 78
  fi

  site_hostname="$(node -e '
    try {
      const url = new URL(process.argv[1]);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
        process.exit(1);
      }
      process.stdout.write(url.hostname);
    } catch {
      process.exit(1);
    }
  ' "$SITE_URL")" || {
    log::err "invalid SITE_URL: $SITE_URL"
    exit 78
  }
  apex_domain="${site_hostname#www.}"
  PAGES_DOMAINS=("$apex_domain" "www.$apex_domain")

  readonly CLOUDFLARE_PAGES_PROJECT CLOUDFLARE_D1_DATABASE GITHUB_REPOSITORY SITE_URL
  readonly -a PAGES_DOMAINS
}

# ---------------------------------------------------------------------------
# 1. Prereqs
# ---------------------------------------------------------------------------

check_prereqs() {
  log::title "1. Prerequisites"

  local os
  case "$(uname -s)" in
    Darwin) os=macos ;;
    Linux)  os=linux ;;
    *)
      log::err "unsupported OS: $(uname -s)"; exit 78 ;;
  esac
  log::ok "OS detected: $os"
  record "OS:                 $os"

  # git
  if command -v git >/dev/null 2>&1; then
    log::ok "git $(git --version | awk '{print $3}')"
  else
    log::err "git is not installed"
    [[ $os == macos ]] && log::info "→ run: xcode-select --install"
    exit 1
  fi

  # Node 24+
  if ! command -v node >/dev/null 2>&1; then
    log::err "Node.js is not installed"
    log::info "→ install fnm: brew install fnm   then: fnm install 24"
    exit 1
  fi
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if (( node_major < 24 )); then
    log::err "Node $node_major detected; this project requires Node ≥ 24"
    log::info "→ fnm install 24 && fnm use 24"
    exit 1
  fi
  log::ok "node $(node -v)"
  record "node:               $(node -v)"

  # corepack + pnpm
  if ! command -v corepack >/dev/null 2>&1; then
    log::err "corepack is not on PATH (it ships with Node 16+)"
    exit 1
  fi
  if ! corepack enable >/dev/null 2>&1; then
    log::warn "corepack enable failed (may need sudo for global install)"
  fi
  log::ok "corepack $(corepack -v)"

  # Activate the exact pnpm pinned in package.json (corepack reads packageManager).
  if ! pnpm --version >/dev/null 2>&1; then
    log::err "pnpm not available after corepack enable"
    exit 1
  fi
  log::ok "pnpm $(pnpm --version)"
  record "pnpm:               $(pnpm --version)"

  # Optional CLIs — soft-fail; print install hints.
  if command -v wrangler >/dev/null 2>&1; then
    log::ok "global Wrangler available (bootstrap uses the repository-pinned version)"
    record "wrangler:           repository-pinned via pnpm"
  else
    log::ok "Wrangler will run from the repository dependency"
    record "wrangler:           repository-pinned via pnpm"
  fi
  if command -v gh >/dev/null 2>&1; then
    log::ok "gh $(gh --version | head -n1 | awk '{print $3}')"
  else
    log::skip "gh CLI not installed (optional; install: brew install gh)"
  fi
  if command -v jq >/dev/null 2>&1; then
    log::ok "jq $(jq --version)"
  else
    log::skip "jq not installed (optional; install: brew install jq)"
  fi
}

# ---------------------------------------------------------------------------
# 2. Dependencies
# ---------------------------------------------------------------------------

install_deps() {
  log::title "2. Dependencies"
  if [[ -d node_modules && -f pnpm-lock.yaml ]]; then
    log::info "node_modules present; running pnpm install (no-op if up to date)"
  else
    log::info "running pnpm install"
  fi
  pnpm install
  log::ok "dependencies installed"
  record "deps:               $(jq -r '. | (.dependencies // {} | length) + (.devDependencies // {} | length)' package.json 2>/dev/null || echo "n/a") packages"
  install_browser
}

# Chromium only backs `make ci` / `make test-artifact`. On Linux --with-deps
# shells out to sudo apt-get, which is unavailable in rootless containers, so
# fall back to the browser-only install and warn instead of aborting bootstrap.
install_browser() {
  if [[ "$(uname -s)" == "Linux" ]] && pnpm exec playwright install --with-deps chromium ||
    pnpm exec playwright install chromium; then
    log::ok "Chromium installed for local validation"
    record "browser:            Chromium installed"
    return 0
  fi
  log::warn "Chromium not installed; 'make test-artifact' will fail until you run:"
  log::warn "  pnpm exec playwright install --with-deps chromium"
  record "browser:            not installed (make test-artifact unavailable)"
}

# ---------------------------------------------------------------------------
# 3. Env
# ---------------------------------------------------------------------------

setup_env() {
  log::title "3. Environment"
  if [[ -f .env ]]; then
    log::ok ".env present"
  else
    cp .env.example .env
    log::ok ".env created from .env.example"
    log::info "edit .env to fill in values; secrets stay out of git."
  fi
  record "env file:           .env present"
}

# ---------------------------------------------------------------------------
# 4. Git hooks
# ---------------------------------------------------------------------------

install_hooks() {
  log::title "4. Git hooks"
  if [[ ! -d .githooks ]]; then
    log::skip ".githooks/ directory missing — skipping (run again after Phase A)"
    return
  fi
  chmod +x .githooks/* 2>/dev/null || true
  local current
  current="$(git config --get core.hooksPath 2>/dev/null || true)"
  if [[ "$current" == ".githooks" ]]; then
    log::ok "core.hooksPath already set to .githooks"
  else
    git config core.hooksPath .githooks
    log::ok "core.hooksPath set to .githooks"
  fi
  record "git hooks:          .githooks/ wired"
}

# ---------------------------------------------------------------------------
# 5. Cloudflare
# ---------------------------------------------------------------------------

setup_cloudflare() {
  log::title "5. Cloudflare"
  if (( SKIP_CLOUD )); then
    log::skip "skipped (--skip-cloud)"
    record "cloudflare:         skipped"
    return
  fi

  local wrangler_cmd="pnpm exec wrangler"

  if ! $wrangler_cmd auth activate "$CLOUDFLARE_PROFILE" "$REPO_ROOT" >/dev/null 2>&1; then
    log::info "creating Wrangler auth profile '$CLOUDFLARE_PROFILE' (a browser window will open)"
    if (( NON_INTERACTIVE )); then
      log::err "Wrangler profile '$CLOUDFLARE_PROFILE' is missing and --non-interactive is set"
      exit 70
    fi
    $wrangler_cmd auth create "$CLOUDFLARE_PROFILE"
    $wrangler_cmd auth activate "$CLOUDFLARE_PROFILE" "$REPO_ROOT"
  fi

  local who_json configured_account_id
  who_json="$($wrangler_cmd whoami --json)"
  configured_account_id="$(awk -F'"' '/^account_id[[:space:]]*=/ {print $2; exit}' wrangler.toml 2>/dev/null || true)"
  CF_ACCOUNT_ID="$(printf '%s' "$who_json" | json_account_id "$configured_account_id" "$CLOUDFLARE_ACCOUNT_NAME")"
  if [[ -z "$CF_ACCOUNT_ID" ]]; then
    log::err "could not select '$CLOUDFLARE_ACCOUNT_NAME' from the authenticated Wrangler accounts"
    exit 70
  fi
  log::ok "Wrangler authenticated for $CLOUDFLARE_ACCOUNT_NAME ($CF_ACCOUNT_ID)"
  record "cloudflare account: $CF_ACCOUNT_ID"

  if [[ ! -f wrangler.toml ]]; then
    log::err "wrangler.toml is required for Cloudflare provisioning"
    exit 66
  fi

  local d1_json d1_id
  d1_json="$($wrangler_cmd d1 list --json --profile "$CLOUDFLARE_PROFILE")"
  d1_id="$(printf '%s' "$d1_json" | json_d1_id "$CLOUDFLARE_D1_DATABASE")"
  if [[ -z "$d1_id" ]]; then
    log::info "creating D1 database '$CLOUDFLARE_D1_DATABASE'"
    $wrangler_cmd d1 create "$CLOUDFLARE_D1_DATABASE" --profile "$CLOUDFLARE_PROFILE"
    d1_json="$($wrangler_cmd d1 list --json --profile "$CLOUDFLARE_PROFILE")"
    d1_id="$(printf '%s' "$d1_json" | json_d1_id "$CLOUDFLARE_D1_DATABASE")"
  fi
  if [[ -z "$d1_id" ]]; then
    log::err "D1 '$CLOUDFLARE_D1_DATABASE' exists but its UUID could not be discovered"
    exit 70
  fi
  write_wrangler_ids "$CF_ACCOUNT_ID" "$d1_id"
  log::ok "D1 '$CLOUDFLARE_D1_DATABASE' configured ($d1_id)"

  bash "$REPO_ROOT/scripts/migrate-d1.sh" \
    remote "$CLOUDFLARE_D1_DATABASE" --profile "$CLOUDFLARE_PROFILE"
  log::ok "D1 migrations applied"

  local pages_json
  pages_json="$($wrangler_cmd pages project list --json --profile "$CLOUDFLARE_PROFILE")"
  if ! printf '%s' "$pages_json" | json_has_name "$CLOUDFLARE_PAGES_PROJECT"; then
    $wrangler_cmd pages project create "$CLOUDFLARE_PAGES_PROJECT" \
      --production-branch main --profile "$CLOUDFLARE_PROFILE"
    log::ok "Pages project '$CLOUDFLARE_PAGES_PROJECT' created"
  else
    log::ok "Pages project '$CLOUDFLARE_PAGES_PROJECT' present"
  fi

  setup_pages_domains "$wrangler_cmd"
  setup_micropub_secret "$wrangler_cmd"
}

setup_pages_domains() (
  local wrangler_cmd="$1" token_json oauth_token curl_config domains_json domain payload
  # This subshell handles a live OAuth bearer. Never expand its commands into
  # verbose xtrace output; the parent shell resumes tracing after it returns.
  set +x
  if ! command -v curl >/dev/null 2>&1; then
    log::warn "curl is unavailable; skipping Pages custom domains"
    return
  fi

  token_json="$($wrangler_cmd auth token --json --profile "$CLOUDFLARE_PROFILE")"
  oauth_token="$(printf '%s' "$token_json" | node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (input += chunk));
    process.stdin.on("end", () => {
      const payload = JSON.parse(input || "{}");
      if (payload.token) process.stdout.write(payload.token);
    });
  ')"
  if [[ -z "$oauth_token" ]]; then
    log::err "Wrangler did not return an OAuth token for Pages domain setup"
    exit 70
  fi
  curl_config="$(mktemp "${TMPDIR:-/tmp}/hypertext-curl.XXXXXX")"
  chmod 600 "$curl_config"
  trap 'rm -f "$curl_config"' EXIT
  printf 'header = "Authorization: Bearer %s"\nheader = "Content-Type: application/json"\n' \
    "$oauth_token" > "$curl_config"

  domains_json="$(curl --silent --show-error --fail-with-body --config "$curl_config" \
    "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/$CLOUDFLARE_PAGES_PROJECT/domains")"
  for domain in "${PAGES_DOMAINS[@]}"; do
    if printf '%s' "$domains_json" | node -e '
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (input += chunk));
      process.stdin.on("end", () => {
        const payload = JSON.parse(input || "{}");
        process.exit((payload.result || []).some((row) => row.name === process.argv[1]) ? 0 : 1);
      });
    ' "$domain"; then
      log::ok "Pages domain '$domain' present"
      continue
    fi
    payload="$(printf '{"name":"%s"}' "$domain")"
    if curl --silent --show-error --fail-with-body --config "$curl_config" \
      --request POST --data "$payload" \
      "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/pages/projects/$CLOUDFLARE_PAGES_PROJECT/domains" \
      >/dev/null; then
      log::ok "Pages domain '$domain' added"
    else
      log::warn "Pages domain '$domain' could not be added; inspect its existing DNS binding"
    fi
  done

  oauth_token=""
)

setup_micropub_secret() {
  local wrangler_cmd="$1" secrets_json github_owner github_repo_name
  secrets_json="$($wrangler_cmd secret list --env micropub --format json --profile "$CLOUDFLARE_PROFILE")"
  if ! missing_secret "$secrets_json" GITHUB_TOKEN; then
    log::ok "Micropub GITHUB_TOKEN present"
    return
  fi
  if (( NON_INTERACTIVE )); then
    log::err "Micropub GITHUB_TOKEN is missing and --non-interactive is set"
    exit 70
  fi
  github_owner="${GITHUB_REPOSITORY%%/*}"
  github_repo_name="${GITHUB_REPOSITORY#*/}"
  cat <<EOF

  Create the Micropub publishing token before continuing:
    1. Open: https://github.com/settings/personal-access-tokens/new
    2. Token name: Hypertext Studio Micropub
    3. Resource owner: $github_owner
    4. Repository access: Only select repositories → $github_repo_name
    5. Repository permissions → Contents: Read and write
       No other repository or organization permissions are required.
    6. Generate token, then paste it at the masked prompt below.

  Wrangler stores it as the micropub Worker secret GITHUB_TOKEN.
  The value is sent directly to Cloudflare and is never written to this checkout.

EOF
  $wrangler_cmd secret put GITHUB_TOKEN --env micropub --profile "$CLOUDFLARE_PROFILE"
  log::ok "Micropub GITHUB_TOKEN stored"
}

# ---------------------------------------------------------------------------
# 6. GitHub
# ---------------------------------------------------------------------------

setup_github() {
  log::title "6. GitHub"
  if (( SKIP_GITHUB )); then
    log::skip "skipped (--skip-github)"
    record "github:             skipped"
    return
  fi
  if ! command -v gh >/dev/null 2>&1; then
    log::skip "gh CLI not installed; manual: create $GITHUB_REPOSITORY on GitHub"
    record "github:             skipped (gh missing)"
    return
  fi
  if ! gh auth status >/dev/null 2>&1; then
    if (( NON_INTERACTIVE )); then
      log::warn "gh auth required — skipping"
      record "github:             skipped (non-interactive)"
      return
    fi
    log::info "running: gh auth login"
    gh auth login
  fi
  if gh repo view "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
    log::ok "$GITHUB_REPOSITORY exists on GitHub"
  else
    log::info "creating $GITHUB_REPOSITORY on GitHub"
    gh repo create "$GITHUB_REPOSITORY" \
      --public --source=. --remote=origin --push 2>/dev/null \
      || log::warn "gh repo create failed (already exists, no permission, or no commits yet)"
  fi

  if [[ -z "$CF_ACCOUNT_ID" ]]; then
    log::warn "Cloudflare was skipped, so GitHub Actions Cloudflare secrets were not configured"
    record "github:             $GITHUB_REPOSITORY (Cloudflare secrets skipped)"
    return
  fi

  local secrets_json
  secrets_json="$(gh secret list --repo "$GITHUB_REPOSITORY" --app actions --json name)"
  printf '%s' "$CF_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID \
    --repo "$GITHUB_REPOSITORY" --app actions
  log::ok "GitHub Actions CLOUDFLARE_ACCOUNT_ID refreshed"

  if missing_secret "$secrets_json" CLOUDFLARE_API_TOKEN; then
    if (( NON_INTERACTIVE )); then
      log::err "GitHub Actions CLOUDFLARE_API_TOKEN is missing and --non-interactive is set"
      exit 70
    fi
    cat <<EOF

  Create the Cloudflare deployment token before continuing:
    1. Open: https://dash.cloudflare.com/profile/api-tokens
    2. Select Create Token → Create Custom Token → Get started.
    3. Token name: Hypertext Studio GitHub Actions
    4. Add these permissions:
       Account → Cloudflare Pages: Edit
       Account → Workers Scripts: Edit
       Account → D1: Edit
       Account → Account Settings: Read
       Zone → Workers Routes: Edit
    5. Limit its resources:
       Account resources: Include → $CLOUDFLARE_ACCOUNT_NAME
       Zone resources: Include → Specific zone → ${PAGES_DOMAINS[0]}
    6. Select Continue to summary → Create Token.
    7. Copy the token immediately, then paste it at the secure prompt below.

  GitHub stores it as the Actions secret CLOUDFLARE_API_TOKEN.
  The value is sent directly to GitHub and is never written to this checkout.

EOF
    gh secret set CLOUDFLARE_API_TOKEN --repo "$GITHUB_REPOSITORY" --app actions
    log::ok "GitHub Actions CLOUDFLARE_API_TOKEN stored"
  else
    log::ok "GitHub Actions CLOUDFLARE_API_TOKEN present"
  fi

  record "github:             $GITHUB_REPOSITORY"
}

# ---------------------------------------------------------------------------
# 7. Smoke
# ---------------------------------------------------------------------------

run_smoke() {
  log::title "7. Smoke checks"
  if pnpm exec astro --version >/dev/null 2>&1; then
    log::ok "astro CLI works ($(pnpm exec astro --version))"
  else
    log::err "astro CLI failed — investigate pnpm install output"
    exit 1
  fi
  if [[ -f astro.config.mjs ]]; then
    log::ok "astro.config.mjs present"
  fi
}

# ---------------------------------------------------------------------------
# Final report
# ---------------------------------------------------------------------------

report() {
  log::title "Bootstrap complete"
  log::rule
  for line in "${SUMMARY[@]}"; do
    printf '  %s\n' "$line"
  done
  log::rule
  cat <<EOF

  Next steps:
    make dev         # boot the local dev server (localhost:4321)
    make doctor      # re-run health checks any time
    make help        # see every available task

EOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if (( DOCTOR_ONLY )); then
  exec bash "$REPO_ROOT/scripts/doctor.sh"
fi

check_prereqs
install_deps
setup_env
load_project_config
install_hooks
setup_cloudflare
setup_github
run_smoke
report

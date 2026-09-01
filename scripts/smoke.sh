#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly REPO_ROOT

# shellcheck source=scripts/lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

readonly BASE_URL="${BASE_URL:-https://hypertext.studio}"
readonly WWW_URL="${WWW_URL:-https://www.hypertext.studio}"
readonly SMOKE_REPORT_FILE="${SMOKE_REPORT_FILE:-}"
readonly SMOKE_ATTEMPTS="${SMOKE_ATTEMPTS:-5}"
readonly SMOKE_RETRY_DELAY_SECONDS="${SMOKE_RETRY_DELAY_SECONDS:-2}"

if [[ ! "$SMOKE_ATTEMPTS" =~ ^[1-9][0-9]*$ ]]; then
  log::err "SMOKE_ATTEMPTS must be a positive integer"
  exit 2
fi
if [[ ! "$SMOKE_RETRY_DELAY_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  log::err "SMOKE_RETRY_DELAY_SECONDS must be a non-negative number"
  exit 2
fi

SMOKE_TEMP_DIR="$(mktemp -d)"
readonly SMOKE_TEMP_DIR
trap 'rm -rf "$SMOKE_TEMP_DIR"' EXIT

if [[ -n "$SMOKE_REPORT_FILE" ]]; then
  printf 'label\texpected\tactual\turl\tresult\n' >"$SMOKE_REPORT_FILE"
fi

record_result() {
  local label="$1" expected="$2" actual="$3" url="$4" result="$5"
  if [[ -n "$SMOKE_REPORT_FILE" ]]; then
    printf '%s\t%s\t%s\t%s\t%s\n' "$label" "$expected" "$actual" "$url" "$result" \
      >>"$SMOKE_REPORT_FILE"
  fi
}

# header_value <headers-file> <lowercase-header-name>
#
# HTTP/2 sends lowercase header names, HTTP/1.1 sends them capitalised. awk's
# IGNORECASE is a gawk extension that macOS awk and mawk silently ignore, so
# match on a lowercased copy of the line instead.
header_value() {
  awk -v name="$2" 'tolower($0) ~ "^" name ":" {
    sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit
  }' "$1"
}

has_content_type() {
  local actual
  actual="$(header_value "$1" content-type | tr '[:upper:]' '[:lower:]')"
  [[ "$actual" == "$2"* ]]
}

# Every validator is called as `<validator...> <headers-file> <body-file>`, so a
# validator may carry leading arguments of its own (see validate_json).
validate_homepage() {
  has_content_type "$1" "text/html" &&
    grep -Fq 'Hypertext Studio builds software for humans.' "$2" &&
    grep -Fq '<hypertext-studio>' "$2"
}

validate_about() {
  has_content_type "$1" "text/html" &&
    grep -Fq 'Willie Chalmers III' "$2" &&
    grep -Fq 'started Hypertext Studio as a home' "$2"
}

validate_llms() {
  has_content_type "$1" "text/markdown" && grep -Fq '# Hypertext Studio' "$2"
}

validate_json() {
  local kind="$1" headers="$2" body="$3"
  has_content_type "$headers" "application/json" || return 1
  node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const [path, kind, baseUrl] = process.argv.slice(1);
    let data;
    try { data = JSON.parse(readFileSync(path, "utf8")); }
    catch { process.exit(1); }
    const valid = {
      poem: () => typeof data.poem === "string",
      micropub: () => data["media-endpoint"] === null &&
        Array.isArray(data["syndicate-to"]) &&
        Array.isArray(data["post-types"]) &&
        ["note", "bookmark"].every((type) => data["post-types"].some((entry) => entry?.type === type)),
      oembed: () => data.version === "1.0" && data.type === "rich" &&
        data.provider_name === "Hypertext Studio" && data.provider_url === baseUrl,
      webmentions: () => data.error === "missing ?target=",
    }[kind];
    if (!valid || !valid()) process.exit(1);
  ' "$body" "$kind" "$BASE_URL"
}

validate_www_redirect() {
  [[ "$(header_value "$1" location)" == "$BASE_URL/about" ]]
}

# check_response <label> <status> <semantics> <url> <get|head> <validator...>
check_response() {
  local label="$1" expected_status="$2" expected_semantics="$3" url="$4" request_mode="$5"
  shift 5
  local -a validator=("$@")
  local headers_file="$SMOKE_TEMP_DIR/headers" body_file="$SMOKE_TEMP_DIR/body"
  local attempt status actual curl_result
  local -a curl_args=(
    --silent --show-error --dump-header "$headers_file" --output "$body_file"
    --write-out '%{http_code}' --max-time 20
  )
  if [[ "$request_mode" == "head" ]]; then curl_args+=(--head); fi

  for ((attempt = 1; attempt <= SMOKE_ATTEMPTS; attempt++)); do
    : >"$headers_file"
    : >"$body_file"
    if curl_result="$(curl "${curl_args[@]}" "$url")"; then
      status="$curl_result"
      if [[ "$status" == "$expected_status" ]] && "${validator[@]}" "$headers_file" "$body_file"; then
        actual="$status semantic match"
        log::ok "$label ($actual)"
        record_result "$label" "$expected_status $expected_semantics" "$actual" "$url" success
        return 0
      fi
      actual="$status semantic mismatch"
    else
      actual="curl-error"
    fi

    if ((attempt < SMOKE_ATTEMPTS)); then
      log::warn "retry $attempt/$SMOKE_ATTEMPTS: $label returned $actual"
      sleep "$SMOKE_RETRY_DELAY_SECONDS"
    fi
  done

  log::err "$label returned $actual; expected $expected_status $expected_semantics"
  record_result "$label" "$expected_status $expected_semantics" "$actual" "$url" failure
  return 1
}

failures=0
check_response "Homepage" 200 "text/html with the studio document" "$BASE_URL/" \
  get validate_homepage || failures=$((failures + 1))
check_response "About" 200 "text/html with the founder introduction" "$BASE_URL/about/" \
  get validate_about || failures=$((failures + 1))
check_response "LLMs" 200 "text/markdown with studio context" "$BASE_URL/llms.txt" \
  get validate_llms || failures=$((failures + 1))
check_response "Poem API" 200 "application/json with a string poem" "$BASE_URL/api/poem" \
  get validate_json poem || failures=$((failures + 1))
check_response "Micropub config" 200 "application/json with supported post types" \
  "$BASE_URL/micropub?q=config" get validate_json micropub || failures=$((failures + 1))
check_response "oEmbed" 200 "application/json with canonical provider metadata" \
  "$BASE_URL/oembed?url=${BASE_URL}%2F" get validate_json oembed || failures=$((failures + 1))
check_response "Webmentions" 400 "application/json explaining the missing target" \
  "$BASE_URL/webmentions" get validate_json webmentions || failures=$((failures + 1))
check_response "www redirect" 308 "redirect to $BASE_URL/about" "$WWW_URL/about" \
  head validate_www_redirect || failures=$((failures + 1))

if ((failures > 0)); then
  exit 1
fi

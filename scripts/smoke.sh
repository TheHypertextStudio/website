#!/usr/bin/env bash

set -euo pipefail

readonly BASE_URL="${BASE_URL:-https://hypertext.studio}"
readonly WWW_URL="${WWW_URL:-https://www.hypertext.studio}"
readonly SMOKE_REPORT_FILE="${SMOKE_REPORT_FILE:-}"
readonly SMOKE_ATTEMPTS="${SMOKE_ATTEMPTS:-5}"
readonly SMOKE_RETRY_DELAY_SECONDS="${SMOKE_RETRY_DELAY_SECONDS:-2}"

if [[ ! "$SMOKE_ATTEMPTS" =~ ^[1-9][0-9]*$ ]]; then
  echo "SMOKE_ATTEMPTS must be a positive integer" >&2
  exit 2
fi
if [[ ! "$SMOKE_RETRY_DELAY_SECONDS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "SMOKE_RETRY_DELAY_SECONDS must be a non-negative number" >&2
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

content_type() {
  awk 'BEGIN { IGNORECASE=1 } /^content-type:/ {
    sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit
  }' "$1"
}

has_content_type() {
  local actual
  actual="$(content_type "$1" | tr '[:upper:]' '[:lower:]')"
  [[ "$actual" == "$2"* ]]
}

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

validate_poem() {
  validate_json poem "$1" "$2"
}

validate_micropub() {
  validate_json micropub "$1" "$2"
}

validate_oembed() {
  validate_json oembed "$1" "$2"
}

validate_webmentions() {
  validate_json webmentions "$1" "$2"
}

validate_www_redirect() {
  local location
  location="$(awk 'BEGIN { IGNORECASE=1 } /^location:/ {
    sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit
  }' "$1")"
  [[ "$location" == "$BASE_URL/about" ]]
}

check_response() {
  local label="$1" expected_status="$2" expected_semantics="$3" url="$4" validator="$5"
  local request_mode="${6:-get}"
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
      if [[ "$status" == "$expected_status" ]] && "$validator" "$headers_file" "$body_file"; then
        actual="$status semantic match"
        echo "smoke ok: $label ($actual)"
        record_result "$label" "$expected_status $expected_semantics" "$actual" "$url" success
        return 0
      fi
      actual="$status semantic mismatch"
    else
      actual="curl-error"
    fi

    if ((attempt < SMOKE_ATTEMPTS)); then
      echo "smoke retry $attempt/$SMOKE_ATTEMPTS: $label returned $actual" >&2
      sleep "$SMOKE_RETRY_DELAY_SECONDS"
    fi
  done

  echo "smoke failed: $label returned $actual; expected $expected_status $expected_semantics" >&2
  record_result "$label" "$expected_status $expected_semantics" "$actual" "$url" failure
  return 1
}

failures=0
check_response "Homepage" 200 "text/html with the studio document" "$BASE_URL/" \
  validate_homepage || failures=$((failures + 1))
check_response "About" 200 "text/html with the founder introduction" "$BASE_URL/about/" \
  validate_about || failures=$((failures + 1))
check_response "LLMs" 200 "text/markdown with studio context" "$BASE_URL/llms.txt" \
  validate_llms || failures=$((failures + 1))
check_response "Poem API" 200 "application/json with a string poem" "$BASE_URL/api/poem" \
  validate_poem || failures=$((failures + 1))
check_response "Micropub config" 200 "application/json with supported post types" \
  "$BASE_URL/micropub?q=config" validate_micropub || failures=$((failures + 1))
check_response "oEmbed" 200 "application/json with canonical provider metadata" \
  "$BASE_URL/oembed?url=${BASE_URL}%2F" validate_oembed || failures=$((failures + 1))
check_response "Webmentions" 400 "application/json explaining the missing target" \
  "$BASE_URL/webmentions" validate_webmentions || failures=$((failures + 1))
check_response "www redirect" 308 "redirect to $BASE_URL/about" "$WWW_URL/about" \
  validate_www_redirect head || failures=$((failures + 1))

if ((failures > 0)); then
  exit 1
fi

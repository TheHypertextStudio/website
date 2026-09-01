#!/usr/bin/env bash

set -euo pipefail

readonly BASE_URL="${BASE_URL:-https://hypertext.studio}"
readonly WWW_URL="${WWW_URL:-https://www.hypertext.studio}"
readonly SMOKE_REPORT_FILE="${SMOKE_REPORT_FILE:-}"

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

check_status() {
  local label="$1"
  local expected="$2"
  local url="$3"
  local actual
  if ! actual="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' --max-time 20 "$url")"; then
    actual="curl-error"
  fi
  if [[ "$actual" != "$expected" ]]; then
    echo "smoke failed: $url returned $actual; expected $expected" >&2
    record_result "$label" "$expected" "$actual" "$url" failure
    return 1
  fi
  echo "smoke ok: $expected $url"
  record_result "$label" "$expected" "$actual" "$url" success
}

check_redirect() {
  local location status
  if ! status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 20 "$WWW_URL/about")"; then
    status="curl-error"
  fi
  if ! location="$(curl --silent --show-error --head --max-time 20 "$WWW_URL/about" | awk 'BEGIN { IGNORECASE=1 } /^location:/ { sub(/\r$/, "", $2); print $2 }')"; then
    location="curl-error"
  fi
  if [[ "$status" != "308" || "$location" != "$BASE_URL/about" ]]; then
    echo "smoke failed: www redirect returned $status to ${location:-<none>}" >&2
    record_result "www redirect" "308 -> $BASE_URL/about" "$status -> ${location:-<none>}" \
      "$WWW_URL/about" failure
    return 1
  fi
  echo "smoke ok: 308 $WWW_URL/about -> $location"
  record_result "www redirect" "308 -> $BASE_URL/about" "$status -> $location" \
    "$WWW_URL/about" success
}

failures=0
check_status "Homepage" 200 "$BASE_URL/" || failures=$((failures + 1))
check_status "About" 200 "$BASE_URL/about" || failures=$((failures + 1))
check_status "LLMs" 200 "$BASE_URL/llms.txt" || failures=$((failures + 1))
check_status "Poem API" 200 "$BASE_URL/api/poem" || failures=$((failures + 1))
check_status "Micropub config" 200 "$BASE_URL/micropub?q=config" || failures=$((failures + 1))
check_status "oEmbed" 200 "$BASE_URL/oembed?url=${BASE_URL}%2F" || failures=$((failures + 1))
check_status "Webmentions" 400 "$BASE_URL/webmentions" || failures=$((failures + 1))
check_redirect || failures=$((failures + 1))

if ((failures > 0)); then
  exit 1
fi

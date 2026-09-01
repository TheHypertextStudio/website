#!/usr/bin/env bash

set -euo pipefail

readonly BASE_URL="${BASE_URL:-https://hypertext.studio}"
readonly WWW_URL="${WWW_URL:-https://www.hypertext.studio}"

check_status() {
  local expected="$1"
  local url="$2"
  local actual
  actual="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' --max-time 20 "$url")"
  if [[ "$actual" != "$expected" ]]; then
    echo "smoke failed: $url returned $actual; expected $expected" >&2
    return 1
  fi
  echo "smoke ok: $expected $url"
}

check_redirect() {
  local location status
  status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 20 "$WWW_URL/about")"
  location="$(curl --silent --show-error --head --max-time 20 "$WWW_URL/about" | awk 'BEGIN { IGNORECASE=1 } /^location:/ { sub(/\r$/, "", $2); print $2 }')"
  if [[ "$status" != "308" || "$location" != "$BASE_URL/about" ]]; then
    echo "smoke failed: www redirect returned $status to ${location:-<none>}" >&2
    return 1
  fi
  echo "smoke ok: 308 $WWW_URL/about -> $location"
}

check_status 200 "$BASE_URL/"
check_status 200 "$BASE_URL/about"
check_status 200 "$BASE_URL/llms.txt"
check_status 200 "$BASE_URL/api/poem"
check_status 200 "$BASE_URL/micropub?q=config"
check_status 200 "$BASE_URL/oembed?url=${BASE_URL}%2F"
check_status 400 "$BASE_URL/webmentions"
check_redirect

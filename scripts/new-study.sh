#!/usr/bin/env bash
# Scaffold a new MDX study with frontmatter from the studies content schema.
#
#   make new-study TITLE="A study about something"
#   scripts/new-study.sh "A study about something"

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=lib/log.sh
source "$REPO_ROOT/scripts/lib/log.sh"

title="${1:-${TITLE:-}}"
if [[ -z "$title" ]]; then
  log::err "usage: scripts/new-study.sh \"<Title>\""
  exit 64
fi

slug="$(echo "$title" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
  | cut -c1-60)"
out="src/content/studies/${slug}.mdx"

if [[ -e "$out" ]]; then
  log::err "$out already exists"
  exit 70
fi

now="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
cat > "$out" <<EOF
---
title: "$title"
summary: "TODO: one-sentence abstract"
publishedAt: "$now"
author: "Hypertext Studio"
draft: true
tags: []
---

import { Marginalia } from '@/components/interactive/Marginalia.astro';

## Introduction

TODO: open with the question this study answers.
EOF

log::ok "created $out"
log::info "next: edit the file, set draft: false when ready, commit + push"

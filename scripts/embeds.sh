#!/usr/bin/env bash
# Print the validator URLs for cross-platform embed previews. The site URL
# is canonical; copy-paste into each validator and confirm the preview looks
# right. Where automated checks exist, run them; otherwise this is a
# tooled-manual checklist.

set -euo pipefail

readonly URL="${1:-https://hypertext.studio/}"
readonly ENC="$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$URL")"

cat <<EOF
Embed validators for $URL

  Open Graph (Facebook):
    https://developers.facebook.com/tools/debug/?q=$ENC

  X / Twitter Card:
    https://cards-dev.twitter.com/validator (paste URL)

  LinkedIn Post Inspector:
    https://www.linkedin.com/post-inspector/?url=$ENC

  Schema.org Validator:
    https://validator.schema.org/?url=$ENC

  Google Rich Results:
    https://search.google.com/test/rich-results?url=$ENC

  IndieWebify h-card / rel=me:
    https://indiewebify.me/?url=$ENC

  Manual checks (no public API):
    • Discord — paste $URL in any test channel; confirm rich card.
    • Slack   — paste $URL; confirm unfurl with image.
    • iMessage — paste $URL; confirm preview card.
    • Mastodon / Bluesky — share status; confirm inline preview.
EOF

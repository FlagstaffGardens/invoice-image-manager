#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
else
  echo ".env not found in $ROOT_DIR" >&2
  exit 1
fi

URL="${ANTHROPIC_BASE_URL%/}/v1/messages"
MODEL="${ANTHROPIC_MODEL:-claude-3-5-sonnet-latest}"

read -r -d '' JSON <<JSON || true
{
  "model": "${MODEL}",
  "max_tokens": 32,
  "messages": [
    {"role": "user", "content": [{"type": "text", "text": "ping"}]}
  ]
}
JSON

echo "Testing POST $URL with MODEL=$MODEL"
curl -s -D /tmp/anthropic_test_headers.txt -o /tmp/anthropic_test_body.txt -X POST "$URL" \
 -H "content-type: application/json" \
 -H "x-api-key: $ANTHROPIC_API_KEY" \
 -H "anthropic-version: 2023-06-01" \
 --data "$JSON"
echo
CODE=$(awk 'tolower($1)=="http/1.1"||tolower($1)=="http/2"{code=$2} END{print code}' /tmp/anthropic_test_headers.txt)
echo "HTTP $CODE"
echo "--- HEADERS ---"; sed -n '1,20p' /tmp/anthropic_test_headers.txt
echo "--- BODY (first 600 chars) ---"; head -c 600 /tmp/anthropic_test_body.txt | sed 's/\x1b\[[0-9;]*m//g'


#!/bin/sh
# Run all SQL migrations against DATABASE_URL (idempotent — safe to re-run)
set -e

for f in netlify/database/migrations/*.sql; do
  echo "Running $f ..."
  psql "$DATABASE_URL" -f "$f"
done

echo "All migrations complete."

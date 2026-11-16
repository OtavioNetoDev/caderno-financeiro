#!/usr/bin/env bash
# Backup completo do banco com mongodump. Mantém só os últimos backups em backups/ (fora do git).
set -euo pipefail
cd "$(dirname "$0")/.."

URI="${MONGODB_URI:-}"
if [ -z "$URI" ] && [ -f .env ]; then
  URI="$(grep -E '^MONGODB_URI=' .env | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
fi
if [ -z "$URI" ]; then
  echo "MONGODB_URI não encontrada (.env ou variável de ambiente)" >&2
  exit 1
fi
if ! command -v mongodump >/dev/null 2>&1; then
  echo "mongodump não encontrado. Instale o MongoDB Database Tools." >&2
  exit 1
fi

KEEP="${BACKUP_KEEP:-14}"
DEST="backups/$(date +%F_%H%M)"
mkdir -p "$DEST"
mongodump --uri="$URI" --gzip --archive="$DEST/banco.archive.gz"
echo "Backup salvo em $DEST"

# Apaga os mais antigos, mantendo apenas os últimos $KEEP.
ls -1d backups/*/ 2>/dev/null | sort -r | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -rf "$old"
done

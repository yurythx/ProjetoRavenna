#!/usr/bin/env bash
# Generates self-signed SSL certificates for local development.
# NOT for production — use Let's Encrypt and set SSL_CERT_PATH in .env.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="$SCRIPT_DIR/ssl"

mkdir -p "$SSL_DIR"

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$SSL_DIR/privkey.pem" \
  -out    "$SSL_DIR/fullchain.pem" \
  -days   365 \
  -subj   "/CN=localhost/O=Ravenna Dev/C=BR" \
  2>/dev/null

echo "Dev SSL certs written to $SSL_DIR"
echo "  fullchain.pem  (certificate)"
echo "  privkey.pem    (private key)"
echo ""
echo "Start nginx with: docker compose -f docker-compose.prod.yml up nginx"
echo "Then open: https://localhost  (accept the browser self-signed cert warning)"

#!/bin/bash
# Generate self-signed SSL certificate for local / staging use.
# For production, replace cert.pem + key.pem with a real certificate
# (e.g., Let's Encrypt via certbot or your hospital's CA-signed cert).

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSL_DIR="$SCRIPT_DIR/ssl"

mkdir -p "$SSL_DIR"

# Check if cert already exists
if [[ -f "$SSL_DIR/cert.pem" && -f "$SSL_DIR/key.pem" ]]; then
  echo "SSL certificate already exists in $SSL_DIR — skipping generation."
  echo "Delete cert.pem and key.pem and re-run to regenerate."
  exit 0
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out    "$SSL_DIR/cert.pem" \
  -subj   "/C=TH/ST=Bangkok/L=Bangkok/O=PICHA Clinical/OU=SmartLab/CN=localhost"

chmod 600 "$SSL_DIR/key.pem"
echo ""
echo "Self-signed SSL certificate generated:"
echo "  Certificate : $SSL_DIR/cert.pem"
echo "  Private key : $SSL_DIR/key.pem"
echo ""
echo "NOTE: For production, replace these files with a real certificate."
echo "      Let's Encrypt: https://certbot.eff.org/"

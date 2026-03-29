#!/bin/bash
# VPS Initial Setup Script — run once as root on a fresh Hostinger Ubuntu VPS
# Usage: bash scripts/setup-vps.sh
set -e

DEPLOY_USER="deploy"
APP_DIR="/opt/babichat"
DOMAIN=""  # Set this before running: DOMAIN=tondomaine.com bash setup-vps.sh

if [ -z "$DOMAIN" ]; then
  echo "❌ Set DOMAIN before running: DOMAIN=tondomaine.com bash setup-vps.sh"
  exit 1
fi

echo "🔧 Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
  curl git ufw nginx certbot python3-certbot-nginx \
  apt-transport-https ca-certificates gnupg lsb-release

echo "🐳 Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "👤 Creating deploy user..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

echo "📁 Setting up app directory..."
mkdir -p "$APP_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "🔑 Setting up SSH key for GitHub Actions deploy..."
DEPLOY_SSH_DIR="/home/$DEPLOY_USER/.ssh"
mkdir -p "$DEPLOY_SSH_DIR"
ssh-keygen -t ed25519 -f "$DEPLOY_SSH_DIR/id_ed25519" -N "" -C "github-actions-deploy"
cat "$DEPLOY_SSH_DIR/id_ed25519.pub" >> "$DEPLOY_SSH_DIR/authorized_keys"
chmod 700 "$DEPLOY_SSH_DIR"
chmod 600 "$DEPLOY_SSH_DIR/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_SSH_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Copy this private key to GitHub Secret VPS_SSH_KEY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat "$DEPLOY_SSH_DIR/id_ed25519"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "🌐 Configuring Nginx..."
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/infra/nginx/babichat.conf" \
  > /etc/nginx/sites-available/babichat
ln -sf /etc/nginx/sites-available/babichat /etc/nginx/sites-enabled/babichat
rm -f /etc/nginx/sites-enabled/default
nginx -t

echo "🔒 Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN"

echo "🔄 Enabling Nginx..."
systemctl enable nginx
systemctl reload nginx

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone your repo: git clone https://github.com/OWNER/REPO $APP_DIR"
echo "  2. Create .env: cp $APP_DIR/.env.example $APP_DIR/.env && nano $APP_DIR/.env"
echo "  3. Add GITHUB_REPOSITORY_OWNER to .env"
echo "  4. First deploy: cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml up -d"
echo "  5. Init DB: cd $APP_DIR && npm run init-channels && npm run init-admin"

# Deployment guide

This guide covers deploying the full-stack Stype server. The server runs SQLite with Drizzle ORM, handles user accounts and sessions, manages email delivery, and exposes synchronization endpoints for offline clients.

## System requirements

- **Hardware:** 1 vCPU, 512 MB RAM (1 GB recommended), 1 GB free disk space.
- **Operating system:** Any modern Linux distribution (Ubuntu 22.04+, Debian 12+, Alpine), macOS, or Windows with WSL2.
- **Software:** Docker with Docker Compose, or Node.js 20+ with pnpm 9+ for bare-metal installs.

## Docker Compose deployment

Docker Compose is the recommended deployment method. It packages all runtime dependencies and ensures SQLite data persists across container updates.

### 1. Clone the repository

```sh
git clone git@github.com:Trindade7/stype.git
cd stype
```

### 2. Configure environment variables

Copy the template file to `.env`:

```sh
cp .env.example .env
```

Open `.env` and set the public origin and initial administrator password:

```env
ORIGIN=https://stype.example.com
INITIAL_ADMIN_PASSWORD=change-to-a-strong-password
INITIAL_ADMIN_EMAIL=admin@example.com
```

Setting `ORIGIN` to your public URL is required. SvelteKit checks this header on form submissions to protect against CSRF attacks.

### 3. Launch the container

```sh
docker compose up -d
```

Docker builds the multi-stage image, maps port 3000 to the host, and mounts the `./data` directory into the container for database storage.

### 4. Check container logs

```sh
docker compose logs -f stype
```

You should see:

```
Listening on http://0.0.0.0:3000
```

### 5. Update to a new version

To update your running instance:

```sh
git pull origin main
docker compose build
docker compose up -d
```

Your data in `./data/stype.db` remains intact during updates.

---

## Bare-metal Node.js deployment

Use this method if you run your services directly on a Linux host without container runtimes.

### 1. Install prerequisites

Install Node.js 20 or later, pnpm, and C++ build tools required by `better-sqlite3`:

```sh
# On Debian or Ubuntu
sudo apt-get update
sudo apt-get install -y nodejs npm python3 make g++
sudo npm install -g pnpm
```

### 2. Build the server

```sh
git clone git@github.com:Trindade7/stype.git /opt/stype
cd /opt/stype

pnpm install --frozen-lockfile
pnpm build
```

The compiled server outputs to `/opt/stype/build`.

### 3. Configure systemd

Create a dedicated system user and set directory permissions:

```sh
sudo useradd --system --shell /usr/sbin/nologin --home /opt/stype stype
sudo mkdir -p /opt/stype/data
sudo chown -R stype:stype /opt/stype
```

Create an environment file at `/opt/stype/.env`:

```env
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
ORIGIN=https://stype.example.com
DATABASE_URL=/opt/stype/data/stype.db
INITIAL_ADMIN_PASSWORD=change-to-a-strong-password
INITIAL_ADMIN_EMAIL=admin@example.com
```

Create `/etc/systemd/system/stype.service`:

```ini
[Unit]
Description=Stype Typing Test Server
After=network.target

[Service]
Type=simple
User=stype
Group=stype
WorkingDirectory=/opt/stype
EnvironmentFile=/opt/stype/.env
ExecStart=/usr/bin/node build/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```sh
sudo systemctl daemon-reload
sudo systemctl enable stype
sudo systemctl start stype
sudo systemctl status stype
```

---

## Reverse proxy configuration

Do not expose Stype directly to the public internet on port 3000. Use a reverse proxy to terminate TLS and manage certificates.

### Caddy

Caddy provides automatic HTTPS with minimal configuration. Create `/etc/caddy/Caddyfile`:

```caddy
stype.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Reload Caddy:

```sh
sudo systemctl reload caddy
```

### Nginx

Create `/etc/nginx/sites-available/stype.conf`:

```nginx
server {
    listen 80;
    server_name stype.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stype.example.com;

    ssl_certificate /etc/letsencrypt/live/stype.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stype.example.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:

```sh
sudo ln -s /etc/nginx/sites-available/stype.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Email delivery configuration

Stype works without an external mail provider by default. When SMTP variables remain unset:
- Self-registered typists are marked verified immediately upon signup.
- Email-based password reset requests are disabled. Administrators can set or reset passwords directly from `/app/admin/users`.
- The application requires zero external network services to operate.

To enable automated verification emails and password reset links:
1. Provide your SMTP server details in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
2. If connecting directly over TLS on port 465, set `SMTP_SECURE=true`. For STARTTLS on port 587, set `SMTP_SECURE=false`.
3. Restart the Stype server or container to apply the changes.

---

## Environment variables reference

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port on which the HTTP server listens. |
| `HOST` | `0.0.0.0` | Network interface to bind to. |
| `ORIGIN` | `http://localhost:3000` | Public URL of the server. Required by SvelteKit for CSRF validation. |
| `DATABASE_URL` | `data/stype.db` | File path to the SQLite database. |
| `INITIAL_ADMIN_PASSWORD` | `admin123` | Password set for the initial `admin` user on first boot. |
| `INITIAL_ADMIN_EMAIL` | `admin@stype.local` | Email set for the initial `admin` user on first boot. |
| `SMTP_HOST` | `(unset)` | SMTP host for sending verification and password reset emails. |
| `SMTP_PORT` | `587` | Port for SMTP connections (usually 587 or 465). |
| `SMTP_USER` | `(unset)` | Username for SMTP authentication. |
| `SMTP_PASS` | `(unset)` | Password for SMTP authentication. |
| `SMTP_FROM` | `noreply@<SMTP_HOST>` | Sender email address for outbound messages. |
| `SMTP_SECURE` | `false` | Set to `true` when connecting directly over TLS (port 465). |

---

## Database backups and maintenance

Stype stores all users, sessions, passages, and test runs in a single SQLite file at `DATABASE_URL`. SQLite runs in WAL (Write-Ahead Logging) mode.

### Create a hot backup

To back up a live database safely without stopping the server, use SQLite's backup command:

```sh
sqlite3 /opt/stype/data/stype.db ".backup '/opt/stype/data/backup-$(date +%Y%m%d%H%M%S).db'"
```

In Docker:

```sh
docker compose exec stype sqlite3 /app/data/stype.db ".backup '/app/data/backup.db'"
cp ./data/backup.db ./backups/stype-$(date +%Y%m%d).db
```

### Restore from backup

1. Stop the server:
   ```sh
   docker compose down
   # or
   sudo systemctl stop stype
   ```
2. Replace the database file:
   ```sh
   cp /path/to/backup.db ./data/stype.db
   rm -f ./data/stype.db-wal ./data/stype.db-shm
   ```
3. Restart the server:
   ```sh
   docker compose up -d
   # or
   sudo systemctl start stype
   ```

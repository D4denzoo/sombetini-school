# TLS certificates

This folder is mounted into Nginx at `/etc/nginx/ssl`. Nothing here is committed; the school supplies the domain.

## With Let's Encrypt (free, automatic renewal)

1. Point the domain (for example `sombetini.ac.tz`) at this server's public IP.
2. Start the stack on port 80: `docker compose up -d`.
3. Issue the first certificate into this folder:

   ```sh
   docker run --rm -it \
     -v "$(pwd)/docker/nginx/ssl:/etc/letsencrypt" \
     -v sombetini-school_certbot_www:/var/www/certbot \
     certbot/certbot certonly --webroot -w /var/www/certbot \
     -d sombetini.ac.tz -d www.sombetini.ac.tz --email office@sombetini.ac.tz --agree-tos --no-eff-email
   ```

4. In `docker/nginx/nginx.ssl.conf`, replace every `SCHOOL_DOMAIN` with the real domain.
5. In `.env`, set `NGINX_CONF=./docker/nginx/nginx.ssl.conf`, `PUBLIC_API_URL=https://sombetini.ac.tz`,
   `FRONTEND_URL=https://sombetini.ac.tz`, and add the HTTPS origin to `CORS_ORIGINS`.
6. `docker compose up -d nginx frontend backend` and uncomment the `certbot` service for renewals.

## With a certificate from another supplier

Copy `fullchain.pem` and `privkey.pem` into `docker/nginx/ssl/live/<domain>/` and follow steps 4–6.

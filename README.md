# Serverless YAML Dashboard Deployment Guide (Astro + Cloudflare Pages + KV)

## 1) Prerequisites (Wrangler login)

```bash
# Install Wrangler (if needed)
npm install -g wrangler

# Authenticate in browser
wrangler login

# Verify auth
wrangler whoami
```

## 2) KV Setup (create production + preview namespaces)

```bash
# Production KV namespace
wrangler kv namespace create DASHBOARD_CONFIG

# Preview KV namespace
wrangler kv namespace create DASHBOARD_CONFIG --preview
```

Save the two returned IDs:

- `PROD_KV_ID` (from the first command)
- `PREVIEW_KV_ID` (from the second command)

Optional shell helpers:

```bash
export PROD_KV_ID="<paste-production-namespace-id>"
export PREVIEW_KV_ID="<paste-preview-namespace-id>"
```

## 3) KV Seeding (put initial YAML config into KV)

```bash
cat > /tmp/dashboard-config.yml <<'YAML'
title: Dashboard
tabs:
  - id: overview
    label: Overview
    columns: 3
    widgets:
      - id: tickets
        type: ServiceTickets
        title: Service Tickets
        props:
          open: 5
          inProgress: 2
          overdue: 1
YAML
```

```bash
# Seed production namespace
wrangler kv key put --namespace-id "$PROD_KV_ID" dashboard.yaml --path /tmp/dashboard-config.yml

# Seed preview namespace
wrangler kv key put --namespace-id "$PREVIEW_KV_ID" dashboard.yaml --path /tmp/dashboard-config.yml
```

Optional verify:

```bash
wrangler kv key get --namespace-id "$PROD_KV_ID" dashboard.yaml
wrangler kv key get --namespace-id "$PREVIEW_KV_ID" dashboard.yaml
```

## 4) Configuration

### `wrangler.toml`

```toml
name = "dash"
compatibility_date = "2026-07-13"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "DASHBOARD_CONFIG"
id = "<PROD_KV_ID>"
preview_id = "<PREVIEW_KV_ID>"
```

### `astro.config.mjs` (`@astrojs/cloudflare` adapter)

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

## 5) Deployment (build + publish to Cloudflare Pages)

```bash
# Install deps
npm ci

# Build Astro
npm run build
```

First-time project creation (once):

```bash
wrangler pages project create dash --production-branch main
```

Deploy:

```bash
# Production deploy (main branch)
wrangler pages deploy dist --project-name dash --branch main
```

Preview deploy example:

```bash
wrangler pages deploy dist --project-name dash --branch preview
```

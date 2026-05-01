# atribe

Structured as a workspace so mobile, Shopify, backend, and shared packages can evolve independently.

## Layout

```text
atribe/
├── apps/
│   └── mobile/            # Expo app
├── services/
│   ├── api/               # Core backend
│   ├── redirect/          # Link routing service
│   └── shopify-app/       # Shopify integration layer
├── packages/
│   ├── attribution/       # Shared attribution logic
│   ├── db/                # Shared schema and database utilities
│   └── utils/             # Shared utilities
├── infra/
│   ├── deployment/        # Hosting/deployment config
│   └── docker/            # Docker assets
└── .env
```

## Commands

Run the existing mobile app from the repo root:

```bash
npm run mobile:start
```

# atribe

Structured as a workspace so mobile, Shopify, backend, and shared packages can evolve independently.

## Source Of Truth

The canonical implementation reference for this repo is:

- [`IMPLEMENTATION.md`](/Users/sam/Documents/Projects/atribe/IMPLEMENTATION.md)
- [`FLOW.md`](/Users/sam/Documents/Projects/atribe/FLOW.md)

Use it before relying on service READMEs or design/mockup files. The intended hierarchy is:

`Runtime truth > database truth > README truth > design/mockup truth`

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

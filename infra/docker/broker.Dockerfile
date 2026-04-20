FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/broker/package.json ./apps/broker/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/nie-bindings/package.json ./packages/nie-bindings/
COPY packages/policy-engine/package.json ./packages/policy-engine/
COPY packages/tstl-envelope/package.json ./packages/tstl-envelope/
COPY packages/providence-log/package.json ./packages/providence-log/
COPY packages/fhe-gate/package.json ./packages/fhe-gate/
COPY packages/openclaw-adapter/package.json ./packages/openclaw-adapter/
COPY packages/mcp-mediator/package.json ./packages/mcp-mediator/
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm -r build

FROM node:20-bookworm-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY --from=build /app /app
EXPOSE 8443
CMD ["node", "apps/broker/dist/index.js"]

#!/usr/bin/env bash
# XSOC-NIE-GUARD quickstart demo.
#
# For reviewers who want to see the broker running and the attack simulation
# harness passing scenarios in about three minutes without reading the full
# docs. Requires Docker, Node.js 20+, and pnpm 9+.
#
# Usage: ./scripts/quickstart.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== XSOC-NIE-GUARD Quickstart ===${NC}"
echo ""
echo "This script will:"
echo "  1. Check prerequisites (Node 20+, pnpm 9+, Docker)"
echo "  2. Install dependencies"
echo "  3. Build all workspace packages"
echo "  4. Run the test suite"
echo "  5. Start the broker with mock bindings"
echo "  6. Run the attack simulation harness against the broker"
echo "  7. Show the Providence audit chain after simulation"
echo ""
echo "Estimated time: 3-5 minutes on a modern laptop."
echo ""

# Step 1: prerequisites
echo -e "${BLUE}[1/7] Checking prerequisites...${NC}"
if ! command -v node &>/dev/null; then
  echo -e "${RED}FAIL${NC}: Node.js not found. Install Node 20+ from nodejs.org or via fnm/nvm."
  exit 1
fi
NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${RED}FAIL${NC}: Node version $(node -v) is too old. Need 20+."
  exit 1
fi
echo -e "  Node: $(node -v) ${GREEN}OK${NC}"

if ! command -v pnpm &>/dev/null; then
  echo -e "${YELLOW}WARN${NC}: pnpm not found. Installing via corepack..."
  corepack enable && corepack prepare pnpm@9.0.0 --activate
fi
echo -e "  pnpm: $(pnpm -v) ${GREEN}OK${NC}"

if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}WARN${NC}: Docker not found. Demo will run broker in foreground without Redis."
  USE_DOCKER=0
else
  echo -e "  Docker: $(docker --version | cut -d' ' -f3 | tr -d ',') ${GREEN}OK${NC}"
  USE_DOCKER=1
fi
echo ""

# Step 2: install
echo -e "${BLUE}[2/7] Installing dependencies...${NC}"
pnpm install --frozen-lockfile=false
echo ""

# Step 3: build
echo -e "${BLUE}[3/7] Building workspace packages...${NC}"
pnpm -r build
echo ""

# Step 4: test
echo -e "${BLUE}[4/7] Running test suite...${NC}"
pnpm -r test || echo -e "${YELLOW}Some tests failed. Continuing for demo purposes.${NC}"
echo ""

# Step 5: start broker
echo -e "${BLUE}[5/7] Starting broker on http://localhost:8443...${NC}"
if [ "$USE_DOCKER" = "1" ]; then
  docker compose up -d redis openclaw-mock
  sleep 2
fi

# Start broker in background
mkdir -p data/providence
BROKER_PORT=8443 \
NIE_BINDINGS_MODE=mock \
FHE_GATE_MODE=mock \
PROVIDENCE_CHAIN_FILE=./data/providence/quickstart-chain.jsonl \
node apps/broker/dist/index.js > /tmp/xsoc-broker.log 2>&1 &
BROKER_PID=$!

# Wait for broker to be ready
for i in $(seq 1 20); do
  if curl -sf http://localhost:8443/health &>/dev/null; then
    echo -e "  Broker ready ${GREEN}OK${NC} (pid $BROKER_PID)"
    break
  fi
  sleep 0.5
done

if ! curl -sf http://localhost:8443/health &>/dev/null; then
  echo -e "${RED}FAIL${NC}: Broker did not start. See /tmp/xsoc-broker.log"
  kill $BROKER_PID 2>/dev/null || true
  exit 1
fi
echo ""

# Trap to clean up
cleanup() {
  echo ""
  echo -e "${BLUE}Cleaning up...${NC}"
  kill $BROKER_PID 2>/dev/null || true
  if [ "$USE_DOCKER" = "1" ]; then
    docker compose down 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Step 6: attack sim
echo -e "${BLUE}[6/7] Running attack simulation harness...${NC}"
echo ""
BROKER_URL=http://localhost:8443 pnpm --filter @xsoc/attack-sim dev
echo ""

# Step 7: providence chain
echo -e "${BLUE}[7/7] Providence audit chain after simulation:${NC}"
echo ""
if [ -f ./data/providence/quickstart-chain.jsonl ]; then
  LINE_COUNT=$(wc -l < ./data/providence/quickstart-chain.jsonl)
  echo "  Total events logged: $LINE_COUNT"
  echo ""
  echo "  Event type distribution:"
  grep -o '"eventType":"[^"]*"' ./data/providence/quickstart-chain.jsonl | sort | uniq -c | sort -rn | sed 's/^/    /'
  echo ""
  echo "  First 3 events:"
  head -3 ./data/providence/quickstart-chain.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    e = json.loads(line)
    print(f'    [{e[\"eventType\"]:22s}] reason={e.get(\"reasonCode\", \"-\")[:30]:30s} corr={e[\"correlationId\"][:8]}')
"
else
  echo "  (No chain file produced; something went wrong)"
fi
echo ""
echo -e "${GREEN}=== Quickstart complete ===${NC}"
echo ""
echo "Next steps:"
echo "  * Read docs/architecture.md for the five-plane design"
echo "  * Read docs/threat-model.md for the threat taxonomy"
echo "  * Read docs/franklin-taxonomy-mapping.md for the Franklin et al. mapping"
echo "  * Read docs/zenodo-paper/draft.md for the full technical paper"
echo ""
echo "To run the broker in the foreground for manual testing:"
echo "  pnpm --filter @xsoc/broker dev"
echo ""
echo "To run just the attack sim against an already-running broker:"
echo "  BROKER_URL=http://localhost:8443 pnpm --filter @xsoc/attack-sim dev"
echo ""

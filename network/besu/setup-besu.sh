#!/bin/bash
# ============================================================
# Setup Script: Besu IBFT 2.0 Multi-Node Network
# Generates node keys, validator addresses, and genesis config
# Run this ONCE before first docker-compose up
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEYS_DIR="$SCRIPT_DIR/keys"
GENESIS_DIR="$SCRIPT_DIR/genesis"
DATA_DIR="$SCRIPT_DIR/data"

echo "🔧 Besu IBFT 2.0 Network Setup"
echo "================================"

# Clean previous data
echo "🧹 Cleaning previous data..."
rm -rf "$KEYS_DIR" "$DATA_DIR"
mkdir -p "$KEYS_DIR/node1" "$KEYS_DIR/node2" "$KEYS_DIR/node3" "$KEYS_DIR/node4"
mkdir -p "$DATA_DIR/node1" "$DATA_DIR/node2" "$DATA_DIR/node3" "$DATA_DIR/node4"

# Generate node keys using Besu docker image
echo "🔑 Generating node keys..."
for i in 1 2 3 4; do
  docker run --rm -v "$KEYS_DIR/node$i:/keys" \
    hyperledger/besu:latest \
    --data-path=/keys public-key export --to=/keys/key.pub
  echo "  ✅ Node $i key generated"
done

# Extract validator addresses
echo ""
echo "📋 Validator Addresses:"
VALIDATORS=""
for i in 1 2 3 4; do
  ADDR=$(docker run --rm -v "$KEYS_DIR/node$i:/keys" \
    hyperledger/besu:latest \
    --data-path=/keys public-key export-address --to=/dev/stdout 2>/dev/null | tail -1)
  echo "  Node $i: $ADDR"
  VALIDATORS="$VALIDATORS\"$ADDR\","
done
# Remove trailing comma
VALIDATORS="${VALIDATORS%,}"

# Get enodes for static-nodes.json
echo ""
echo "🌐 Generating static-nodes.json..."
ENODES="["
for i in 1 2 3 4; do
  PUBKEY=$(cat "$KEYS_DIR/node$i/key.pub" | sed 's/^0x//')
  IP="172.16.239.$((10 + i))"
  ENODE="\"enode://${PUBKEY}@${IP}:30303\""
  if [ $i -lt 4 ]; then
    ENODES="$ENODES\n  $ENODE,"
  else
    ENODES="$ENODES\n  $ENODE"
  fi
done
ENODES="$ENODES\n]"

echo -e "$ENODES" > "$GENESIS_DIR/static-nodes.json"
echo "  ✅ static-nodes.json created"

# Generate IBFT 2.0 extra data
echo ""
echo "⚙️  Generating IBFT 2.0 genesis..."
# IBFT extra data format: 32 bytes vanity + RLP([validators], vote_data, round, seals)
# Using Besu to generate this properly
IBFT_CONFIG=$(cat <<EOF
{
  "genesis": {
    "config": {
      "chainId": 1337,
      "berlinBlock": 0,
      "ibft2": {
        "blockperiodseconds": 2,
        "epochlength": 30000,
        "requesttimeoutseconds": 4
      }
    },
    "nonce": "0x0",
    "timestamp": "0x0",
    "gasLimit": "0x1fffffffffffff",
    "difficulty": "0x1",
    "mixHash": "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    "coinbase": "0x0000000000000000000000000000000000000000",
    "alloc": {
      "0xe59aabc185465d9070504956ae7bc475a78a9015": {
        "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
      }
    }
  },
  "blockchain": {
    "nodes": {
      "generate": true,
      "count": 4
    }
  }
}
EOF
)

echo "$IBFT_CONFIG" > "/tmp/ibft-config.json"

docker run --rm -v "/tmp/ibft-config.json:/config/ibft-config.json" \
  -v "$GENESIS_DIR:/output" \
  hyperledger/besu:latest \
  operator generate-blockchain-config \
  --config-file=/config/ibft-config.json \
  --to=/output/generated \
  --private-key-file-name=key 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "📌 Next steps:"
echo "  1. Run: docker-compose up -d"
echo "  2. Check nodes: curl http://localhost:8545 -X POST --data '{\"jsonrpc\":\"2.0\",\"method\":\"ibft_getValidatorsByBlockNumber\",\"params\":[\"latest\"],\"id\":1}'"
echo "  3. Deploy contract to IBFT network"

#!/usr/bin/env bash
# Fetches Mojang's official Bedrock JSON schemas (bedrock-samples) into .cache/.
set -euo pipefail
dest=".cache/bedrock-samples"
if [ -d "$dest/metadata/json_schemas" ] && [ -d "$dest/behavior_pack/biomes" ]; then exit 0; fi
mkdir -p .cache
git clone --depth 1 --filter=blob:none --sparse https://github.com/Mojang/bedrock-samples.git "$dest"
git -C "$dest" sparse-checkout set metadata/json_schemas behavior_pack/biomes

#!/usr/bin/env bash
# Loads the built packs into a real Bedrock Dedicated Server (Docker) and fails if the
# content log reports errors for our packs. Usage: tools/bds-smoke.sh [seconds-to-run]
set -euo pipefail
RUN_FOR="${1:-45}"
DATA="$(pwd)/.cache/bds"
LEVEL="dino_smoke"
rm -rf "$DATA/worlds/$LEVEL" "$DATA/behavior_packs/dinosaurs_BP" "$DATA/resource_packs/dinosaurs_RP" "$DATA"/logs
mkdir -p "$DATA/worlds/$LEVEL" "$DATA/behavior_packs" "$DATA/resource_packs"
cp -R build/dinosaurs_BP "$DATA/behavior_packs/dinosaurs_BP"
cp -R build/dinosaurs_RP "$DATA/resource_packs/dinosaurs_RP"
node -e '
const fs = require("fs");
const bp = JSON.parse(fs.readFileSync("build/dinosaurs_BP/manifest.json"));
const rp = JSON.parse(fs.readFileSync("build/dinosaurs_RP/manifest.json"));
const w = process.argv[1];
fs.writeFileSync(w + "/world_behavior_packs.json", JSON.stringify([{ pack_id: bp.header.uuid, version: bp.header.version }]));
fs.writeFileSync(w + "/world_resource_packs.json", JSON.stringify([{ pack_id: rp.header.uuid, version: rp.header.version }]));
' "$DATA/worlds/$LEVEL"
touch "$DATA/server.properties"
for kv in "content-log-file-enabled=true" "content-log-console-output-enabled=true" "level-name=$LEVEL" "transport=nethernet"; do
  k="${kv%%=*}"; grep -v "^$k=" "$DATA/server.properties" > "$DATA/sp.tmp" || true; mv "$DATA/sp.tmp" "$DATA/server.properties"; echo "$kv" >> "$DATA/server.properties"
done
docker rm -f dino-bds >/dev/null 2>&1 || true
docker run -d --name dino-bds -e EULA=TRUE -e VERSION="${BDS_VERSION:-LATEST}" -e LEVEL_NAME="$LEVEL" -v "$DATA:/data" itzg/minecraft-bedrock-server >/dev/null
echo "waiting for server start…"
for i in $(seq 1 180); do
  if docker logs dino-bds 2>&1 | grep -q "Server started"; then break; fi
  sleep 2
done
# exercise content at runtime: summon every entity, place every tree structure and feature
node -e '
const fs = require("fs");
const ents = fs.readdirSync("build/dinosaurs_BP/entities").map((f) => JSON.parse(fs.readFileSync("build/dinosaurs_BP/entities/" + f))["minecraft:entity"].description.identifier);
const structs = fs.readdirSync("build/dinosaurs_BP/structures/dino").map((f) => "dino:" + f.replace(".mcstructure", ""));
const feats = fs.readdirSync("build/dinosaurs_BP/features").filter((f) => f.includes("random") || f.includes("patch")).map((f) => "dino:" + f.replace(".json", ""));
const cmds = [];
ents.forEach((e, i) => cmds.push(`summon ${e} ${(i % 12) * 3} 120 ${Math.floor(i / 12) * 3}`));
structs.forEach((s, i) => cmds.push(`structure load ${s} ${(i % 4) * 10} 150 ${Math.floor(i / 4) * 10}`));
feats.forEach((f, i) => cmds.push(`place feature ${f} ${(i % 4) * 10} 100 ${Math.floor(i / 4) * 10}`));
fs.writeFileSync(".cache/bds/commands.txt", cmds.join("\n") + "\n");
'
docker exec dino-bds send-command "tickingarea add circle 16 0 16 3 smoke true" >/dev/null 2>&1 || true
# wait until the ticking area is loaded (a probe summon succeeds)
for i in $(seq 1 60); do
  sleep 3
  docker exec dino-bds send-command "summon minecraft:armor_stand 16 120 16" >/dev/null 2>&1 || true
  sleep 1
  if docker logs dino-bds 2>&1 | grep -q "Object successfully summoned"; then break; fi
done
while IFS= read -r cmd; do docker exec dino-bds send-command "$cmd" >/dev/null 2>&1 || true; done < "$DATA/commands.txt"
sleep "$RUN_FOR"
docker exec dino-bds send-command "kill @e[type=!player]" >/dev/null 2>&1 || true
sleep 3
docker logs dino-bds > "$DATA/server-output.log" 2>&1 || true
docker rm -f dino-bds >/dev/null
grep -q "Server started" "$DATA/server-output.log" || { echo "server did not start"; tail -50 "$DATA/server-output.log"; exit 2; }
# Content-log problems are tagged with a [Category]; plain command failures (probe summons
# before the area loaded, features that cannot be placed in mid-air) are expected noise.
cat "$DATA/server-output.log" "$DATA"/logs/*ContentLog* 2>/dev/null | grep -E "(ERROR|WARN)\] \[" | grep -v -i "telemetry" | sort -u > "$DATA/problems.log" || true
echo "== content log problems: $(wc -l < "$DATA/problems.log" | tr -d ' ')"
head -100 "$DATA/problems.log"
summoned=$(grep -c "Object successfully summoned" "$DATA/server-output.log" || true)
echo "== summoned: $summoned entities"
grep -q "\[dino\] scripts loaded" "$DATA/server-output.log" && echo "== scripts: loaded" || { echo "== scripts: NOT loaded"; exit 1; }
[ -s "$DATA/problems.log" ] && exit 1 || exit 0

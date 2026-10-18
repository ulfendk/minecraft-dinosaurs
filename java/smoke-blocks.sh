#!/usr/bin/env bash
# Server smoke test for blocks & worldgen: places every tree/plant/ore feature, grows saplings,
# checks the resulting blocks and fails on data-loading errors (loot, recipes, tags, worldgen).
set -u
cd "$(dirname "$0")"
J="$(pwd)"
LOG=$J/run/smoke-blocks.log
mkdir -p $J/run && echo "eula=true" > $J/run/eula.txt
printf 'online-mode=false\nlevel-type=minecraft\\:flat\nspawn-protection=0\nview-distance=4\nsimulation-distance=4\n' > $J/run/server.properties
rm -f $LOG; rm -rf $J/run/world
FIFO=$(mktemp -u); mkfifo $FIFO
( cd $J && ./gradlew --no-daemon runServer --args="nogui" < $FIFO > $LOG 2>&1 ) &
exec 3>$FIFO
for i in $(seq 1 240); do grep -q "Done (" $LOG 2>/dev/null && break; grep -q "BUILD FAILED\|Exception in thread" $LOG && break; sleep 2; done
cmd() { echo "$1" >&3; sleep 0.3; }
cmd "forceload add -64 -64 64 64"
sleep 3
trees="ginkgo araucaria dawn_redwood lepidodendron tree_fern"
plants="fern horsetail cycad club_moss williamsonia magnolia"
# 1) world generation features on the flat grass (surface at y=-61, air from -60)
x=-50
for t in $trees; do cmd "place feature dinosaurs:${t}_tree $x -60 -40"; x=$((x+20)); done
x=-50
for p in $plants; do cmd "place feature dinosaurs:$p $x -60 -10"; x=$((x+8)); done
cmd "place template dinosaurs:ginkgo_0 0 -60 30"
cmd "fill -10 -61 20 10 -40 45 minecraft:glass replace dinosaurs:ginkgo_log"
cmd "fill 42 -63 -12 66 -55 22 minecraft:stone"
cmd "place feature minecraft:ore_iron 54 -59 -8"
cmd "fill 56 -63 -12 66 -55 22 minecraft:deepslate"
cmd "place feature dinosaurs:amber_ore 52 -59 0"
cmd "place feature dinosaurs:amber_ore 61 -59 0"
cmd "place feature dinosaurs:fossil_block 50 -59 14"
for o in amber_ore deepslate_amber_ore fossil_block; do cmd "say ORE_COUNT $o"; cmd "fill 42 -63 -12 66 -55 22 minecraft:air replace dinosaurs:$o"; done
# 2) saplings grow with fast random ticks
x=-50
for t in $trees; do cmd "setblock $x -60 20 dinosaurs:${t}_sapling[stage=1]"; x=$((x+20)); done
cmd "gamerule minecraft:random_tick_speed 3000"
sleep 15
cmd "gamerule minecraft:random_tick_speed 3"
# 3) every block can be placed
x=-50
for b in $plants; do cmd "setblock $x -60 50 dinosaurs:$b"; x=$((x+2)); done
for t in $trees; do for s in log planks leaves; do cmd "setblock $x -60 50 dinosaurs:${t}_$s"; x=$((x+2)); done; done
for b in fossil_block amber_ore deepslate_amber_ore; do cmd "setblock $x -60 50 dinosaurs:$b"; x=$((x+2)); done
# 4) checks
x=-50
for t in $trees; do cmd "execute if block $x -60 -40 dinosaurs:${t}_log run say TREEGEN_OK ${t}"; x=$((x+20)); done
x=-50
for t in $trees; do cmd "execute if block $x -60 20 dinosaurs:${t}_log run say SAPLING_OK ${t}"; x=$((x+20)); done
cmd "execute if block -50 -60 -10 dinosaurs:fern run say PLANT_OK fern"
cmd "loot spawn 0 -59 0 loot dinosaurs:blocks/ginkgo_leaves"
cmd "loot spawn 0 -59 0 loot dinosaurs:blocks/amber_ore"
cmd "recipe give @a *"
# count logs per generated tree (diagnostic; replaces them with glass)
x=-50
for t in $trees; do cmd "fill $((x-8)) -61 -48 $((x+8)) -40 -32 minecraft:glass replace dinosaurs:${t}_log"; cmd "fill $((x-8)) -61 -48 $((x+8)) -40 -32 minecraft:glass replace dinosaurs:${t}_leaves"; x=$((x+20)); done
sleep 3
cmd "stop"
exec 3>&-
wait
rm -f $FIFO
echo "== tree features: $(grep -c 'TREEGEN_OK' $LOG)/5   saplings grown: $(grep -c 'SAPLING_OK' $LOG)/5   plant: $(grep -c 'PLANT_OK' $LOG)/1"
grep -A2 "ORE_COUNT" $LOG | grep -o "ORE_COUNT.*\\|filled [0-9]* block(s)\\|No blocks were filled"
grep -n "ERROR\|Exception\|Couldn't\|Failed to\|Unknown\|Caused by\|dinosaurs.*WARN\|WARN.*dinosaurs" $LOG | grep -v "No key layers" | head -40

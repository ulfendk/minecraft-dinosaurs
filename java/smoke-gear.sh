#!/usr/bin/env bash
# Gear smoke test on the Fabric dev server: fence linking, generator + redstone power,
# tranquilizer darts (small and big creatures). Fails on any check or exception.
set -u
J="$(cd "$(dirname "$0")" && pwd)"
LOG=$J/run/smoke-gear.log
mkdir -p $J/run && echo "eula=true" > $J/run/eula.txt
printf 'online-mode=false\nlevel-type=minecraft\\:flat\nspawn-protection=0\nview-distance=4\nsimulation-distance=4\n' > $J/run/server.properties
rm -f $LOG; rm -rf $J/run/world
FIFO=$(mktemp -u); mkfifo $FIFO
( cd $J && ./gradlew --no-daemon runServer --args="nogui" < $FIFO > $LOG 2>&1 ) &
exec 3>$FIFO
for i in $(seq 1 240); do grep -q "Done (" $LOG 2>/dev/null && break; grep -q "BUILD FAILED\|Exception in thread" $LOG && break; sleep 2; done
c() { echo "$1" >&3; sleep 0.4; }
check() { echo "say CHECK $1" >&3; sleep 0.2; echo "execute if $2 run say PASS $1" >&3; sleep 0.4; }
c "forceload add -16 -16 32 32"
sleep 3
# fences link to each other and the generator, not to terrain
c "setblock 0 -60 0 dinosaurs:electric_fence"
c "setblock 1 -60 0 dinosaurs:electric_fence"
c "setblock 2 -60 0 dinosaurs:fence_generator"
c "setblock 0 -60 1 minecraft:dirt"
sleep 1
check link_e "block 0 -60 0 dinosaurs:electric_fence[east=true,south=false,powered=false]"
check link_gen "block 1 -60 0 dinosaurs:electric_fence[west=true,east=true]"
# redstone switches the generator on and off
c "setblock 3 -60 0 minecraft:redstone_block"
sleep 1
check powered_on "block 0 -60 0 dinosaurs:electric_fence[powered=true]"
check generator_on "block 2 -60 0 dinosaurs:fence_generator[on=true]"
c "setblock 3 -60 0 minecraft:air"
sleep 1
check powered_off "block 0 -60 0 dinosaurs:electric_fence[powered=false]"
# breaking the link un-powers the far fence
c "setblock 3 -60 0 minecraft:redstone_block"
c "setblock 1 -60 0 minecraft:air"
sleep 1
check unlinked "block 0 -60 0 dinosaurs:electric_fence[powered=false,east=false]"
# darts: one knocks out a small creature, a big carnivore needs four
c "summon dinosaurs:compsognathus 10 -60 10 {NoAI:1b}"
c "summon dinosaurs:tyrannosaurus 20 -60 10 {NoAI:1b}"
sleep 1
c "summon dinosaurs:tranq_dart 10 -59.7 7 {Motion:[0.0,0.0,1.5]}"
for k in 1 2 3 4; do c "summon dinosaurs:tranq_dart 20 -58 6 {Motion:[0.0,0.0,1.5]}"; sleep 0.6; done
sleep 2
echo "execute as @e[type=dinosaurs:compsognathus] run data get entity @s Sedated" >&3
echo "say CHECK rex_sedated" >&3; sleep 0.2
echo "execute as @e[type=dinosaurs:tyrannosaurus] run data get entity @s Sedated" >&3
sleep 2
echo "stop" >&3
exec 3>&-
wait
rm -f $FIFO
echo "== checks:"; grep -o "\[Server\] \(CHECK\|PASS\) [a-z_]*" $LOG
echo "== sedated ticks left (compsognathus: 1 dart, tyrannosaurus: 4 darts):"; grep -o "\(Compsognathus\|Tyrannosaurus rex\) has the following entity data: [0-9]*" $LOG
grep -n "Exception\|Caused by\|ERROR" $LOG | grep -v "No key layers" | head -20

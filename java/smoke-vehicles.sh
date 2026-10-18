#!/usr/bin/env bash
# Starts the Fabric dev server, summons every vehicle, lets them tick and checks for errors.
set -u
J="$(cd "$(dirname "$0")" && pwd)"
cd "$J"
LOG=$J/run/smoke-vehicles.log
mkdir -p $J/run && echo "eula=true" > $J/run/eula.txt
printf 'online-mode=false\nlevel-type=minecraft\\:flat\nspawn-protection=0\nview-distance=4\nsimulation-distance=4\n' > $J/run/server.properties
rm -f $LOG; rm -rf $J/run/world
FIFO=$(mktemp -u); mkfifo $FIFO
( cd $J && ./gradlew --no-daemon runServer --args="nogui" < $FIFO > $LOG 2>&1 ) &
exec 3>$FIFO
for i in $(seq 1 240); do grep -q "Done (" $LOG 2>/dev/null && break; grep -q "BUILD FAILED\|Exception in thread" $LOG && break; sleep 2; done
ids=$(python3 -c "import json;print(' '.join(c['id'] for c in json.load(open('$J/src/generated/resources/dinosaurs/vehicles.json'))))")
echo "forceload add -16 -16 32 16" >&3; sleep 3
i=0; for id in $ids; do echo "summon dinosaurs:$id $(( i*6 )) -60 0" >&3; i=$((i+1)); sleep 0.2; done
sleep 15
# vehicles ignore non-player damage, survive /damage from mobs, and /kill removes them
echo "damage @e[type=dinosaurs:safari_truck,limit=1] 50 minecraft:generic" >&3
sleep 2
echo "execute as @e[type=dinosaurs:safari_truck] run data get entity @s Health" >&3
echo "kill @e[type=dinosaurs:tour_car]" >&3
sleep 2
echo "execute if entity @e[type=dinosaurs:tour_car] run say TOUR_CAR_STILL_HERE" >&3
echo "list" >&3
sleep 3
echo "stop" >&3
exec 3>&-
wait
rm -f $FIFO
echo "== summoned: $(grep -c 'Summoned new' $LOG)"
grep -n "Health\|TOUR_CAR_STILL_HERE" $LOG | head -5
grep -n "ERROR\|Exception\|WARN.*dinosaurs\|Caused by" $LOG | grep -v "No key layers" | head -30

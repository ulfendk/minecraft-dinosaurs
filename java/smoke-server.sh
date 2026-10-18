#!/usr/bin/env bash
# Starts the Fabric dev server, summons every creature + egg, places eggs, then stops.
set -u
cd "$(dirname "$0")"
J="$(cd "$(dirname "$0")" && pwd)"
LOG=$J/run/smoke.log
mkdir -p $J/run && echo "eula=true" > $J/run/eula.txt
printf 'online-mode=false\nlevel-type=minecraft\\:flat\nspawn-protection=0\nview-distance=4\nsimulation-distance=4\n' > $J/run/server.properties
rm -f $LOG; rm -rf $J/run/world
FIFO=$(mktemp -u); mkfifo $FIFO
( cd $J && ./gradlew --no-daemon runServer --args="nogui" < $FIFO > $LOG 2>&1 ) &
exec 3>$FIFO
for i in $(seq 1 240); do grep -q "Done (" $LOG 2>/dev/null && break; grep -q "BUILD FAILED\|Exception in thread" $LOG && break; sleep 2; done
ids=$(python3 -c "import json;print(' '.join(c['id'] for c in json.load(open('$J/src/generated/resources/dinosaurs/creatures.json'))))")
i=0; for id in $ids; do echo "summon dinosaurs:$id $(( (i%10)*6 )) -60 $(( i/10*6 ))" >&3; i=$((i+1)); sleep 0.1; done
echo "summon dinosaurs:egg 0 -60 70" >&3
sleep 20
echo "execute as @e[type=dinosaurs:tyrannosaurus] run data get entity @s Health" >&3
echo "list" >&3
sleep 3
echo "stop" >&3
exec 3>&-
wait
rm -f $FIFO
summoned=$(grep -c 'Summoned new' $LOG || true)
expected=$(( $(echo $ids | wc -w) + 1 ))
echo "== summoned: $summoned / $expected"
problems=$(grep -n "Exception\|Caused by\|ERROR.*dinosaurs\|WARN.*dinosaurs" $LOG | grep -v "No key layers" || true)
[ -n "$problems" ] && { echo "$problems" | head -30; exit 1; }
grep -q "Done (" $LOG || { echo "server did not start"; tail -40 $LOG; exit 1; }
[ "$summoned" -ge "$expected" ] || { echo "not every entity could be summoned"; exit 1; }
echo "== java server smoke test passed"

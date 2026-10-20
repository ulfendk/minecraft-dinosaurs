// Generates the GitHub Pages site into site/ (English) and site/da/ (Danish):
// mod info, latest release download, install guide and a rendered catalogue of
// every creature, plant and vehicle.
//   SITE_VERSION=v1.2.3 npx tsx tools/site/build-site.ts
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { assemble } from '../../src/creatures/assemble.js';
import { CREATURES } from '../../src/data/registry.js';
import { PLANTS, TREES } from '../../src/data/plants.js';
import { VEHICLES } from '../../src/data/park.js';
import { DA_INFO, DA_NAMES, DA_PLANT_INFO, DA_TERMS } from '../../src/data/i18n/da.js';
import { BIOME_LABELS, HABITATS, habitatOf, livesIn } from '../../src/data/habitats.js';
import { MIN_ENGINE } from '../../src/emit/bedrock/constants.js';
import { buildItems } from '../../src/emit/bedrock/items.js';
import { GEAR_ICONS } from '../../src/emit/bedrock/gear.js';
import { vehicleAssets } from '../../src/emit/bedrock/vehicles.js';
import { buildBlocks } from '../../src/emit/bedrock/blocks.js';
import { toGeoJson } from '../../src/model/geo.js';
import { upscale } from '../../src/texture/pixelart.js';
import { collectTris, renderView } from '../preview/render.js';

const REPO = process.env.GITHUB_REPOSITORY ?? 'ulfendk/minecraft-dinosaurs';
const VERSION = (process.env.SITE_VERSION ?? '').replace(/^v/, '');
const OUT = path.resolve('site');
const IMG = path.join(OUT, 'img');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(IMG, { recursive: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const transparentBg = (p: PNG, bg = [236, 240, 232]) => {
  for (let i = 0; i < p.data.length; i += 4) if (p.data[i] === bg[0] && p.data[i + 1] === bg[1] && p.data[i + 2] === bg[2]) p.data[i + 3] = 0;
  return p;
};
const save = (name: string, p: PNG) => fs.writeFileSync(path.join(IMG, name), PNG.sync.write(p));

// ---------------------------------------------------------------- images (shared by all languages)
for (const def of CREATURES) {
  const x = assemble(def);
  const bones = toGeoJson(x.model, 'g')['minecraft:geometry'][0].bones as any;
  save(`${def.id}.png`, transparentBg(renderView(collectTris(bones, {}, ['saddle']), x.texture, { yaw: 35, pitch: 16 }, 320)));
}
for (const v of VEHICLES) {
  const { model, texture } = vehicleAssets(v);
  const bones = toGeoJson(model, 'g')['minecraft:geometry'][0].bones as any;
  save(`${v.id}.png`, transparentBg(renderView(collectTris(bones), texture, { yaw: 35, pitch: 20 }, 320)));
}
for (const [id, icon] of buildItems([]).map((i) => [i.id, i.icon] as const)) save(`item_${id}.png`, upscale(icon, 4));
const blockTex = new Map(buildBlocks().flatMap((b) => Object.entries(b.textures)));
for (const p of PLANTS) save(`plant_${p.id}.png`, upscale(blockTex.get(`dino_${p.id}`)!, 4));
for (const t of TREES) save(`tree_${t.id}.png`, upscale(blockTex.get(`dino_${t.id}_sapling`)!, 4));
save('fence.png', upscale(blockTex.get('dino_electric_fence_on')!, 4));
save('generator.png', upscale(blockTex.get('dino_generator_side_on')!, 4));
fs.copyFileSync(path.resolve('packs/static/pack_icon.png'), path.join(IMG, 'icon.png'));
for (const [id, f] of Object.entries(GEAR_ICONS)) save(`gear_${id}.png`, upscale(f(), 4));

// ---------------------------------------------------------------- text

type Lang = 'en' | 'da';
const count = CREATURES.length;
const dinoCount = CREATURES.filter((c) => ['theropod', 'bird', 'sauropod', 'ornithopod', 'ceratopsian', 'thyreophoran'].includes(c.group)).length;
const others = count - dinoCount;
const latest = `https://github.com/${REPO}/releases/latest`;
const direct = VERSION ? `https://github.com/${REPO}/releases/download/v${VERSION}/prehistoric-dinosaurs-${VERSION}.mcaddon` : latest;
const javaJar = VERSION ? `https://github.com/${REPO}/releases/download/v${VERSION}/prehistoric-dinosaurs-fabric-${VERSION}%2B26.3.jar` : latest;
const minVersion = MIN_ENGINE.join('.');
const file = `prehistoric-dinosaurs-${VERSION || '&lt;version&gt;'}.mcaddon`;

const T = {
  en: {
    title: 'Prehistoric Dinosaurs',
    description: `A Minecraft Bedrock add-on with ${dinoCount} dinosaurs, ${others} more prehistoric creatures, ancient plants, a prehistoric biome, electric fences and safari vehicles.`,
    intro: `A Minecraft mod for Bedrock and Java with <b>${dinoCount} dinosaurs</b> and <b>${others} more prehistoric creatures</b>: megalodon, mosasaurus, pterosaurs, Titanoboa and others. It also has ancient plants, a Prehistoric Jungle biome, tameable and rideable dinosaurs, electric fences and safari vehicles.`,
    download: (v: string) => `iPad, phone, console & Windows: Bedrock ${v ? `v${v}` : ''}`,
    javaDownload: (v: string) => `Mac & PC Java Edition ${v ? `v${v}` : ''}`,
    which: '<b>Which one do I need?</b> Playing on an <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch or Minecraft for Windows? That is <b>Bedrock Edition</b> – take the first download. Playing on a computer with the Minecraft <b>Java Edition</b> launcher (Mac, Windows or Linux)? Take the Java download. Not sure? If you bought Minecraft in the App Store or Google Play, it is Bedrock.',
    allReleases: 'All releases',
    source: 'Source on GitHub',
    version: (v: string) => (v ? `Latest version: <b>v${v}</b> · ` : ''),
    requires: `Bedrock ${minVersion}+ · Java 26.3 with Fabric, Fabric API and GeckoLib`,
    features: 'Features',
    feats: [
      [`${count} creatures`, 'Each creature has its own model, texture and animations: walking, swimming, flying, attacking and lying down.'],
      ['Tame and ride', 'Tame creatures with their favourite food, or hatch apex predators from eggs. Saddle them to ride on land, through the air or underwater.'],
      ['Prehistoric Jungle', 'A new biome full of ginkgo, monkey-puzzle, dawn redwood, scale trees and tree ferns. Without experiments, the plants and creatures appear in vanilla biomes instead.'],
      ['Park gear', 'Electric fences shock anything that touches them once a generator powers them, and big carnivores smash through fences with no power. Drive a safari truck, a tour car or a gyrosphere, and keep animals in check with an electric prod or a tranquilizer rifle.'],
      ['Fossils and amber', 'Mine fossil blocks and amber ore, and look for the rare mosquito in amber.'],
      ['Field guide', 'An in-game book with facts about every species and how to tame and ride it.'],
      ['Realistic Hunting', 'Install Realistic Hunting as well and every creature is game, with organs in its own model, a shot report and a trophy. A T. rex takes a .338.'],
    ],
    install: 'Install on iPad, phone, console or Windows (Bedrock)',
    steps: [
      `Download <a href="${direct}"><code>${file}</code></a> from the latest release.`,
      'Open the file. On Windows, mobile and consoles with file access, Minecraft imports both packs automatically. On other platforms, unzip it and copy <code>dinosaurs_BP</code> and <code>dinosaurs_RP</code> into <code>behavior_packs</code> and <code>resource_packs</code>.',
      'Create or edit a world. Under <b>Behavior Packs</b>, activate <i>Prehistoric Dinosaurs BP</i> (the resource pack is added automatically).',
      'Optional: turn on the <b>Custom Biomes</b> experiment to get the Prehistoric Jungle biome. Everything else works without experiments.',
      'Your first time in the world, you get a <b>Dino Field Guide</b>.',
      `<b>Java Edition:</b> install <a href="https://fabricmc.net/use/">Fabric Loader</a> for Minecraft 26.3, plus <a href="https://modrinth.com/mod/fabric-api">Fabric API</a> and <a href="https://modrinth.com/mod/geckolib">GeckoLib</a>. Then put <a href="${javaJar}"><code>prehistoric-dinosaurs-fabric-${VERSION || '&lt;version&gt;'}+26.3.jar</code></a> in your <code>mods</code> folder. The Prehistoric Jungle biome is Bedrock-only; on Java, the plants and creatures appear in vanilla biomes.`,
    ],
    upgrade: 'Upgrading to a new version',
    upSteps: [
      '<b>Download the new version</b> and open the file. A newer version replaces the one you have, and your worlds use it the next time you load them.',
      '<b>Still running the old version?</b> (or Minecraft says it is already installed): go to <i>Settings → Storage</i>, delete Prehistoric Dinosaurs under both <i>Resource Packs</i> and <i>Behavior Packs</i>, then open the new file again.',
      '<b>Check the world:</b> in the world\'s <i>Edit</i> screen, under <i>Behavior Packs</i> and <i>Resource Packs</i>, make sure Prehistoric Dinosaurs is active. A world you imported or downloaded can carry its own old copy: deactivate it there, save, and activate the new one.',
    ],
    upServer: 'On a server, replace the add-on\'s folders in <code>behavior_packs</code> and <code>resource_packs</code> with the new ones and restart it.',
    upJava: '<b>Java Edition:</b> delete the old Prehistoric Dinosaurs jar from your <code>mods</code> folder and put the new one in its place. Keep only one version in the folder. If the new version needs a newer Fabric API or GeckoLib, update those too.',
    tameEgg: 'Tame from egg',
    livesIn: 'Lives in:',
    byHabitat: 'Creatures by habitat',
    filterLabel: 'Filter creatures',
    all: 'All',
    tameable: 'Tameable',
    rideable: 'Rideable',
    land: 'land',
    air: 'air',
    water: 'water',
    seats: (n: number) => `${n} seats`,
    plants: 'Ancient plants and trees',
    park: 'Park gear',
    fence: ['Electric Fence', 'Links up with its neighbours like a vanilla fence and is 1.5 blocks tall. When powered, it shocks whatever touches it.'],
    generator: ['Fence Generator', 'Right-click it or give it a redstone signal to power every fence connected to it.'],
    amber: ['Mosquito in Amber', 'A rare find in amber ore.'],
    guide: ['Dino Field Guide', 'Facts plus taming and riding tips for every species.'],
    prod: ['Electric Prod', 'Shocks, slows and pushes back whatever you hit.'],
    rifle: ['Tranquilizer Rifle', 'Fires tranquilizer darts. One dart knocks out a small animal; big herbivores need 3 darts and big carnivores 4.'],
    footer: 'Prehistoric Dinosaurs is an open-source fan project, not affiliated with Mojang or Microsoft. All models and textures are generated from code in the repository.',
    sourceCode: 'Source code',
    licence: 'MIT licence',
    m: 'm',
  },
  da: {
    title: 'Forhistoriske Dinosaurer',
    description: `En Minecraft Bedrock-tilføjelse med ${dinoCount} dinosaurer, ${others} andre forhistoriske dyr, oldtidsplanter, et forhistorisk biom, elektriske hegn og safarikøretøjer.`,
    intro: `En Minecraft-mod til Bedrock og Java med <b>${dinoCount} dinosaurer</b> og <b>${others} andre forhistoriske dyr</b>: megalodon, mosasaurus, flyveøgler, Titanoboa og flere. Den har også oldtidsplanter, et forhistorisk junglebiom, dinosaurer du kan tæmme og ride på, elektriske hegn og safarikøretøjer.`,
    download: (v: string) => `iPad, telefon, konsol & Windows: Bedrock ${v ? `v${v}` : ''}`,
    javaDownload: (v: string) => `Mac & PC Java Edition ${v ? `v${v}` : ''}`,
    which: '<b>Hvilken skal jeg bruge?</b> Spiller du på <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch eller Minecraft til Windows? Så er det <b>Bedrock Edition</b> – tag den første download. Spiller du på en computer med Minecraft <b>Java Edition</b>-launcheren (Mac, Windows eller Linux)? Så tag Java-downloaden. I tvivl? Hvis Minecraft er købt i App Store eller Google Play, er det Bedrock.',
    allReleases: 'Alle udgivelser',
    source: 'Kildekode på GitHub',
    version: (v: string) => (v ? `Nyeste version: <b>v${v}</b> · ` : ''),
    requires: `Bedrock ${minVersion}+ · Java 26.3 med Fabric, Fabric API og GeckoLib`,
    features: 'Indhold',
    feats: [
      [`${count} dyr`, 'Hvert dyr har sin egen model, tekstur og animationer: gang, svømning, flyvning, angreb og hvile.'],
      ['Tæm og rid', 'Tæm dyrene med deres yndlingsføde, eller klæk toprovdyr fra æg. Sæt en sadel på og rid over land, gennem luften eller under vandet.'],
      ['Forhistorisk jungle', 'Et nyt biom fuld af tempeltræer, abeskræk, vandgran, skæltræer og træbregner. Uden eksperimenter dukker planterne og dyrene op i de almindelige biomer i stedet.'],
      ['Parkudstyr', 'Elektriske hegn giver stød til alt, der rører dem, når en generator forsyner dem med strøm, og store kødædere smadrer hegn uden strøm. Kør i safarivogn, turbil eller gyrosfære, og hold dyrene i skak med en elektrisk stav eller et bedøvelsesgevær.'],
      ['Fossiler og rav', 'Bryd fossilblokke og ravmalm, og led efter den sjældne myg i rav.'],
      ['Felthåndbog', 'En bog i spillet med fakta om alle arter, og hvordan du tæmmer og rider på dem.'],
      ['Realistisk jagt', 'Installér også Realistisk jagt, så er alle dyr vildt med organer i deres egen model, skudrapport og trofæ. En T. rex kræver en .338.'],
    ],
    install: 'Installation på iPad, telefon, konsol eller Windows (Bedrock)',
    steps: [
      `Hent <a href="${direct}"><code>${file}</code></a> fra den nyeste udgivelse.`,
      'Åbn filen. På Windows, mobil og konsoller med filadgang importerer Minecraft begge pakker automatisk. På andre platforme skal du pakke den ud og kopiere <code>dinosaurs_BP</code> og <code>dinosaurs_RP</code> til <code>behavior_packs</code> og <code>resource_packs</code>.',
      'Opret eller rediger en verden. Under <b>Adfærdspakker</b> (Behavior Packs) aktiverer du <i>Prehistoric Dinosaurs BP</i> (ressourcepakken tilføjes automatisk).',
      'Valgfrit: slå eksperimentet <b>Custom Biomes</b> til for at få det forhistoriske junglebiom. Alt andet virker uden eksperimenter.',
      'Første gang du er i verdenen, får du en <b>Dino Field Guide</b> (felthåndbog).',
      `<b>Java Edition:</b> installér <a href="https://fabricmc.net/use/">Fabric Loader</a> til Minecraft 26.3 samt <a href="https://modrinth.com/mod/fabric-api">Fabric API</a> og <a href="https://modrinth.com/mod/geckolib">GeckoLib</a>. Læg derefter <a href="${javaJar}"><code>prehistoric-dinosaurs-fabric-${VERSION || '&lt;version&gt;'}+26.3.jar</code></a> i din <code>mods</code>-mappe. Det forhistoriske junglebiom findes kun på Bedrock; på Java dukker planterne og dyrene op i de almindelige biomer.`,
    ],
    upgrade: 'Opdatering til en ny version',
    upSteps: [
      '<b>Hent den nye version</b>, og åbn filen. En nyere version erstatter den, du har, og dine verdener bruger den, næste gang du åbner dem.',
      '<b>Kører den gamle version stadig?</b> (eller siger Minecraft, at den allerede er installeret): Gå til <i>Indstillinger → Lagerplads</i>, slet Forhistoriske Dinosaurer (<i>Prehistoric Dinosaurs</i>) under både <i>Ressourcepakker</i> og <i>Adfærdspakker</i>, og åbn så den nye fil igen.',
      '<b>Tjek verdenen:</b> Sørg for, at Forhistoriske Dinosaurer er slået til under <i>Adfærdspakker</i> og <i>Ressourcepakker</i>, når du redigerer verdenen. En verden, du har importeret eller hentet, kan have sin egen gamle kopi med: Slå den fra dér, gem, og slå den nye til.',
    ],
    upServer: 'På en server skal du erstatte tilføjelsens mapper i <code>behavior_packs</code> og <code>resource_packs</code> med de nye og genstarte den.',
    upJava: '<b>Java Edition:</b> Slet den gamle Forhistoriske Dinosaurer-jar fra din <code>mods</code>-mappe, og læg den nye i stedet. Hav kun én version i mappen. Kræver den nye version en nyere Fabric API eller GeckoLib, så opdatér dem også.',
    tameEgg: 'Tæmmes fra æg',
    livesIn: 'Lever i:',
    byHabitat: 'Dyrene efter levested',
    filterLabel: 'Filtrér dyr',
    all: 'Alle',
    tameable: 'Kan tæmmes',
    rideable: 'Kan rides',
    land: 'land',
    air: 'luft',
    water: 'vand',
    seats: (n: number) => `${n} sæder`,
    plants: 'Oldtidsplanter og træer',
    park: 'Parkudstyr',
    fence: ['Elektrisk hegn', 'Forbinder sig med naboerne som et almindeligt hegn og er 1,5 blok højt. Når der er strøm på, giver det stød til alt, der rører det.'],
    generator: ['Hegnsgenerator', 'Højreklik på den eller giv den et redstone-signal for at sætte strøm til alle hegn, der er forbundet med den.'],
    amber: ['Myg i rav', 'Et sjældent fund i ravmalm.'],
    guide: ['Dino-felthåndbog', 'Fakta samt tips til at tæmme og ride på alle arter.'],
    prod: ['Elektrisk stav', 'Giver stød, gør langsom og skubber det, du rammer, tilbage.'],
    rifle: ['Bedøvelsesgevær', 'Skyder bedøvelsespile. Én pil bedøver et lille dyr; store planteædere kræver 3 pile og store kødædere 4.'],
    footer: 'Forhistoriske Dinosaurer er et open source-fanprojekt uden tilknytning til Mojang eller Microsoft. Alle modeller og teksturer er genereret af kode i repositoriet.',
    sourceCode: 'Kildekode',
    licence: 'MIT-licens',
    m: 'm',
  },
} as const;

const term = (lang: Lang, s: string) => (lang === 'da' ? (DA_TERMS[s] ?? s) : s);
const info = (lang: Lang, id: string, en: string) => (lang === 'da' ? (DA_INFO[id] ?? DA_PLANT_INFO[id] ?? en) : en);
const name = (lang: Lang, id: string, en: string) => (lang === 'da' ? (DA_NAMES[id] ?? en) : en);
const num = (lang: Lang, n: number) => (lang === 'da' ? String(n).replace('.', ',') : String(n));

function page(lang: Lang) {
  const t = T[lang];
  const pre = lang === 'en' ? '' : '../';
  const img = (f: string) => `${pre}img/${f}`;
  const cards: Record<string, string[]> = {};
  for (const def of CREATURES) {
    const ride = def.ride ? `${t.rideable} · ${def.ride.mode === 'ground' ? t.land : def.ride.mode === 'fly' ? t.air : t.water}${def.ride.seats > 1 ? ` · ${t.seats(def.ride.seats)}` : ''}` : '';
    const badges = [
      def.tame === 'egg' ? `<span class="b egg">${t.tameEgg}</span>` : def.tame ? `<span class="b tame">${t.tameable}</span>` : '',
      ride ? `<span class="b ride">${ride}</span>` : '',
      `<span class="b ${def.temperament}">${term(lang, def.temperament)}</span>`,
    ].join('');
    const where = livesIn(def).map((b) => BIOME_LABELS[b][lang]).join(' · ');
    (cards[habitatOf(def)] ??= []).push(
      `<article class="card"${def.ride ? ' data-ride="1"' : ''}><img loading="lazy" src="${img(`${def.id}.png`)}" alt="${esc(def.name)}" width="320" height="320"><div><h3>${esc(def.name)}</h3><p class="meta">${term(lang, def.period)} · ${num(lang, def.lengthM)} ${t.m} · ${term(lang, def.diet)}</p><p class="where">${t.livesIn} ${esc(where)}</p><p>${esc(info(lang, def.id, def.info))}</p><p class="badges">${badges}</p></div></article>`,
    );
  }
  const sections = HABITATS.filter((h) => cards[h.id])
    .map((h) => `<section class="group" data-habitat="${h.id}"><h2>${esc(h[lang])} <small>${cards[h.id].length}</small></h2><div class="grid">${cards[h.id].join('')}</div></section>`)
    .join('\n');
  const filters = `<div class="filters" role="group" aria-label="${t.filterLabel}"><button aria-pressed="true" data-filter="all">${t.all}</button>${HABITATS.filter((h) => cards[h.id]).map((h) => `<button aria-pressed="false" data-filter="${h.id}">${esc(h[lang])}</button>`).join('')}<button aria-pressed="false" data-filter="ride">${t.rideable}</button></div>`;
  const small = (image: string, title: string, text: string) => `<article class="mini"><img loading="lazy" src="${img(image)}" alt="" width="64" height="64"><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></article>`;
  const other = lang === 'en' ? { href: 'da/', label: 'Dansk', hreflang: 'da' } : { href: '../', label: 'English', hreflang: 'en' };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${esc(t.description)}">
<link rel="icon" href="${img('icon.png')}">
<link rel="alternate" hreflang="en" href="${lang === 'en' ? './' : '../'}">
<link rel="alternate" hreflang="da" href="${lang === 'en' ? 'da/' : './'}">
<style>
:root{--bg:#f4f1e8;--panel:#fffdf7;--ink:#24301f;--muted:#5e6b55;--accent:#3f6b2f;--accent2:#c9822b;--line:#d9d3c2;--chip:#ece6d3}
@media (prefers-color-scheme:dark){:root{--bg:#141a12;--panel:#1d251a;--ink:#e9eadf;--muted:#a3ad98;--accent:#8cc46a;--accent2:#e6a64d;--line:#2f3a2a;--chip:#26301f}}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
a{color:var(--accent)}header{background:linear-gradient(160deg,#20321a,#3f6b2f 60%,#6b8f3a);color:#f6f3e6;padding:48px 16px 40px;position:relative}
.lang{position:absolute;top:14px;right:16px;color:#f6f3e6;font-size:.9rem;border:1px solid #f6f3e666;padding:4px 10px;border-radius:999px;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}header .wrap{display:flex;gap:28px;align-items:center;flex-wrap:wrap}
header img{width:112px;height:112px;image-rendering:pixelated;border-radius:18px;box-shadow:0 8px 24px #0006}
h1{font-size:clamp(2rem,5vw,3.2rem);margin:0 0 6px;letter-spacing:-.02em}header p{margin:0;max-width:720px;color:#e3e8d6}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}.btn{display:inline-block;padding:12px 18px;border-radius:10px;font-weight:650;text-decoration:none}
.btn.primary{background:#f2c14a;color:#2a2410}.btn.java{background:#e9e4d2;color:#2a2410}.which{margin-top:14px;background:#0003;border:1px solid #f6f3e655;border-radius:10px;padding:10px 14px;max-width:760px}.btn.ghost{border:1px solid #f6f3e688;color:#f6f3e6}.ver{font-size:.9rem;color:#d8e2c6;margin-top:10px}
main section{padding:28px 0;border-bottom:1px solid var(--line)}h2{font-size:1.5rem;margin:0 0 16px}h2 small{font-size:.9rem;color:var(--muted);font-weight:500}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.feature{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px}
.feature h3{margin:0 0 6px;font-size:1.05rem}.feature p{margin:0;color:var(--muted)}
ol.steps{padding-left:20px}ol.steps li{margin:6px 0}code{background:var(--chip);padding:1px 6px;border-radius:5px;overflow-wrap:anywhere}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.card img{width:100%;height:auto;aspect-ratio:1;background:radial-gradient(circle at 50% 60%,#dfe8cf,#cad7b4);image-rendering:pixelated}
@media (prefers-color-scheme:dark){.card img{background:radial-gradient(circle at 50% 60%,#33412c,#232c1f)}}
.card div{padding:12px 14px 14px}.card h3{margin:0;font-size:1.05rem}.meta{margin:2px 0 6px;color:var(--muted);font-size:.85rem;text-transform:capitalize}
.card p{margin:0 0 8px;font-size:.92rem}.badges{display:flex;flex-wrap:wrap;gap:6px;margin:0}
.b{font-size:.75rem;padding:2px 8px;border-radius:999px;background:var(--chip);text-transform:capitalize}.b.ride{background:#f2c14a33}.b.tame{background:#8cc46a33}.b.egg{background:#e6a64d33}.b.aggressive{background:#d0413a33}
.minis{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}.mini{display:flex;gap:12px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px}
.mini img{width:64px;height:64px;image-rendering:pixelated;flex:none}.mini h3{margin:0;font-size:1rem}.mini p{margin:2px 0 0;font-size:.9rem;color:var(--muted)}
.vehicles{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.vehicles .card img{background:radial-gradient(circle at 50% 60%,#e7e2d2,#d2ccb8)}
footer{padding:28px 0 48px;color:var(--muted);font-size:.9rem}
.where{margin:0 0 6px;font-size:.85rem;color:var(--accent)}
.filters{display:flex;flex-wrap:wrap;gap:8px}.filters button{font:inherit;font-size:.9rem;border:1px solid var(--line);background:var(--panel);color:var(--ink);padding:6px 14px;border-radius:999px;cursor:pointer}.filters button[aria-pressed="true"]{background:var(--accent);color:var(--bg);border-color:var(--accent)}
#creatures{border-bottom:none;padding-bottom:0}
</style>
</head>
<body>
<header><a class="lang" href="${other.href}" hreflang="${other.hreflang}" lang="${other.hreflang}">${other.label}</a><div class="wrap"><img src="${img('icon.png')}" alt=""><div>
<h1>${t.title}</h1>
<p>${t.intro}</p>
<div class="cta"><a class="btn primary" href="${direct}">${t.download(VERSION)}</a><a class="btn java" href="${javaJar}">${t.javaDownload(VERSION)}</a><a class="btn ghost" href="${latest}">${t.allReleases}</a><a class="btn ghost" href="https://github.com/${REPO}">${t.source}</a></div>
<p class="which">${t.which}</p>
<p class="ver">${t.version(VERSION)}${t.requires}</p>
</div></div></header>
<main class="wrap">
<section><h2>${t.features}</h2><div class="features">
${t.feats.map(([h, p]) => `<div class="feature"><h3>${h}</h3><p>${p}</p></div>`).join('\n')}
</div></section>
<section id="install"><h2>${t.install}</h2><ol class="steps">
${t.steps.map((s) => `<li>${s}</li>`).join('\n')}
</ol></section>
<section id="upgrade"><h2>${t.upgrade}</h2><ol class="steps">
${t.upSteps.map((s) => `<li>${s}</li>`).join('\n')}
</ol><p>${t.upServer}</p><p>${t.upJava}</p></section>
<section id="creatures"><h2>${t.byHabitat}</h2>${filters}</section>
${sections}
<section><h2>${t.plants}</h2><div class="minis">${PLANTS.map((p) => small(`plant_${p.id}.png`, name(lang, p.id, p.name), info(lang, p.id, p.info))).join('')}${TREES.map((tr) => small(`tree_${tr.id}.png`, name(lang, tr.id, tr.name), info(lang, tr.id, tr.info))).join('')}</div></section>
<section><h2>${t.park}</h2><div class="vehicles">${VEHICLES.map((v) => `<article class="card"><img loading="lazy" src="${img(`${v.id}.png`)}" alt="${esc(name(lang, v.id, v.name))}" width="320" height="320"><div><h3>${esc(name(lang, v.id, v.name))}</h3><p>${esc(info(lang, v.id, v.info))}</p></div></article>`).join('')}</div>
<div class="minis" style="margin-top:14px">${small('fence.png', t.fence[0], t.fence[1])}${small('generator.png', t.generator[0], t.generator[1])}${small('item_amber_mosquito.png', t.amber[0], t.amber[1])}${small('item_field_guide.png', t.guide[0], t.guide[1])}${small('gear_electric_prod.png', t.prod[0], t.prod[1])}${small('gear_tranquilizer_rifle.png', t.rifle[0], t.rifle[1])}</div></section>
</main>
<footer class="wrap">${t.footer} <a href="https://github.com/${REPO}">${t.sourceCode}</a> · ${t.licence}.</footer>
<script>
// Reload when a newer release has been published (latest.json is rewritten by every Pages deploy).
(() => {
  const built = ${JSON.stringify(VERSION || '')};
  const url = '${lang === 'en' ? '' : '../'}latest.json';
  async function check() {
    try {
      const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const { version } = await res.json();
      if (!version || version === built) return;
      // reload once per new version (a cached copy must not cause a reload loop)
      let seen = null;
      try { seen = sessionStorage.getItem('dino-reloaded-for'); sessionStorage.setItem('dino-reloaded-for', version); } catch { /* storage blocked */ }
      if (seen !== version) location.reload();
    } catch {
      /* offline or blocked: try again later */
    }
  }
  check();
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
})();
document.querySelectorAll('.filters button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const f = b.dataset.filter;
  document.querySelectorAll('section[data-habitat]').forEach((sec) => {
    let shown = 0;
    sec.querySelectorAll('.card').forEach((c) => {
      const on = f === 'all' || f === sec.dataset.habitat || (f === 'ride' && c.dataset.ride);
      c.hidden = !on;
      if (on) shown++;
    });
    sec.hidden = shown === 0;
  });
}));
</script>
</body>
</html>
`;
}

fs.writeFileSync(path.join(OUT, 'index.html'), page('en'));
fs.mkdirSync(path.join(OUT, 'da'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'da', 'index.html'), page('da'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify({ version: VERSION || null, download: direct, java: javaJar, releases: latest }, null, 2));

const missing = CREATURES.filter((c) => !DA_INFO[c.id]).map((c) => c.id);
if (missing.length) throw new Error(`missing Danish texts for: ${missing.join(', ')}`);
console.log(`site written to ${OUT} (en + da, ${count} creatures, version ${VERSION || 'unreleased'})`);

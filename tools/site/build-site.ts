// Generates the GitHub Pages site into site/ (English) and site/da/ (Danish), with the same
// layout as the other mods' sites: mod info, downloads, install guide and a rendered catalogue
// of every creature, plant and vehicle. The latest release is looked up in the browser.
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
// The index of all our mods, which every mod's site links back to.
const INDEX_URL = `https://${REPO.split('/')[0]}.github.io/minecraft-index/`;
// The released version (from the Pages workflow), or package.json's when built locally.
const VERSION = (process.env.SITE_VERSION ?? '').replace(/^v/, '') || JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
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
fs.copyFileSync(path.resolve('packs/static/pack_icon.png'), path.join(OUT, 'favicon.png'));
for (const [id, f] of Object.entries(GEAR_ICONS)) save(`gear_${id}.png`, upscale(f(), 4));

// ---------------------------------------------------------------- text

type Lang = 'en' | 'da';
const LANGUAGES = {
  en: { label: 'English', dir: '', htmlLang: 'en', dateLocale: 'en-GB' },
  da: { label: 'Dansk', dir: 'da', htmlLang: 'da', dateLocale: 'da-DK' },
} as const;
const [OWNER, NAME] = REPO.split('/');
const ROOT_URL = `https://${OWNER}.github.io/${NAME}/`;
const count = CREATURES.length;
const dinoCount = CREATURES.filter((c) => ['theropod', 'bird', 'sauropod', 'ornithopod', 'ceratopsian', 'thyreophoran'].includes(c.group)).length;
const others = count - dinoCount;
const releases = `https://github.com/${REPO}/releases`;
const dl = (file: string) => `${releases}/latest/download/${file}`;
const minVersion = MIN_ENGINE.join('.');

const T = {
  en: {
    allMods: 'All our mods',
    name: 'Prehistoric Dinosaurs',
    title: 'Prehistoric Dinosaurs – Minecraft add-on and mod',
    description: `Prehistoric Dinosaurs for Minecraft Bedrock and Java Edition: ${dinoCount} dinosaurs, ${others} more prehistoric creatures, ancient plants, a prehistoric biome, electric fences and safari vehicles. Free download.`,
    tagline: `${dinoCount} dinosaurs and ${others} more prehistoric creatures, from megalodon and mosasaurus to pterosaurs and Titanoboa. Tame them and ride them on land, through the air and underwater, among ancient plants, electric fences and safari vehicles.`,
    download: 'iPad, phone, console & Windows: Bedrock',
    downloadJava: 'Mac & PC: Java Edition',
    which: '<b>Which one do I need?</b> Playing on an <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch or Minecraft for Windows? That is <b>Bedrock Edition</b> – take the first download. Playing on a computer with the Minecraft <b>Java Edition</b> launcher (Mac, Windows or Linux)? Take the Java download. Not sure? If you bought Minecraft in the App Store or Google Play, it is Bedrock.',
    allVersions: 'All versions',
    latestVersion: 'Latest version',
    released: 'released',
    install: 'Install',
    bedrockTitle: 'Install on iPad, phone, console or Windows (Bedrock)',
    javaTitle: 'Install on Mac or PC (Java Edition)',
    steps: (link: string) => [
      `<strong>Download</strong> ${link} on your Windows PC, Android phone or tablet, or iPhone or iPad.`,
      '<strong>Open the file.</strong> Minecraft starts and imports both packs.',
      '<strong>Create or edit a world.</strong> Under <em>Behavior Packs</em>, turn on <em>Prehistoric Dinosaurs BP</em>. The resource pack is added automatically. Turn on the <em>Custom Biomes</em> experiment too if you want the Prehistoric Jungle biome; everything else works without experiments.',
      `<strong>Explore.</strong> The first time you join the world you get a <em>Dino Field Guide</em>. Needs Minecraft ${minVersion} or newer.`,
    ],
    javaSteps: (jar: string, fabric: string, api: string, gecko: string) => [
      `<strong>Install</strong> ${fabric} for Minecraft 26.3.`,
      `<strong>Download</strong> ${jar}, plus ${api} and ${gecko}.`,
      '<strong>Put all three files</strong> in your <em>mods</em> folder and start Minecraft with the Fabric profile.',
      '<strong>Explore.</strong> The Prehistoric Jungle biome is Bedrock only: on Java the plants and creatures appear in the vanilla biomes.',
    ],
    serverNote: (packs: (text: string) => string) => `Running a server, or can’t open the file? Use the separate ${packs('behavior and resource packs')} from the latest release, or unzip the .mcaddon and copy <em>dinosaurs_BP</em> and <em>dinosaurs_RP</em> into <em>behavior_packs</em> and <em>resource_packs</em>. Xbox, PlayStation and Switch can’t import add-ons from files, but you can join a world or Realm that has the add-on.`,
    upgradeTitle: 'Upgrading to a new version',
    upgradeSteps: [
      '<strong>Download the new version</strong> and open the file. A newer version replaces the one you have, and your worlds use it the next time you load them.',
      '<strong>Still running the old version?</strong> (or Minecraft says it is already installed): go to <em>Settings → Storage</em>, delete Prehistoric Dinosaurs under both <em>Resource Packs</em> and <em>Behavior Packs</em>, then open the new file again.',
      '<strong>Check the world:</strong> in the world’s <em>Edit</em> screen, under <em>Behavior Packs</em> and <em>Resource Packs</em>, make sure Prehistoric Dinosaurs is active. A world you imported or downloaded can carry its own old copy: deactivate it there, save, and activate the new one.',
    ],
    upgradeServer: 'On a server, replace the add-on’s folders in <em>behavior_packs</em> and <em>resource_packs</em> with the new ones and restart it.',
    upgradeJava: 'Java Edition: delete the old Prehistoric Dinosaurs jar from your <em>mods</em> folder and put the new one in its place. Keep only one version in the folder. If the new version needs a newer Fabric API or GeckoLib, update those too.',
    creatures: 'The creatures',
    creaturesLede: 'Each creature has its own model, texture and animations: walking, swimming, flying, attacking and lying down. They are grouped by where they live.',
    filterLabel: 'Filter creatures',
    all: 'All',
    tameEgg: 'Tame from egg',
    tameable: 'Tameable',
    rideable: 'Rideable',
    land: 'land',
    air: 'air',
    water: 'water',
    seats: (n: number) => `${n} seats`,
    m: 'm',
    plants: 'Ancient plants and trees',
    park: 'Park gear',
    fence: ['Electric Fence', 'Links up with its neighbours like a vanilla fence and is 1.5 blocks tall. When powered, it shocks whatever touches it.'],
    generator: ['Fence Generator', 'Right-click it or give it a redstone signal to power every fence connected to it.'],
    amber: ['Mosquito in Amber', 'A rare find in amber ore.'],
    guide: ['Dino Field Guide', 'Facts plus taming and riding tips for every species.'],
    prod: ['Electric Prod', 'Shocks, slows and pushes back whatever you hit.'],
    rifle: ['Tranquilizer Rifle', 'Fires tranquilizer darts. One dart knocks out a small animal; big herbivores need 3 darts and big carnivores 4.'],
    featuresTitle: 'Features',
    features: [
      ['Tame and ride', 'Tame creatures with their favourite food, or hatch apex predators from eggs. Saddle them to ride on land, through the air or underwater.'],
      ['Prehistoric Jungle', 'A new biome full of ginkgo, monkey-puzzle, dawn redwood, scale trees and tree ferns. Without experiments, the plants and creatures appear in vanilla biomes instead.'],
      ['Park gear', 'Electric fences shock anything that touches them once a generator powers them, and big carnivores smash through fences with no power. Drive a safari truck, a tour car or a gyrosphere, and keep animals in check with an electric prod or a tranquilizer rifle.'],
      ['Fossils and amber', 'Mine fossil blocks and amber ore, and look for the rare mosquito in amber.'],
      ['Field guide', 'An in-game book with facts about every species and how to tame and ride it.'],
      ['Realistic Hunting', 'Install Realistic Hunting as well and every creature is game, with organs in its own model, a shot report and a trophy. A T. rex takes a .338.'],
    ],
    footerSource: (src: (text: string) => string, issues: (text: string) => string) => `Prehistoric Dinosaurs is free and open source. All models and textures are generated from code in the repository. ${src('Source code on GitHub')} · ${issues('Report a problem')}`,
    footerLegal: 'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.',
  },
  da: {
    allMods: 'Alle vores mods',
    name: 'Forhistoriske dinosaurer',
    title: 'Forhistoriske dinosaurer – tilføjelse og mod til Minecraft',
    description: `Forhistoriske dinosaurer til Minecraft Bedrock og Java Edition: ${dinoCount} dinosaurer, ${others} andre forhistoriske dyr, oldtidsplanter, et forhistorisk biom, elektriske hegn og safarikøretøjer. Gratis download.`,
    tagline: `${dinoCount} dinosaurer og ${others} andre forhistoriske dyr, fra megalodon og mosasaurus til flyveøgler og Titanoboa. Tæm dem, og rid på dem over land, gennem luften og under vandet, mellem oldtidsplanter, elektriske hegn og safarikøretøjer.`,
    download: 'iPad, telefon, konsol & Windows: Bedrock',
    downloadJava: 'Mac & pc: Java Edition',
    which: '<b>Hvilken skal jeg bruge?</b> Spiller du på <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch eller Minecraft til Windows? Så er det <b>Bedrock Edition</b> – tag den første download. Spiller du på en computer med Minecraft <b>Java Edition</b>-launcheren (Mac, Windows eller Linux)? Så tag Java-downloaden. I tvivl? Hvis Minecraft er købt i App Store eller Google Play, er det Bedrock.',
    allVersions: 'Alle versioner',
    latestVersion: 'Nyeste version',
    released: 'udgivet',
    install: 'Installér',
    bedrockTitle: 'Installér på iPad, telefon, konsol eller Windows (Bedrock)',
    javaTitle: 'Installér på Mac eller pc (Java Edition)',
    steps: (link: string) => [
      `<strong>Download</strong> ${link} på din Windows-pc, Android-telefon eller -tablet, iPhone eller iPad.`,
      '<strong>Åbn filen.</strong> Minecraft starter og importerer begge pakker.',
      '<strong>Opret eller redigér en verden.</strong> Slå <em>Prehistoric Dinosaurs BP</em> til under <em>Adfærdspakker</em>. Ressourcepakken kommer automatisk med. Slå også eksperimentet <em>Custom Biomes</em> til, hvis du vil have det forhistoriske junglebiom; alt andet virker uden eksperimenter.',
      `<strong>Gå på opdagelse.</strong> Første gang du er i verdenen, får du en <em>Dino Field Guide</em> (felthåndbog). Kræver Minecraft ${minVersion} eller nyere.`,
    ],
    javaSteps: (jar: string, fabric: string, api: string, gecko: string) => [
      `<strong>Installér</strong> ${fabric} til Minecraft 26.3.`,
      `<strong>Download</strong> ${jar} samt ${api} og ${gecko}.`,
      '<strong>Læg alle tre filer</strong> i din <em>mods</em>-mappe, og start Minecraft med Fabric-profilen.',
      '<strong>Gå på opdagelse.</strong> Det forhistoriske junglebiom findes kun på Bedrock: på Java dukker planterne og dyrene op i de almindelige biomer.',
    ],
    serverNote: (packs: (text: string) => string) => `Kører du en server, eller kan du ikke åbne filen? Brug den separate ${packs('adfærds- og ressourcepakke')} fra den nyeste udgivelse, eller pak .mcaddon-filen ud, og kopiér <em>dinosaurs_BP</em> og <em>dinosaurs_RP</em> til <em>behavior_packs</em> og <em>resource_packs</em>. Xbox, PlayStation og Switch kan ikke importere tilføjelser fra filer, men du kan deltage i en verden eller Realm, der har tilføjelsen.`,
    upgradeTitle: 'Opdatering til en ny version',
    upgradeSteps: [
      '<strong>Hent den nye version</strong>, og åbn filen. En nyere version erstatter den, du har, og dine verdener bruger den, næste gang du åbner dem.',
      '<strong>Kører den gamle version stadig?</strong> (eller siger Minecraft, at den allerede er installeret): Gå til <em>Indstillinger → Lagerplads</em>, slet Prehistoric Dinosaurs under både <em>Ressourcepakker</em> og <em>Adfærdspakker</em>, og åbn så den nye fil igen.',
      '<strong>Tjek verdenen:</strong> Sørg for, at Prehistoric Dinosaurs er slået til under <em>Adfærdspakker</em> og <em>Ressourcepakker</em>, når du redigerer verdenen. En verden, du har importeret eller hentet, kan have sin egen gamle kopi med: Slå den fra dér, gem, og slå den nye til.',
    ],
    upgradeServer: 'På en server skal du erstatte tilføjelsens mapper i <em>behavior_packs</em> og <em>resource_packs</em> med de nye og genstarte den.',
    upgradeJava: 'Java Edition: Slet den gamle Prehistoric Dinosaurs-jar fra din <em>mods</em>-mappe, og læg den nye i stedet. Hav kun én version i mappen. Kræver den nye version en nyere Fabric API eller GeckoLib, så opdatér dem også.',
    creatures: 'Dyrene',
    creaturesLede: 'Hvert dyr har sin egen model, tekstur og animationer: gang, svømning, flyvning, angreb og hvile. De er ordnet efter, hvor de lever.',
    filterLabel: 'Filtrér dyr',
    all: 'Alle',
    tameEgg: 'Tæmmes fra æg',
    tameable: 'Kan tæmmes',
    rideable: 'Kan rides',
    land: 'land',
    air: 'luft',
    water: 'vand',
    seats: (n: number) => `${n} sæder`,
    m: 'm',
    plants: 'Oldtidsplanter og træer',
    park: 'Parkudstyr',
    fence: ['Elektrisk hegn', 'Forbinder sig med naboerne som et almindeligt hegn og er 1,5 blok højt. Når der er strøm på, giver det stød til alt, der rører det.'],
    generator: ['Hegnsgenerator', 'Højreklik på den eller giv den et redstone-signal for at sætte strøm til alle hegn, der er forbundet med den.'],
    amber: ['Myg i rav', 'Et sjældent fund i ravmalm.'],
    guide: ['Dino-felthåndbog', 'Fakta samt tips til at tæmme og ride på alle arter.'],
    prod: ['Elektrisk stav', 'Giver stød, gør langsom og skubber det, du rammer, tilbage.'],
    rifle: ['Bedøvelsesgevær', 'Skyder bedøvelsespile. Én pil bedøver et lille dyr; store planteædere kræver 3 pile og store kødædere 4.'],
    featuresTitle: 'Indhold',
    features: [
      ['Tæm og rid', 'Tæm dyrene med deres yndlingsføde, eller klæk toprovdyr fra æg. Sæt en sadel på og rid over land, gennem luften eller under vandet.'],
      ['Forhistorisk jungle', 'Et nyt biom fuld af tempeltræer, abeskræk, vandgran, skæltræer og træbregner. Uden eksperimenter dukker planterne og dyrene op i de almindelige biomer i stedet.'],
      ['Parkudstyr', 'Elektriske hegn giver stød til alt, der rører dem, når en generator forsyner dem med strøm, og store kødædere smadrer hegn uden strøm. Kør i safarivogn, turbil eller gyrosfære, og hold dyrene i skak med en elektrisk stav eller et bedøvelsesgevær.'],
      ['Fossiler og rav', 'Bryd fossilblokke og ravmalm, og led efter den sjældne myg i rav.'],
      ['Felthåndbog', 'En bog i spillet med fakta om alle arter, og hvordan du tæmmer og rider på dem.'],
      ['Realistisk jagt', 'Installér også Realistisk jagt, så er alle dyr vildt med organer i deres egen model, skudrapport og trofæ. En T. rex kræver en .338.'],
    ],
    footerSource: (src: (text: string) => string, issues: (text: string) => string) => `Forhistoriske dinosaurer er gratis og open source. Alle modeller og teksturer er genereret af kode i repositoriet. ${src('Kildekode på GitHub')} · ${issues('Meld et problem')}`,
    footerLegal: 'Ikke et officielt Minecraft-produkt. Ikke godkendt af eller tilknyttet Mojang eller Microsoft.',
  },
};

const term = (lang: Lang, s: string) => (lang === 'da' ? (DA_TERMS[s] ?? s) : s);
const info = (lang: Lang, id: string, en: string) => (lang === 'da' ? (DA_INFO[id] ?? DA_PLANT_INFO[id] ?? en) : en);
const name = (lang: Lang, id: string, en: string) => (lang === 'da' ? (DA_NAMES[id] ?? en) : en);
const num = (lang: Lang, n: number) => (lang === 'da' ? String(n).replace('.', ',') : String(n));

/** Builds the page for one language. Pages for other languages live in a subfolder. */
function page(lang: Lang) {
  const L = LANGUAGES[lang];
  const t = T[lang];
  const up = L.dir ? '../' : '';
  const link = (href: string) => (text: string) => `<a href="${href}">${esc(text)}</a>`;
  const home = `${INDEX_URL}${L.dir ? L.dir + '/' : ''}`;
  const img = (f: string) => `${up}img/${f}`;

  const cards: Record<string, string[]> = {};
  for (const def of CREATURES) {
    const ride = def.ride ? `${t.rideable} · ${def.ride.mode === 'ground' ? t.land : def.ride.mode === 'fly' ? t.air : t.water}${def.ride.seats > 1 ? ` · ${t.seats(def.ride.seats)}` : ''}` : '';
    const tags = [
      def.tame === 'egg' ? `<li class="egg">${t.tameEgg}</li>` : def.tame ? `<li class="tame">${t.tameable}</li>` : '',
      ride ? `<li class="ride">${ride}</li>` : '',
      `<li class="${def.temperament}">${term(lang, def.temperament)}</li>`,
    ].join('');
    const where = livesIn(def).map((b) => BIOME_LABELS[b][lang]).join(' · ');
    (cards[habitatOf(def)] ??= []).push(`
      <article class="card"${def.ride ? ' data-ride="1"' : ''}>
        <div class="portrait"><img src="${img(`${def.id}.png`)}" alt="${esc(def.name)}" loading="lazy" width="320" height="320"></div>
        <div class="card-body">
          <h3>${esc(def.name)}</h3>
          <p class="meta">${term(lang, def.period)} · ${num(lang, def.lengthM)} ${t.m} · ${term(lang, def.diet)}</p>
          <p class="where">${esc(where)}</p>
          <p>${esc(info(lang, def.id, def.info))}</p>
          <ul class="tags">${tags}</ul>
        </div>
      </article>`);
  }
  const habitats = HABITATS.filter((h) => cards[h.id]);
  const groups = habitats
    .map((h) => `
    <div class="group" data-habitat="${h.id}">
      <h3 class="edition">${esc(h[lang])} <small>${cards[h.id].length}</small></h3>
      <div class="grid">${cards[h.id].join('')}
      </div>
    </div>`)
    .join('');
  const filters = [['all', t.all], ...habitats.map((h) => [h.id, h[lang]]), ['ride', t.rideable]]
    .map(([key, label], i) => `      <button aria-pressed="${i === 0}" data-filter="${key}">${esc(label)}</button>`)
    .join('\n');
  const mini = (image: string, title: string, text: string) => `
      <div class="mini"><img src="${img(image)}" alt="" loading="lazy" width="64" height="64"><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
  const vehicles = VEHICLES.map((v) => `
      <article class="card">
        <div class="portrait"><img src="${img(`${v.id}.png`)}" alt="${esc(name(lang, v.id, v.name))}" loading="lazy" width="320" height="320"></div>
        <div class="card-body">
          <h3>${esc(name(lang, v.id, v.name))}</h3>
          <p>${esc(info(lang, v.id, v.info))}</p>
        </div>
      </article>`).join('');

  const switcher = (Object.entries(LANGUAGES) as [Lang, (typeof LANGUAGES)[Lang]][])
    .filter(([code]) => code !== lang)
    .map(([, other]) => `<a class="lang" href="${up}${other.dir ? other.dir + '/' : ''}" hreflang="${other.htmlLang}" lang="${other.htmlLang}">${esc(other.label)}</a>`)
    .join('');
  const alternates = Object.values(LANGUAGES)
    .map((other) => `<link rel="alternate" hreflang="${other.htmlLang}" href="${ROOT_URL}${other.dir ? other.dir + '/' : ''}">`)
    .join('\n');

  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
${alternates}
<link rel="icon" href="${up}favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #f4f1e8; --surface: #fffdf7; --ink: #24301f; --muted: #5e6b55; --line: #d9d3c2;
  --accent: #3f6b2f; --accent-ink: #fff; --accent-2: #a8661c; --chip: #ece6d3; --hero-from: #1f3b1a; --hero-to: #5d7a2a;
  --portrait-from: #dfe8cf; --portrait-to: #b9c99d;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #141a12; --surface: #1d251a; --ink: #e9eadf; --muted: #a3ad98; --line: #2f3a2a;
    --accent: #8cc46a; --accent-ink: #141a12; --accent-2: #e6a64d; --chip: #26301f; --hero-from: #0e1a0c; --hero-to: #34501f;
    --portrait-from: #33412c; --portrait-to: #232c1f;
  }
}
:root[data-theme="dark"] {
  --bg: #141a12; --surface: #1d251a; --ink: #e9eadf; --muted: #a3ad98; --line: #2f3a2a;
  --accent: #8cc46a; --accent-ink: #141a12; --accent-2: #e6a64d; --chip: #26301f; --hero-from: #0e1a0c; --hero-to: #34501f;
  --portrait-from: #33412c; --portrait-to: #232c1f;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
img { image-rendering: pixelated; max-width: 100%; }
a { color: var(--accent); }
h1, h2, h3 { font-family: "Pixelify Sans", system-ui, sans-serif; font-weight: 500; line-height: 1.15; letter-spacing: .01em; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
header.hero { color: #fff8ec; background: linear-gradient(180deg, var(--hero-from), var(--hero-to)); padding: 48px 0 56px; }
.hero .wrap { display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: center; }
.hero img.icon { width: 160px; height: 160px; border-radius: 12px; box-shadow: 0 8px 30px rgb(0 0 0 / .35); }
.hero h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); margin: 0 0 8px; }
.hero p { margin: 0 0 20px; font-size: 1.15rem; max-width: 52ch; color: #e3e8d6; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; background: #ffd36b; color: #2b1d0e; box-shadow: 0 3px 0 #b8862c; }
.btn:hover { transform: translateY(-1px); }
.btn.ghost { background: transparent; color: #fff3df; box-shadow: inset 0 0 0 2px rgb(255 243 223 / .6); }
.version { font-size: .95rem; color: #e3e8d6; }
.which { margin: 16px 0 6px; background: rgb(0 0 0 / .22); border: 1px solid rgb(255 243 223 / .35); border-radius: 10px; padding: 10px 14px; max-width: 62ch; font-size: .95rem; color: #fff3df; }
.which b { color: #fff; }
.hero .langs { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: -28px; margin-bottom: 8px; }
.hero .langs a { color: #fff3df; font-weight: 600; text-decoration: none; padding: 4px 12px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px rgb(255 243 223 / .55); font-size: .9rem; }
.hero .langs a:hover { background: rgb(255 255 255 / .12); }
.version strong { color: #fff; }
main section { padding: 48px 0 8px; }
h2 { font-size: 2rem; margin: 0 0 8px; }
h2 small { font-size: 1rem; color: var(--muted); }
.lede { color: var(--muted); margin: 0 0 24px; max-width: 70ch; }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; padding: 0; list-style: none; counter-reset: s; }
.steps li { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 16px 16px 56px; position: relative; }
.steps li::before { counter-increment: s; content: counter(s); position: absolute; left: 16px; top: 14px; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; font-weight: 700; }
.note { color: var(--muted); font-size: .92rem; }
h3.edition { margin: 28px 0 12px; font: 700 1.15rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
h3.edition small { color: var(--muted); font-weight: 500; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 8px; }
.filters button { font: inherit; border: 1px solid var(--line); background: var(--surface); color: var(--ink); padding: 6px 14px; border-radius: 999px; cursor: pointer; }
.filters button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
.card[hidden], .group[hidden] { display: none; }
.portrait { background: radial-gradient(circle at 50% 60%, var(--portrait-from), var(--portrait-to)); aspect-ratio: 1; display: grid; place-items: center; }
.portrait img { width: 100%; height: auto; }
.card-body { padding: 14px 16px 16px; }
.card h3 { margin: 0; font: 700 1.3rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.meta { margin: 2px 0 4px; color: var(--muted); font-size: .88rem; }
.meta::first-letter, .tags li::first-letter { text-transform: uppercase; }
.where { margin: 0 0 8px; color: var(--accent-2); font-weight: 600; font-size: .9rem; }
.card p { margin: 0 0 10px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 0; list-style: none; }
.tags li { background: var(--chip); border-radius: 6px; padding: 2px 8px; font-size: .82rem; }
.tags .ride { background: #f2c14a40; } .tags .tame { background: #8cc46a40; } .tags .egg { background: #e6a64d40; } .tags .aggressive { background: #d0413a33; }
.minis { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-top: 18px; }
.mini { display: flex; gap: 12px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
.mini img { width: 64px; height: 64px; flex: none; }
.mini h3 { margin: 0; font: 700 1rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.mini p { margin: 4px 0 0; font-size: .9rem; color: var(--muted); }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.feature { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px; }
.feature h3 { margin: 0 0 6px; font: 700 1.1rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.feature p { margin: 0; color: var(--muted); }
footer { margin-top: 56px; padding: 28px 0 40px; border-top: 1px solid var(--line); color: var(--muted); font-size: .9rem; }
@media (max-width: 640px) {
  .hero .wrap { grid-template-columns: 1fr; text-align: center; justify-items: center; }
  .hero img.icon { width: 112px; height: 112px; }
  .actions { justify-content: center; }
}
</style>
</head>
<body>
<header class="hero">
  <nav class="langs wrap"><a class="home" href="${home}">← ${esc(t.allMods)}</a><span>${switcher}</span></nav>
  <div class="wrap">
    <img class="icon" src="${up}img/icon.png" alt="" width="160" height="160">
    <div>
      <h1>${esc(t.name)}</h1>
      <p>${esc(t.tagline)}</p>
      <div class="actions">
        <a class="btn" id="download" href="${dl('prehistoric-dinosaurs.mcaddon')}">⬇ ${esc(t.download)}</a>
        <a class="btn" href="${dl('prehistoric-dinosaurs-fabric.jar')}">⬇ ${esc(t.downloadJava)}</a>
        <a class="btn ghost" href="${releases}">${esc(t.allVersions)}</a>
      </div>
      <p class="which">${t.which}</p>
      <p class="version" id="version">${esc(t.latestVersion)}: <strong>${esc(VERSION)}</strong></p>
    </div>
  </div>
</header>
<main class="wrap">
  <section id="install">
    <h2>${esc(t.install)}</h2>
    <h3 class="edition">${esc(t.bedrockTitle)}</h3>
    <ol class="steps">
${t.steps(`<a href="${dl('prehistoric-dinosaurs.mcaddon')}">prehistoric-dinosaurs.mcaddon</a>`).map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <p class="note">${t.serverNote(link(`${releases}/latest`))}</p>
    <h3 class="edition">${esc(t.javaTitle)}</h3>
    <ol class="steps">
${t.javaSteps(
    `<a href="${dl('prehistoric-dinosaurs-fabric.jar')}">prehistoric-dinosaurs-fabric.jar</a>`,
    '<a href="https://fabricmc.net/use/installer/">Fabric Loader</a>',
    '<a href="https://modrinth.com/mod/fabric-api">Fabric API</a>',
    '<a href="https://modrinth.com/mod/geckolib">GeckoLib</a>',
  ).map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <h3 class="edition">${esc(t.upgradeTitle)}</h3>
    <ol class="steps">
${t.upgradeSteps.map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <p class="note">${t.upgradeServer}</p>
    <p class="note">${t.upgradeJava}</p>
  </section>

  <section id="creatures">
    <h2>${esc(t.creatures)} <small>${count}</small></h2>
    <p class="lede">${esc(t.creaturesLede)}</p>
    <div class="filters" role="group" aria-label="${esc(t.filterLabel)}">
${filters}
    </div>${groups}
  </section>

  <section id="plants">
    <h2>${esc(t.plants)}</h2>
    <div class="minis">${PLANTS.map((p) => mini(`plant_${p.id}.png`, name(lang, p.id, p.name), info(lang, p.id, p.info))).join('')}${TREES.map((tr) => mini(`tree_${tr.id}.png`, name(lang, tr.id, tr.name), info(lang, tr.id, tr.info))).join('')}
    </div>
  </section>

  <section id="park">
    <h2>${esc(t.park)}</h2>
    <div class="grid">${vehicles}
    </div>
    <div class="minis">${mini('fence.png', t.fence[0], t.fence[1])}${mini('generator.png', t.generator[0], t.generator[1])}${mini('item_amber_mosquito.png', t.amber[0], t.amber[1])}${mini('item_field_guide.png', t.guide[0], t.guide[1])}${mini('gear_electric_prod.png', t.prod[0], t.prod[1])}${mini('gear_tranquilizer_rifle.png', t.rifle[0], t.rifle[1])}
    </div>
  </section>

  <section id="features">
    <h2>${esc(t.featuresTitle)}</h2>
    <div class="features">
${t.features.map(([title, text]) => `      <div class="feature"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('\n')}
    </div>
  </section>
</main>
<footer>
  <div class="wrap">
    <p>${t.footerSource(link(`https://github.com/${REPO}`), link(`https://github.com/${REPO}/issues`))}</p>
    <p>${esc(t.footerLegal)}</p>
    <p>${link(home)(`← ${t.allMods}`)}</p>
  </div>
</footer>
<script>
// Creature filters
const buttons = document.querySelectorAll('.filters button');
buttons.forEach((b) => b.addEventListener('click', () => {
  buttons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  const f = b.dataset.filter;
  document.querySelectorAll('.group').forEach((g) => {
    let shown = 0;
    g.querySelectorAll('.card').forEach((c) => {
      c.hidden = !(f === 'all' || f === g.dataset.habitat || (f === 'ride' && c.dataset.ride));
      if (!c.hidden) shown++;
    });
    g.hidden = shown === 0;
  });
}));
// Latest release from GitHub
fetch('https://api.github.com/repos/${OWNER}/${NAME}/releases/latest')
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    if (!rel || !rel.tag_name) return;
    const date = new Date(rel.published_at).toLocaleDateString('${L.dateLocale}', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('version').innerHTML = '${t.latestVersion}: <strong>' + rel.tag_name.replace(/^v/, '') + '</strong> · ${t.released} ' + date;
  })
  .catch(() => {});

// Reload when a new release has been published. The site is redeployed with every release
// and writes version.json; compare it with the version this page was built with.
const PAGE_VERSION = '${VERSION}';
let reloading = false;
function checkForUpdate() {
  if (reloading || document.hidden) return;
  fetch('${up}version.json?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v || !v.version || v.version === PAGE_VERSION) return;
      // Reload once per new version: if the cached page is still the old one, don't loop.
      let tried = null;
      try { tried = sessionStorage.getItem('dino-reloaded-for'); } catch {}
      if (tried === v.version) return;
      try { sessionStorage.setItem('dino-reloaded-for', v.version); } catch {}
      reloading = true;
      location.reload();
    })
    .catch(() => {});
}
setInterval(checkForUpdate, 10 * 60 * 1000);
checkForUpdate();
document.addEventListener('visibilitychange', checkForUpdate);
</script>
</body>
</html>
`;
}

for (const [lang, L] of Object.entries(LANGUAGES) as [Lang, (typeof LANGUAGES)[Lang]][]) {
  const dir = path.join(OUT, L.dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(lang));
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ version: VERSION }) + '\n');
// Pages built before the shared template poll latest.json; keep it so they still reload once.
fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify({ version: VERSION }) + '\n');

const missing = CREATURES.filter((c) => !DA_INFO[c.id]).map((c) => c.id);
if (missing.length) throw new Error(`missing Danish texts for: ${missing.join(', ')}`);
console.log(`site written to ${OUT} (en + da, ${count} creatures, version ${VERSION})`);

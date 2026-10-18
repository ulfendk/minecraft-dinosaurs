// Generates the GitHub Pages site into site/: mod info, latest release download,
// install guide and a rendered catalogue of every creature, plant and vehicle.
//   SITE_VERSION=v1.2.3 npx tsx tools/site/build-site.ts
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { assemble } from '../../src/creatures/assemble.js';
import { CREATURES } from '../../src/data/registry.js';
import { PLANTS, TREES } from '../../src/data/plants.js';
import { VEHICLES } from '../../src/data/park.js';
import { MIN_ENGINE } from '../../src/emit/bedrock/constants.js';
import { buildItems } from '../../src/emit/bedrock/items.js';
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

// ---- creature renders
const GROUPS: Record<string, string> = {
  theropod: 'Theropods',
  bird: 'Theropods',
  sauropod: 'Sauropods',
  ornithopod: 'Ornithopods',
  ceratopsian: 'Horned dinosaurs',
  thyreophoran: 'Armoured dinosaurs',
  pterosaur: 'Pterosaurs',
  marine_reptile: 'Marine reptiles',
  fish: 'Prehistoric fish',
  crocodilian: 'Other prehistoric animals',
  snake: 'Other prehistoric animals',
  synapsid: 'Other prehistoric animals',
};
const cards: Record<string, string[]> = {};
for (const def of CREATURES) {
  const x = assemble(def);
  const bones = toGeoJson(x.model, 'g')['minecraft:geometry'][0].bones as any;
  save(`${def.id}.png`, transparentBg(renderView(collectTris(bones, {}, ['saddle']), x.texture, { yaw: 35, pitch: 16 }, 320)));
  const badges = [
    def.tame === 'egg' ? '<span class="b egg">Tame from egg</span>' : def.tame ? '<span class="b tame">Tameable</span>' : '',
    def.ride ? `<span class="b ride">Rideable · ${def.ride.mode === 'ground' ? 'land' : def.ride.mode === 'fly' ? 'air' : 'water'}${def.ride.seats > 1 ? ` · ${def.ride.seats} seats` : ''}</span>` : '',
    `<span class="b ${def.temperament}">${def.temperament}</span>`,
  ].join('');
  (cards[GROUPS[def.group] ?? 'Other'] ??= []).push(`<article class="card"><img loading="lazy" src="img/${def.id}.png" alt="${esc(def.name)}" width="320" height="320"><div><h3>${esc(def.name)}</h3><p class="meta">${def.period} · ${def.lengthM} m · ${def.diet}</p><p>${esc(def.info)}</p><p class="badges">${badges}</p></div></article>`);
}

// ---- vehicles, items, plants
for (const v of VEHICLES) {
  const { model, texture } = vehicleAssets(v);
  const bones = toGeoJson(model, 'g')['minecraft:geometry'][0].bones as any;
  save(`${v.id}.png`, transparentBg(renderView(collectTris(bones), texture, { yaw: 35, pitch: 20 }, 320)));
}
const icons = new Map(buildItems([]).map((i) => [i.id, i.icon]));
for (const [id, icon] of icons) save(`item_${id}.png`, upscale(icon, 4));
const blockTex = new Map(buildBlocks().flatMap((b) => Object.entries(b.textures)));
for (const p of PLANTS) save(`plant_${p.id}.png`, upscale(blockTex.get(`dino_${p.id}`)!, 4));
for (const t of TREES) save(`tree_${t.id}.png`, upscale(blockTex.get(`dino_${t.id}_sapling`)!, 4));
save('fence.png', upscale(blockTex.get('dino_electric_fence_on')!, 4));
save('generator.png', upscale(blockTex.get('dino_generator_side_on')!, 4));
fs.copyFileSync(path.resolve('packs/static/pack_icon.png'), path.join(IMG, 'icon.png'));

const latest = `https://github.com/${REPO}/releases/latest`;
const direct = VERSION ? `https://github.com/${REPO}/releases/download/v${VERSION}/prehistoric-dinosaurs-${VERSION}.mcaddon` : latest;
const count = CREATURES.length;
const dinoCount = CREATURES.filter((c) => ['theropod', 'bird', 'sauropod', 'ornithopod', 'ceratopsian', 'thyreophoran'].includes(c.group)).length;
const sections = Object.entries(cards)
  .map(([g, list]) => `<section class="group"><h2>${g} <small>${list.length}</small></h2><div class="grid">${list.join('')}</div></section>`)
  .join('\n');
const small = (img: string, title: string, text: string) => `<article class="mini"><img loading="lazy" src="img/${img}" alt="" width="64" height="64"><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></article>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prehistoric Dinosaurs</title>
<meta name="description" content="A Minecraft Bedrock add-on with ${dinoCount} dinosaurs, ${count - dinoCount} more prehistoric creatures, ancient plants, a prehistoric biome, electric fences and safari vehicles.">
<link rel="icon" href="img/icon.png">
<style>
:root{--bg:#f4f1e8;--panel:#fffdf7;--ink:#24301f;--muted:#5e6b55;--accent:#3f6b2f;--accent2:#c9822b;--line:#d9d3c2;--chip:#ece6d3}
@media (prefers-color-scheme:dark){:root{--bg:#141a12;--panel:#1d251a;--ink:#e9eadf;--muted:#a3ad98;--accent:#8cc46a;--accent2:#e6a64d;--line:#2f3a2a;--chip:#26301f}}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
a{color:var(--accent)}header{background:linear-gradient(160deg,#20321a,#3f6b2f 60%,#6b8f3a);color:#f6f3e6;padding:48px 16px 40px}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}header .wrap{display:flex;gap:28px;align-items:center;flex-wrap:wrap}
header img{width:112px;height:112px;image-rendering:pixelated;border-radius:18px;box-shadow:0 8px 24px #0006}
h1{font-size:clamp(2rem,5vw,3.2rem);margin:0 0 6px;letter-spacing:-.02em}header p{margin:0;max-width:720px;color:#e3e8d6}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}.btn{display:inline-block;padding:12px 18px;border-radius:10px;font-weight:650;text-decoration:none}
.btn.primary{background:#f2c14a;color:#2a2410}.btn.ghost{border:1px solid #f6f3e688;color:#f6f3e6}.ver{font-size:.9rem;color:#d8e2c6;margin-top:10px}
main section{padding:28px 0;border-bottom:1px solid var(--line)}h2{font-size:1.5rem;margin:0 0 16px}h2 small{font-size:.9rem;color:var(--muted);font-weight:500}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.feature{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px}
.feature h3{margin:0 0 6px;font-size:1.05rem}.feature p{margin:0;color:var(--muted)}
ol.steps{padding-left:20px}ol.steps li{margin:6px 0}code{background:var(--chip);padding:1px 6px;border-radius:5px}
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
</style>
</head>
<body>
<header><div class="wrap"><img src="img/icon.png" alt=""><div>
<h1>Prehistoric Dinosaurs</h1>
<p>A Minecraft Bedrock add-on with <b>${dinoCount} dinosaurs</b> and <b>${count - dinoCount} more prehistoric creatures</b>: megalodon, mosasaurus, pterosaurs, Titanoboa and others. It also has ancient plants, a Prehistoric Jungle biome, tameable and rideable dinosaurs, electric fences and safari vehicles.</p>
<div class="cta"><a class="btn primary" href="${direct}">Download ${VERSION ? `v${VERSION}` : 'latest'} (.mcaddon)</a><a class="btn ghost" href="${latest}">All releases</a><a class="btn ghost" href="https://github.com/${REPO}">Source on GitHub</a></div>
<p class="ver">${VERSION ? `Latest version: <b>v${VERSION}</b> · ` : ''}Requires Minecraft Bedrock ${MIN_ENGINE.join('.')} or newer</p>
</div></div></header>
<main class="wrap">
<section><h2>Features</h2><div class="features">
<div class="feature"><h3>${count} creatures</h3><p>Each creature has its own model, texture and animations: walking, swimming, flying, attacking and lying down.</p></div>
<div class="feature"><h3>Tame and ride</h3><p>Tame creatures with their favourite food, or hatch apex predators from eggs. Saddle them to ride on land, through the air or underwater.</p></div>
<div class="feature"><h3>Prehistoric Jungle</h3><p>A new biome full of ginkgo, monkey-puzzle, dawn redwood, scale trees and tree ferns. Without experiments, the plants and creatures appear in vanilla biomes instead.</p></div>
<div class="feature"><h3>Park gear</h3><p>Electric fences shock anything that touches them once a generator powers them, and big carnivores smash through fences with no power. Drive a safari truck, a tour car or a gyrosphere.</p></div>
<div class="feature"><h3>Fossils and amber</h3><p>Mine fossil blocks and amber ore, and look for the rare mosquito in amber.</p></div>
<div class="feature"><h3>Field guide</h3><p>An in-game book with facts about every species and how to tame and ride it.</p></div>
</div></section>
<section id="install"><h2>Install</h2><ol class="steps">
<li>Download <a href="${direct}"><code>prehistoric-dinosaurs-${VERSION || '&lt;version&gt;'}.mcaddon</code></a> from the latest release.</li>
<li>Open the file. On Windows, mobile and consoles with file access, Minecraft imports both packs automatically. On other platforms, unzip it and copy <code>dinosaurs_BP</code> and <code>dinosaurs_RP</code> into <code>behavior_packs</code> and <code>resource_packs</code>.</li>
<li>Create or edit a world. Under <b>Behavior Packs</b>, activate <i>Prehistoric Dinosaurs BP</i> (the resource pack is added automatically).</li>
<li>Optional: turn on the <b>Custom Biomes</b> experiment to get the Prehistoric Jungle biome. Everything else works without experiments.</li>
<li>Your first time in the world, you get a <b>Dino Field Guide</b>.</li>
</ol></section>
${sections}
<section><h2>Ancient plants and trees</h2><div class="minis">${PLANTS.map((p) => small(`plant_${p.id}.png`, p.name, p.info)).join('')}${TREES.map((t) => small(`tree_${t.id}.png`, t.name, t.info)).join('')}</div></section>
<section><h2>Park gear</h2><div class="vehicles">${VEHICLES.map((v) => `<article class="card"><img loading="lazy" src="img/${v.id}.png" alt="${esc(v.name)}" width="320" height="320"><div><h3>${esc(v.name)}</h3><p>${esc(v.info)}</p></div></article>`).join('')}</div>
<div class="minis" style="margin-top:14px">${small('fence.png', 'Electric Fence', 'Links up with its neighbours like a vanilla fence and is 1.5 blocks tall. When powered, it shocks whatever touches it.')}${small('generator.png', 'Fence Generator', 'Right-click it or give it a redstone signal to power every fence connected to it.')}${small('item_amber_mosquito.png', 'Mosquito in Amber', 'A rare find in amber ore.')}${small('item_field_guide.png', 'Dino Field Guide', 'Facts plus taming and riding tips for every species.')}</div></section>
</main>
<footer class="wrap">Prehistoric Dinosaurs is an open-source fan project, not affiliated with Mojang or Microsoft. All models and textures are generated from code in the repository. <a href="https://github.com/${REPO}">Source code</a> · MIT licence.</footer>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify({ version: VERSION || null, download: direct, releases: latest }, null, 2));
console.log(`site written to ${OUT} (${CREATURES.length} creatures, version ${VERSION || 'unreleased'})`);

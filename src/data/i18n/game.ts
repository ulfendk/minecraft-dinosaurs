// In-game text (lang files) for English and Danish: script UI strings and Danish names.
import { DA_INFO, DA_PLANT_INFO, DA_TERMS } from './da.js';

export type Locale = 'en_US' | 'da_DK';

/** Script UI strings, referenced from the scripts as `dino.ui.<key>`. */
export const UI: Record<string, Record<Locale, string>> = {
  'guide.title': { en_US: 'Dino Field Guide v%s', da_DK: 'Dino-felthåndbog v%s' },
  'guide.body': { en_US: '%s prehistoric creatures, ancient plants and park gear.', da_DK: '%s forhistoriske dyr, oldtidsplanter og parkudstyr.' },
  'guide.plants': { en_US: 'Ancient plants & trees', da_DK: 'Oldtidsplanter og træer' },
  'guide.taming': { en_US: 'Taming, riding & eggs', da_DK: 'Tæmning, ridning og æg' },
  'guide.park': { en_US: 'Park gear: fences & vehicles', da_DK: 'Parkudstyr: hegn og køretøjer' },
  'guide.species': { en_US: '%s species', da_DK: '%s arter' },
  'guide.back': { en_US: 'Back', da_DK: 'Tilbage' },
  'guide.close': { en_US: 'Close', da_DK: 'Luk' },
  'guide.saplings': { en_US: 'Saplings grow on their own or with bone meal.', da_DK: 'Spirer vokser af sig selv eller med benmel.' },
  'page.temperament': { en_US: 'Temperament:', da_DK: 'Temperament:' },
  'page.taming': { en_US: 'Taming:', da_DK: 'Tæmning:' },
  'page.riding': { en_US: 'Riding:', da_DK: 'Ridning:' },
  'tame.egg': { en_US: 'Only hatchlings: find an egg and place it.', da_DK: 'Kun nyklækkede unger: find et æg og placér det.' },
  'tame.feed': { en_US: 'Feed it its favourite food.', da_DK: 'Giv den dens yndlingsføde.' },
  'tame.no': { en_US: 'Cannot be tamed.', da_DK: 'Kan ikke tæmmes.' },
  'ride.ground': { en_US: 'Rideable on land once tamed and saddled.', da_DK: 'Kan rides på land, når den er tæmmet og har sadel på.' },
  'ride.fly': { en_US: 'Rideable through the air once tamed and saddled.', da_DK: 'Kan rides gennem luften, når den er tæmmet og har sadel på.' },
  'ride.swim': { en_US: 'Rideable underwater once tamed and saddled.', da_DK: 'Kan rides under vandet, når den er tæmmet og har sadel på.' },
  'ride.no': { en_US: 'Not rideable.', da_DK: 'Kan ikke rides.' },
  'ride.seats': { en_US: ' (%s seats)', da_DK: ' (%s sæder)' },
  'help.taming1': {
    en_US: "§6Taming:§r hold a creature's favourite food (meat for carnivores; ferns, ginkgo nuts or cycad cones for herbivores; fish for sea and flying reptiles) and feed it until hearts appear.",
    da_DK: '§6Tæmning:§r hold et dyrs yndlingsføde (kød til kødædere; bregner, ginkgonødder eller koglepalmekogler til planteædere; fisk til havkrybdyr og flyveøgler) og fodr det, til der kommer hjerter.',
  },
  'help.taming2': {
    en_US: '§6Apex predators§r such as T. rex can only be tamed as hatchlings. Adults sometimes lay eggs. Place an egg and after a few minutes it hatches into a baby that is tame for you.',
    da_DK: '§6Toprovdyr§r som T. rex kan kun tæmmes som nyklækkede unger. Voksne dyr lægger af og til æg. Placér et æg, og efter nogle minutter klækkes en unge, der er tam for dig.',
  },
  'help.taming3': {
    en_US: '§6Riding:§r saddle a tamed adult of a rideable species (craft saddles from dino hide). Use WASD on land. To fly or swim, look where you want to go. Sneak to dismount, and use shears to take the saddle off.',
    da_DK: '§6Ridning:§r sæt en sadel på et tæmmet, voksent dyr af en art, der kan rides (sadler laves af dinoskind). Brug WASD på land. Når du flyver eller svømmer, styrer du ved at kigge, hvor du vil hen. Snig for at stige af, og brug en saks til at tage sadlen af.',
  },
  'help.taming4': { en_US: '§6Sitting:§r interact with a tamed creature to make it sit or follow.', da_DK: '§6Sid:§r interager med et tæmmet dyr for at få det til at sidde eller følge med.' },
  'help.park1': {
    en_US: "§eElectric fence:§r 1.5 blocks tall, so creatures can't step over it, and it links up with its neighbours. Place a §eFence Generator§r touching the fence and switch it on by right-clicking it or powering it with redstone. Powered fences shock anything that touches them.",
    da_DK: '§eElektrisk hegn:§r 1,5 blok højt, så dyrene ikke kan træde over det, og det forbinder sig med naboerne. Placér en §eHegnsgenerator§r, der rører hegnet, og tænd den ved at højreklikke på den eller give den strøm med redstone. Hegn med strøm giver stød til alt, der rører dem.',
  },
  'help.park2': { en_US: 'Big carnivores will smash through fences that have no power!', da_DK: 'Store kødædere smadrer hegn, der ikke har strøm!' },
  'help.park3': {
    en_US: '§eVehicles:§r the Safari Truck and the Tour Car seat four, and the Gyrosphere seats two. Place one, climb in and drive with WASD. Hit it to pick it back up.',
    da_DK: '§eKøretøjer:§r Safarivognen og Turbilen har plads til fire, og Gyrosfæren har plads til to. Placér et køretøj, kravl ind og kør med WASD. Slå på det for at samle det op igen.',
  },
  'msg.welcome': {
    en_US: '§6[Prehistoric Dinosaurs]§r You received a §aDino Field Guide§r. Use it to learn about every creature!',
    da_DK: '§6[Forhistoriske Dinosaurer]§r Du har fået en §aDino-felthåndbog§r. Brug den til at lære om alle dyrene!',
  },
  'msg.hatched': { en_US: '§aYour %s egg hatched!', da_DK: '§aDit %s-æg er klækket!' },
  'msg.fence_on': { en_US: '§eFence power: §aON', da_DK: '§eHegnsstrøm: §aTÆNDT' },
  'msg.fence_off': { en_US: '§eFence power: §cOFF', da_DK: '§eHegnsstrøm: §cSLUKKET' },
};

export const GROUP_NAMES: Record<string, Record<Locale, string>> = {
  theropod: { en_US: 'Theropods (meat-eaters)', da_DK: 'Theropoder (kødædere)' },
  bird: { en_US: 'Early birds', da_DK: 'Tidlige fugle' },
  sauropod: { en_US: 'Sauropods (long-necks)', da_DK: 'Sauropoder (langhalse)' },
  ornithopod: { en_US: 'Ornithopods & duck-bills', da_DK: 'Ornithopoder og andenæbsdinosaurer' },
  ceratopsian: { en_US: 'Horned dinosaurs', da_DK: 'Hornede dinosaurer' },
  thyreophoran: { en_US: 'Armoured & plated', da_DK: 'Panser- og pladedinosaurer' },
  pterosaur: { en_US: 'Pterosaurs (flyers)', da_DK: 'Flyveøgler' },
  marine_reptile: { en_US: 'Marine reptiles', da_DK: 'Havkrybdyr' },
  fish: { en_US: 'Prehistoric fish', da_DK: 'Forhistoriske fisk' },
  crocodilian: { en_US: 'Crocodilians', da_DK: 'Krokodiller' },
  snake: { en_US: 'Snakes', da_DK: 'Slanger' },
  synapsid: { en_US: 'Synapsids', da_DK: 'Synapsider' },
};

const TREE_DA: Record<string, string> = { ginkgo: 'Ginkgo', araucaria: 'Abeskræk', dawn_redwood: 'Vandgran', lepidodendron: 'Skæltræ', tree_fern: 'Træbregne' };

/** Danish names for blocks, items, vehicles and the biome, keyed by identifier (without namespace). */
export const DA_GAME_NAMES: Record<string, string> = {
  fern: 'Forhistorisk bregne',
  horsetail: 'Padderok',
  cycad: 'Koglepalme',
  club_moss: 'Ulvefod',
  williamsonia: 'Williamsonia',
  magnolia: 'Oldtidsmagnolie',
  fossil_block: 'Fossilblok',
  amber_ore: 'Ravmalm',
  deepslate_amber_ore: 'Dybskifer-ravmalm',
  electric_fence: 'Elektrisk hegn',
  fence_generator: 'Hegnsgenerator',
  raw_dino_meat: 'Råt dinokød',
  cooked_dino_meat: 'Dinobøf',
  ginkgo_nut: 'Ginkgonød',
  cycad_cone: 'Koglepalmekogle',
  dino_hide: 'Dinoskind',
  prehistoric_feather: 'Forhistorisk fjer',
  armor_scute: 'Panserskæl',
  megalodon_tooth: 'Megalodontand',
  fossil_fragment: 'Fossilstykke',
  amber: 'Rav',
  amber_mosquito: 'Myg i rav',
  field_guide: 'Dino-felthåndbog',
  safari_truck: 'Safarivogn',
  tour_car: 'Turbil',
  gyrosphere: 'Gyrosfære',
  prehistoric_jungle: 'Forhistorisk jungle',
  ginkgo: 'Ginkgo (tempeltræ)',
  araucaria: 'Abeskræk',
  dawn_redwood: 'Vandgran',
  lepidodendron: 'Skæltræ',
  tree_fern: 'Træbregne',
  ...Object.fromEntries(
    Object.entries(TREE_DA).flatMap(([id, p]) => {
      const stem = p.toLowerCase().replace(/^./, (c) => c.toUpperCase());
      return [
        [`${id}_log`, `${stem}stamme`],
        [`${id}_planks`, `${stem}planker`],
        [`${id}_leaves`, `${stem}løv`],
        [`${id}_sapling`, `${stem}spire`],
      ];
    }),
  ),
};

/**
 * Builds the Danish lang file from the English one: names get translated where we have a
 * Danish name, creature names stay scientific, eggs become "<navn>-æg".
 */
export function danishLang(enLines: string[]): string[] {
  const out: string[] = [];
  for (const line of enLines) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    const id = key.match(/dino:([a-z0-9_]+)/)?.[1] ?? '';
    let da = value;
    if (key.startsWith('item.spawn_egg.')) da = `${value.replace(/ Spawn Egg$/, '')} – fremkaldelsesæg`;
    else if (/^(item|entity)\.dino:[a-z_]+_egg\.name$|^entity\.dino:egg_/.test(key)) da = `${value.replace(/ Egg$/, '')}-æg`;
    else if (DA_GAME_NAMES[id]) da = DA_GAME_NAMES[id];
    out.push(`${key}=${da}`);
  }
  return out;
}

/** Field guide content keys: creature facts and terms, per locale. */
export function guideLang(locale: Locale, creatures: { id: string; info: string }[], plants: { id: string; name: string; info: string }[]): string[] {
  const da = locale === 'da_DK';
  const lines: string[] = [];
  for (const [k, v] of Object.entries(UI)) lines.push(`dino.ui.${k}=${v[locale]}`);
  for (const [k, v] of Object.entries(GROUP_NAMES)) lines.push(`dino.group.${k}=${v[locale]}`);
  for (const c of creatures) lines.push(`dino.info.${c.id}=${da ? (DA_INFO[c.id] ?? c.info) : c.info}`);
  for (const p of plants) {
    lines.push(`dino.plant.${p.id}.name=${da ? (DA_GAME_NAMES[p.id] ?? p.name) : p.name}`);
    lines.push(`dino.plant.${p.id}.info=${da ? (DA_PLANT_INFO[p.id] ?? p.info) : p.info}`);
  }
  const terms = ['Devonian', 'Permian', 'Triassic', 'Jurassic', 'Cretaceous', 'Paleogene', 'Neogene', 'carnivore', 'herbivore', 'piscivore', 'omnivore', 'insectivore', 'passive', 'skittish', 'neutral', 'aggressive'];
  for (const t of terms) lines.push(`dino.term.${t}=${da ? (DA_TERMS[t] ?? t) : t}`);
  return lines;
}

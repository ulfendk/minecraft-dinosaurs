# Java edition emitter (planned)

The Bedrock pipeline was designed so a Java port (Fabric or NeoForge with
[GeckoLib](https://github.com/bernie-g/geckolib)) can reuse almost everything:

| Bedrock output | Java reuse |
|---|---|
| `models/entity/dino/<id>.geo.json` (format 1.16.0, box UV) | GeckoLib reads Bedrock geometry directly → `assets/dinosaurs/geo/<id>.geo.json` |
| `textures/entity/dino/<id>.png` | copy to `assets/dinosaurs/textures/entity/<id>.png` |
| Molang animations (`animations/dino/<id>.animation.json`) | GeckoLib supports Molang. The variables we set in `pre_animation` (`variable.gait`, `variable.ph`…) can be moved into the animation, or set from a `GeoModel` with `MolangParser.setValue` |
| `CreatureDef` (stats, diet, temperament, taming, riding, spawn biomes, drops) | generate `EntityType` registration, attribute suppliers, goals (`MeleeAttackGoal`, `TemptGoal`, `FollowOwnerGoal` …), spawn placements and biome modifiers |
| loot tables / recipes | translate to Java data-pack JSON (same structure, `minecraft:` item ids differ in places) |
| plants, trees (`.mcstructure`) | blocks via data generators; trees via `ConfiguredFeature` + NBT structure templates |

## Planned shape

```ts
// src/emit/java/index.ts (to be implemented)
export interface JavaEmitter {
  /** writes a Gradle sub-project (mod id `dinosaurs`) with generated Java sources + assets */
  emit(creatures: Assembled[], outDir: string): Promise<void>;
}
```

Identifiers use the `dino:` namespace on Bedrock and map one-to-one to `dinosaurs:` resource locations on Java.

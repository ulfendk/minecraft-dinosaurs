package dk.ulfen.dinosaurs;

import dk.ulfen.dinosaurs.entity.DinoEggEntity;
import dk.ulfen.dinosaurs.entity.DinoEntity;
import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectionContext;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.FluidTags;
import net.minecraft.tags.TagKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.SpawnPlacementTypes;
import net.minecraft.world.entity.SpawnPlacements;
import net.minecraft.world.level.levelgen.Heightmap;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

public final class ModEntities {
	public static final Map<String, EntityType<DinoEntity>> TYPES = new LinkedHashMap<>();
	private static final Map<EntityType<?>, CreatureSpec> SPECS = new HashMap<>();
	public static EntityType<DinoEggEntity> EGG;

	public static CreatureSpec spec(EntityType<?> type) {
		CreatureSpec s = SPECS.get(type);
		if (s == null) throw new IllegalStateException("no spec for " + type);
		return s;
	}

	static void register(List<CreatureSpec> specs) {
		for (CreatureSpec s : specs) {
			ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, DinosaursMod.id(s.id));
			MobCategory cat = s.swims() ? MobCategory.WATER_CREATURE : MobCategory.CREATURE;
			EntityType.Builder<DinoEntity> b = EntityType.Builder.<DinoEntity>of(DinoEntity::new, cat)
				.sized(s.width, s.height)
				.clientTrackingRange(s.big ? 12 : 10);
			// specs must be known before the first instance is constructed
			EntityType<DinoEntity> type = b.build(key);
			SPECS.put(type, s);
			Registry.register(BuiltInRegistries.ENTITY_TYPE, key, type);
			TYPES.put(s.id, type);
			FabricDefaultAttributeRegistry.register(type, DinoEntity.createAttributes(s));
			if (s.swims()) {
				SpawnPlacements.register(type, SpawnPlacementTypes.IN_WATER, Heightmap.Types.OCEAN_FLOOR,
					(t, level, reason, pos, random) -> level.getFluidState(pos).is(FluidTags.WATER) && level.getFluidState(pos.above()).is(FluidTags.WATER));
			} else {
				SpawnPlacements.register(type, SpawnPlacementTypes.ON_GROUND, Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, Mob::checkMobSpawnRules);
			}
			if (s.spawn != null) BiomeModifications.addSpawn(biomes(s.spawn.biomes), cat, type, Math.max(1, s.spawn.weight), s.spawn.min, s.spawn.max);
		}
		ResourceKey<EntityType<?>> eggKey = ResourceKey.create(Registries.ENTITY_TYPE, DinosaursMod.id("egg"));
		EGG = Registry.register(BuiltInRegistries.ENTITY_TYPE, eggKey,
			EntityType.Builder.<DinoEggEntity>of(DinoEggEntity::new, MobCategory.MISC).sized(0.5F, 0.6F).clientTrackingRange(8).build(eggKey));
	}

	private static Predicate<BiomeSelectionContext> biomes(List<String> selectors) {
		Predicate<BiomeSelectionContext> p = ctx -> false;
		for (String sel : selectors) {
			Predicate<BiomeSelectionContext> one = sel.startsWith("#")
				? BiomeSelectors.tag(TagKey.create(Registries.BIOME, Identifier.parse(sel.substring(1))))
				: BiomeSelectors.includeByKey(ResourceKey.create(Registries.BIOME, Identifier.parse(sel)));
			p = p.or(one);
		}
		return BiomeSelectors.foundInOverworld().and(p);
	}
}

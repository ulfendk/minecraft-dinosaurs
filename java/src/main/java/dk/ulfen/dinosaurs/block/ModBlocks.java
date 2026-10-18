package dk.ulfen.dinosaurs.block;

import dk.ulfen.dinosaurs.DinosaursMod;
import dk.ulfen.dinosaurs.ModItems;
import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectionContext;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.TagKey;
import net.minecraft.util.valueproviders.ConstantInt;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.sounds.AmbientLeavesBlockSoundPlayer;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.DropExperienceBlock;
import net.minecraft.world.level.block.RotatedPillarBlock;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.LeavesBlock;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.properties.NoteBlockInstrument;
import net.minecraft.world.level.levelgen.GenerationStep;
import net.minecraft.world.level.levelgen.placement.PlacedFeature;
import net.minecraft.world.level.material.MapColor;
import net.minecraft.world.level.material.PushReaction;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;

/** Ancient plants, prehistoric trees, fossils and amber, plus their world generation. */
public final class ModBlocks {
	public static final Map<String, Block> BLOCKS = new LinkedHashMap<>();

	public static Block register(String id, Function<BlockBehaviour.Properties, Block> factory, BlockBehaviour.Properties props) {
		ResourceKey<Block> key = ResourceKey.create(Registries.BLOCK, DinosaursMod.id(id));
		Block block = Registry.register(BuiltInRegistries.BLOCK, key, factory.apply(props.setId(key)));
		ModItems.register(id, p -> new BlockItem(block, p), new Item.Properties().useBlockDescriptionPrefix());
		BLOCKS.put(id, block);
		return block;
	}

	private static BlockBehaviour.Properties plant() {
		return BlockBehaviour.Properties.of().mapColor(MapColor.PLANT).noCollision().instabreak().sound(SoundType.GRASS)
			.offsetType(BlockBehaviour.OffsetType.XZ).ignitedByLava().pushReaction(PushReaction.POPPED);
	}

	public static void init() {
		BlockSpec spec = BlockSpec.load();
		Registry.register(BuiltInRegistries.FEATURE_TYPE, DinosaursMod.id("structure_tree"), StructureTreeFeature.CODEC);

		for (BlockSpec.Plant p : spec.plants) register(p.id, props -> new AncientPlantBlock(props, p.height), plant().replaceable());

		for (BlockSpec.Tree t : spec.trees) {
			register(t.id + "_log", RotatedPillarBlock::new, Blocks.logProperties(MapColor.WOOD, MapColor.PODZOL, SoundType.WOOD));
			register(t.id + "_planks", Block::new,
				BlockBehaviour.Properties.of().mapColor(MapColor.WOOD).instrument(NoteBlockInstrument.BASS).strength(2.0F, 3.0F).sound(SoundType.WOOD).ignitedByLava());
			register(t.id + "_leaves", props -> new LeavesBlock(AmbientLeavesBlockSoundPlayer.noAmbientSound(), props), Blocks.leavesProperties(SoundType.GRASS));
			List<Identifier> structures = t.structures.stream().map(Identifier::parse).toList();
			register(t.id + "_sapling", props -> new AncientSaplingBlock(props, structures), plant().randomTicks());
		}

		register("fossil_block", Block::new,
			BlockBehaviour.Properties.of().mapColor(MapColor.SAND).instrument(NoteBlockInstrument.BASEDRUM).requiresCorrectToolForDrops().strength(3.0F, 6.0F));
		register("amber_ore", props -> new DropExperienceBlock(ConstantInt.of(2), props),
			BlockBehaviour.Properties.of().mapColor(MapColor.STONE).instrument(NoteBlockInstrument.BASEDRUM).requiresCorrectToolForDrops().strength(3.0F, 3.0F));
		register("deepslate_amber_ore", props -> new DropExperienceBlock(ConstantInt.of(2), props),
			BlockBehaviour.Properties.of().mapColor(MapColor.DEEPSLATE).instrument(NoteBlockInstrument.BASEDRUM).requiresCorrectToolForDrops().strength(4.5F, 3.0F).sound(SoundType.DEEPSLATE));

		for (BlockSpec.FeatureSpec f : spec.features) {
			ResourceKey<PlacedFeature> key = ResourceKey.create(Registries.PLACED_FEATURE, Identifier.parse(f.feature));
			BiomeModifications.addFeature(biomes(f.biomes), GenerationStep.Decoration.valueOf(f.step), key);
		}
	}

	private static Predicate<BiomeSelectionContext> biomes(List<String> selectors) {
		Predicate<BiomeSelectionContext> p = ctx -> false;
		for (String sel : selectors) {
			p = p.or(sel.startsWith("#")
				? BiomeSelectors.tag(TagKey.create(Registries.BIOME, Identifier.parse(sel.substring(1))))
				: BiomeSelectors.includeByKey(ResourceKey.create(Registries.BIOME, Identifier.parse(sel))));
		}
		return BiomeSelectors.foundInOverworld().and(p);
	}
}

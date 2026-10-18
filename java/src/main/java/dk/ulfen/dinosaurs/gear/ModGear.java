package dk.ulfen.dinosaurs.gear;

import dk.ulfen.dinosaurs.DinosaursMod;
import dk.ulfen.dinosaurs.ModItems;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ToolMaterial;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;

import java.util.function.Function;

/** Park & ranger gear: electric fence, fence generator, electric prod, tranquilizer rifle + darts. */
public final class ModGear {
	public static Block ELECTRIC_FENCE, FENCE_GENERATOR;
	public static Item ELECTRIC_PROD, TRANQUILIZER_RIFLE, TRANQ_DART;
	public static EntityType<TranqDartEntity> DART;

	private ModGear() {}

	private static Block block(String id, Function<BlockBehaviour.Properties, Block> factory, BlockBehaviour.Properties props) {
		ResourceKey<Block> key = ResourceKey.create(Registries.BLOCK, DinosaursMod.id(id));
		Block block = Registry.register(BuiltInRegistries.BLOCK, key, factory.apply(props.setId(key)));
		ModItems.register(id, p -> new BlockItem(block, p), new Item.Properties().useBlockDescriptionPrefix());
		return block;
	}

	public static void init() {
		ELECTRIC_FENCE = block("electric_fence", ElectricFenceBlock::new, BlockBehaviour.Properties.of()
			.mapColor(MapColor.METAL)
			.forceSolidOn()
			.strength(3.0F, 20.0F)
			.sound(SoundType.METAL)
			.noOcclusion()
			.lightLevel(s -> s.getValue(ElectricFenceBlock.POWERED) ? 4 : 0));
		FENCE_GENERATOR = block("fence_generator", FenceGeneratorBlock::new, BlockBehaviour.Properties.of()
			.mapColor(MapColor.COLOR_YELLOW)
			.strength(3.0F, 20.0F)
			.sound(SoundType.METAL)
			.lightLevel(s -> s.getValue(FenceGeneratorBlock.ON) ? 7 : 0));

		ELECTRIC_PROD = ModItems.register("electric_prod", ElectricProdItem::new, new Item.Properties().sword(ToolMaterial.IRON, 1.0F, -2.6F));
		TRANQUILIZER_RIFLE = ModItems.register("tranquilizer_rifle", TranquilizerRifleItem::new, new Item.Properties().stacksTo(1).durability(384));
		TRANQ_DART = ModItems.register("tranq_dart", new Item.Properties().stacksTo(64));

		ResourceKey<EntityType<?>> dartKey = ResourceKey.create(Registries.ENTITY_TYPE, DinosaursMod.id("tranq_dart"));
		DART = Registry.register(BuiltInRegistries.ENTITY_TYPE, dartKey,
			EntityType.Builder.<TranqDartEntity>of(TranqDartEntity::new, MobCategory.MISC).noLootTable().sized(0.25F, 0.25F).clientTrackingRange(4).updateInterval(10).build(dartKey));

		ServerTickEvents.END_LEVEL_TICK.register(FenceNetwork::tick);
	}
}

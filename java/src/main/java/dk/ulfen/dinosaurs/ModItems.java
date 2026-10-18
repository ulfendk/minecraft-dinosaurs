package dk.ulfen.dinosaurs;

import dk.ulfen.dinosaurs.entity.DinoEggItem;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.item.SpawnEggItem;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

public final class ModItems {
	/** every item of the mod in creative-tab order */
	public static final List<Item> TAB = new ArrayList<>();
	private static final Map<String, Item> EGGS = new HashMap<>();

	public static Item RAW_DINO_MEAT, COOKED_DINO_MEAT, FIELD_GUIDE;

	public static Item register(String id, Function<Item.Properties, Item> factory, Item.Properties props) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, DinosaursMod.id(id));
		Item item = Registry.register(BuiltInRegistries.ITEM, key, factory.apply(props.setId(key)));
		TAB.add(item);
		return item;
	}

	public static Item register(String id, Item.Properties props) {
		return register(id, Item::new, props);
	}

	public static Item egg(String species) {
		return EGGS.get(species);
	}

	static void register(List<CreatureSpec> specs) {
		RAW_DINO_MEAT = register("raw_dino_meat", new Item.Properties().food(new FoodProperties.Builder().nutrition(4).saturationModifier(0.3F).build()));
		COOKED_DINO_MEAT = register("cooked_dino_meat", new Item.Properties().food(new FoodProperties.Builder().nutrition(9).saturationModifier(0.8F).build()));
		register("ginkgo_nut", new Item.Properties().food(new FoodProperties.Builder().nutrition(2).saturationModifier(0.3F).build()));
		register("cycad_cone", new Item.Properties().food(new FoodProperties.Builder().nutrition(3).saturationModifier(0.4F).build()));
		for (String id : List.of("dino_hide", "prehistoric_feather", "armor_scute", "fossil_fragment", "amber")) register(id, new Item.Properties());
		register("megalodon_tooth", new Item.Properties().rarity(Rarity.RARE));
		register("amber_mosquito", new Item.Properties().rarity(Rarity.EPIC));
		FIELD_GUIDE = register("field_guide", FieldGuideItem::new, new Item.Properties().stacksTo(1));

		for (CreatureSpec s : specs) {
			var type = ModEntities.TYPES.get(s.id);
			register(s.id + "_spawn_egg", SpawnEggItem::new, new Item.Properties().spawnEgg(type));
			if (s.lays) EGGS.put(s.id, register(s.id + "_egg", p -> new DinoEggItem(p, s.id), new Item.Properties().stacksTo(16)));
		}
	}

	static void registerTab() {
		ResourceKey<CreativeModeTab> key = ResourceKey.create(Registries.CREATIVE_MODE_TAB, DinosaursMod.id("main"));
		Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, key, FabricCreativeModeTab.builder()
			.title(Component.translatable("itemGroup.dinosaurs"))
			.icon(() -> new ItemStack(ModItems.egg("tyrannosaurus") != null ? ModItems.egg("tyrannosaurus") : RAW_DINO_MEAT))
			.displayItems((params, output) -> TAB.forEach(output::accept))
			.build());
	}
}

package dk.ulfen.dinosaurs.vehicle;

import dk.ulfen.dinosaurs.DinosaursMod;
import dk.ulfen.dinosaurs.ModItems;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.Item;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Safari truck, tour car and gyrosphere. */
public final class ModVehicles {
	public static List<VehicleSpec> SPECS = List.of();
	public static final Map<String, EntityType<VehicleEntity>> TYPES = new LinkedHashMap<>();
	private static final Map<EntityType<?>, VehicleSpec> BY_TYPE = new HashMap<>();
	private static final Map<String, Item> ITEMS = new HashMap<>();

	public static VehicleSpec spec(EntityType<?> type) {
		VehicleSpec s = BY_TYPE.get(type);
		if (s == null) throw new IllegalStateException("no vehicle spec for " + type);
		return s;
	}

	public static EntityType<VehicleEntity> type(String id) {
		return TYPES.get(id);
	}

	public static Item item(String id) {
		return ITEMS.get(id);
	}

	public static void init() {
		SPECS = VehicleSpec.load();
		for (VehicleSpec s : SPECS) {
			ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, DinosaursMod.id(s.id));
			EntityType<VehicleEntity> type = EntityType.Builder.<VehicleEntity>of(VehicleEntity::new, MobCategory.MISC)
				.sized(s.width, s.height)
				.fireImmune()
				.clientTrackingRange(10)
				.build(key);
			BY_TYPE.put(type, s);
			Registry.register(BuiltInRegistries.ENTITY_TYPE, key, type);
			TYPES.put(s.id, type);
			FabricDefaultAttributeRegistry.register(type, VehicleEntity.createAttributes(s));
			ITEMS.put(s.id, ModItems.register(s.id, p -> new VehicleItem(p, s.id), new Item.Properties().stacksTo(1)));
		}
	}
}

package dk.ulfen.dinosaurs;

import dk.ulfen.dinosaurs.block.ModBlocks;
import dk.ulfen.dinosaurs.gear.ModGear;
import dk.ulfen.dinosaurs.vehicle.ModVehicles;
import net.fabricmc.api.ModInitializer;
import net.minecraft.resources.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

public class DinosaursMod implements ModInitializer {
	public static final String MOD_ID = "dinosaurs";
	public static final Logger LOG = LoggerFactory.getLogger(MOD_ID);
	public static List<CreatureSpec> SPECS;

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(MOD_ID, path);
	}

	@Override
	public void onInitialize() {
		SPECS = CreatureSpec.load();
		ModEntities.register(SPECS);
		ModItems.register(SPECS);
		ModBlocks.init();
		ModGear.init();
		ModVehicles.init();
		ModItems.registerTab();
		LOG.info("Prehistoric Dinosaurs: {} creatures registered", SPECS.size());
	}
}

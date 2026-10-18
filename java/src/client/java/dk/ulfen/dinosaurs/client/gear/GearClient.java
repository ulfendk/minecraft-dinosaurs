package dk.ulfen.dinosaurs.client.gear;

import dk.ulfen.dinosaurs.gear.ModGear;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;
import net.minecraft.client.renderer.entity.ThrownItemRenderer;

/** Client registration for the park & gear subsystem. */
public final class GearClient {
	public static void init() {
		// the dart flies as its (syringe) item sprite, like thrown items
		EntityRendererRegistry.register(ModGear.DART, ctx -> new ThrownItemRenderer<>(ctx, 0.8F, false));
	}
}

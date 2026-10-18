package dk.ulfen.dinosaurs.client.vehicle;

import com.geckolib.loading.math.MolangQueries;
import dk.ulfen.dinosaurs.vehicle.ModVehicles;
import dk.ulfen.dinosaurs.vehicle.VehicleEntity;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;

/** Vehicle renderers and the animation variables they read. */
public final class VehiclesClient {
	public static void init() {
		MolangQueries.<Object>setActorVariable("variable.veh_dist", a -> a.animatable() instanceof VehicleEntity v ? v.drivenDistance : 0);
		MolangQueries.<Object>setActorVariable("variable.veh_speed", a -> a.animatable() instanceof VehicleEntity v ? v.drivenSpeed : 0);
		for (var spec : ModVehicles.SPECS) EntityRendererRegistry.register(ModVehicles.type(spec.id), ctx -> new VehicleRenderer<>(ctx, spec));
	}
}

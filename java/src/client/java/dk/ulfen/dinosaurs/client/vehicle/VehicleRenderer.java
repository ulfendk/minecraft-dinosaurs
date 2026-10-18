package dk.ulfen.dinosaurs.client.vehicle;

import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.GeoRenderState;
import dk.ulfen.dinosaurs.DinosaursMod;
import dk.ulfen.dinosaurs.vehicle.VehicleEntity;
import dk.ulfen.dinosaurs.vehicle.VehicleSpec;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.client.renderer.rendertype.RenderType;
import net.minecraft.client.renderer.rendertype.RenderTypes;
import net.minecraft.resources.Identifier;
import org.jspecify.annotations.Nullable;

/** GeckoLib renderer for the vehicles, scaled like the Bedrock version, with see-through glass. */
public class VehicleRenderer<R extends LivingEntityRenderState & GeoRenderState> extends GeoEntityRenderer<VehicleEntity, R> {
	private final boolean translucent;

	public VehicleRenderer(EntityRendererProvider.Context ctx, VehicleSpec spec) {
		super(ctx, new DefaultedEntityGeoModel<>(DinosaursMod.id(spec.id)));
		this.withScale(spec.scale);
		this.shadowRadius = spec.width * 0.45F;
		this.translucent = spec.translucent;
	}

	@Override
	public @Nullable RenderType getRenderType(R renderState, Identifier texture) {
		// the glass texels are half transparent; cutout would draw them solid
		if (translucent && !renderState.isInvisible) return RenderTypes.entityTranslucent(texture);
		return super.getRenderType(renderState, texture);
	}
}

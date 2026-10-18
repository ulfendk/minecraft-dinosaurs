package dk.ulfen.dinosaurs.client;

import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.GeoRenderState;
import dk.ulfen.dinosaurs.DinosaursMod;
import dk.ulfen.dinosaurs.entity.DinoEggEntity;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.EntityRenderState;
import net.minecraft.resources.Identifier;
import org.jspecify.annotations.Nullable;

/** One egg model; the texture follows the species. */
public class EggRenderer<R extends EntityRenderState & GeoRenderState> extends GeoEntityRenderer<DinoEggEntity, R> {
	static final DataTicket<String> SPECIES = DataTicket.create("dinosaurs_egg_species", String.class);

	public EggRenderer(EntityRendererProvider.Context ctx) {
		super(ctx, new DefaultedEntityGeoModel<>(DinosaursMod.id("egg")) {
			@Override
			public Identifier getTextureResource(GeoRenderState renderState) {
				String species = renderState.getOrDefaultGeckolibData(SPECIES, "tyrannosaurus");
				return DinosaursMod.id("textures/entity/egg_" + species + ".png");
			}
		});
	}

	@Override
	public void addRenderData(DinoEggEntity animatable, @Nullable Void relatedObject, R renderState, float partialTick) {
		renderState.addGeckolibData(SPECIES, animatable.species());
	}
}

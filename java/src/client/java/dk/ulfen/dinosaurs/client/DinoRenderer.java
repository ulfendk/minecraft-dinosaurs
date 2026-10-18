package dk.ulfen.dinosaurs.client;

import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.BoneSnapshots;
import com.geckolib.renderer.base.GeoRenderState;
import com.geckolib.renderer.base.RenderPassInfo;
import dk.ulfen.dinosaurs.CreatureSpec;
import dk.ulfen.dinosaurs.DinosaursMod;
import dk.ulfen.dinosaurs.entity.DinoEntity;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import org.jspecify.annotations.Nullable;

/** GeckoLib renderer for every creature: scaled per species, saddle only drawn when saddled. */
public class DinoRenderer<R extends LivingEntityRenderState & GeoRenderState> extends GeoEntityRenderer<DinoEntity, R> {
	static final DataTicket<Boolean> SADDLED = DataTicket.create("dinosaurs_saddled", Boolean.class);

	public DinoRenderer(EntityRendererProvider.Context ctx, CreatureSpec spec) {
		super(ctx, new DefaultedEntityGeoModel<>(DinosaursMod.id(spec.id)));
		this.withScale(spec.scale);
		this.shadowRadius = Math.min(2.5F, spec.width * 0.5F);
	}

	@Override
	public void addRenderData(DinoEntity animatable, @Nullable Void relatedObject, R renderState, float partialTick) {
		renderState.addGeckolibData(SADDLED, animatable.isSaddled());
	}

	@Override
	public void adjustModelBonesForRender(RenderPassInfo<R> renderPassInfo, BoneSnapshots snapshots) {
		boolean saddled = Boolean.TRUE.equals(renderPassInfo.renderState().getGeckolibData(SADDLED));
		snapshots.get("saddle").ifPresent(bone -> bone.skipRender(!saddled));
	}
}

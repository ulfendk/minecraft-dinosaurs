package dk.ulfen.dinosaurs.client;

import com.geckolib.loading.math.MolangQueries;
import dk.ulfen.dinosaurs.DinosaursMod;
import dk.ulfen.dinosaurs.ModEntities;
import dk.ulfen.dinosaurs.entity.DinoEntity;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;
import net.minecraft.util.Mth;

public class DinosaursClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		registerAnimationVariables();
		for (var spec : DinosaursMod.SPECS) EntityRendererRegistry.register(ModEntities.TYPES.get(spec.id), ctx -> new DinoRenderer<>(ctx, spec));
		EntityRendererRegistry.register(ModEntities.EGG, EggRenderer::new);
		ClientSubsystems.init();
	}

	/** Values the generated animations read (see src/emit/java/anim.ts). */
	private static void registerAnimationVariables() {
		MolangQueries.<Object>setActorVariable("variable.dino_speed", a -> a.animatable() instanceof DinoEntity d ? Math.min(1.0, d.walkAnimation.speed(a.partialTick()) * 1.6) : 0);
		MolangQueries.<Object>setActorVariable("variable.dino_dist", a -> a.animatable() instanceof DinoEntity d ? d.walkedDistance : 0);
		MolangQueries.<Object>setActorVariable("variable.dino_pitch", a -> a.animatable() instanceof DinoEntity d ? d.getViewXRot(a.partialTick()) : 0);
		MolangQueries.<Object>setActorVariable("variable.dino_yaw", a -> a.animatable() instanceof DinoEntity d ? Mth.wrapDegrees(Mth.rotLerp(a.partialTick(), d.yHeadRotO, d.yHeadRot) - Mth.rotLerp(a.partialTick(), d.yBodyRotO, d.yBodyRot)) : 0);
		MolangQueries.<Object>setActorVariable("variable.dino_sit", a -> a.animatable() instanceof DinoEntity d && d.isInSittingPose() ? 1 : 0);
		MolangQueries.<Object>setActorVariable("variable.dino_sedated", a -> a.animatable() instanceof DinoEntity d && d.isSedated() ? 1 : 0);
		MolangQueries.<Object>setActorVariable("variable.dino_hunt_state", a -> a.animatable() instanceof DinoEntity d && d.isCarcass() ? 4 : 0);
		MolangQueries.<Object>setActorVariable("variable.dino_attack", a -> a.animatable() instanceof DinoEntity d ? d.getSwingAnimation(a.partialTick()) : 0);
	}
}

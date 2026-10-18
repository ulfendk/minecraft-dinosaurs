package dk.ulfen.dinosaurs.entity;

import dk.ulfen.dinosaurs.ModEntities;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;

/** Places a creature egg that later hatches into a tame baby. */
public class DinoEggItem extends Item {
	private final String species;

	public DinoEggItem(Item.Properties props, String species) {
		super(props);
		this.species = species;
	}

	@Override
	public InteractionResult useOn(UseOnContext ctx) {
		if (!(ctx.getLevel() instanceof ServerLevel level)) return InteractionResult.SUCCESS;
		var pos = ctx.getClickedPos().relative(ctx.getClickedFace());
		DinoEggEntity egg = ModEntities.EGG.create(level, EntitySpawnReason.SPAWN_ITEM_USE);
		if (egg == null) return InteractionResult.FAIL;
		egg.setup(species, ctx.getPlayer());
		egg.snapTo(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, 0, 0);
		level.addFreshEntity(egg);
		level.playSound(null, pos, SoundEvents.TURTLE_LAY_EGG, egg.getSoundSource(), 1.0F, 0.9F);
		ctx.getItemInHand().consume(1, ctx.getPlayer());
		return InteractionResult.SUCCESS_SERVER;
	}
}

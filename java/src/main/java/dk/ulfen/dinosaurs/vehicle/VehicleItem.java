package dk.ulfen.dinosaurs.vehicle;

import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;

/** Places a vehicle on the clicked block, facing the same way as the player. */
public class VehicleItem extends Item {
	private final String id;

	public VehicleItem(Item.Properties props, String id) {
		super(props);
		this.id = id;
	}

	@Override
	public InteractionResult useOn(UseOnContext ctx) {
		if (ctx.getClickedFace() == Direction.DOWN) return InteractionResult.FAIL;
		if (!(ctx.getLevel() instanceof ServerLevel level)) return InteractionResult.SUCCESS;
		EntityType<VehicleEntity> type = ModVehicles.type(id);
		var pos = ctx.getClickedPos().relative(ctx.getClickedFace());
		VehicleEntity v = type.create(level, EntitySpawnReason.SPAWN_ITEM_USE);
		if (v == null) return InteractionResult.FAIL;
		float yaw = ctx.getPlayer() != null ? ctx.getPlayer().getYRot() : ctx.getRotation();
		v.snapTo(pos.getX() + 0.5, pos.getY(), pos.getZ() + 0.5, yaw, 0);
		v.setYBodyRot(yaw);
		v.setYHeadRot(yaw);
		if (!level.noCollision(v, v.getBoundingBox())) return InteractionResult.FAIL;
		level.addFreshEntity(v);
		level.playSound(null, pos, SoundEvents.IRON_GOLEM_REPAIR, v.getSoundSource(), 0.8F, 1.2F);
		ctx.getItemInHand().consume(1, ctx.getPlayer());
		return InteractionResult.SUCCESS_SERVER;
	}
}

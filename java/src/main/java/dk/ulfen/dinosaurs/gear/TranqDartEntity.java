package dk.ulfen.dinosaurs.gear;

import dk.ulfen.dinosaurs.entity.DinoEntity;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.throwableitemprojectile.ThrowableItemProjectile;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.HitResult;

/** Fast, flat-flying sedative dart. Big animals need several hits (see DinoEntity#addSedativeDose). */
public class TranqDartEntity extends ThrowableItemProjectile {
	public TranqDartEntity(EntityType<? extends TranqDartEntity> type, Level level) {
		super(type, level);
	}

	public TranqDartEntity(ServerLevel level, LivingEntity owner, ItemStack stack) {
		super(ModGear.DART, owner, level, stack);
	}

	@Override
	protected Item getDefaultItem() {
		return ModGear.TRANQ_DART;
	}

	@Override
	protected double getDefaultGravity() {
		return 0.01;
	}

	@Override
	protected void onHitEntity(EntityHitResult hitResult) {
		super.onHitEntity(hitResult);
		if (!(this.level() instanceof ServerLevel level)) return;
		Entity target = hitResult.getEntity();
		target.hurtServer(level, this.damageSources().thrown(this, this.getOwner()), 1.0F);
		Player shooter = this.getOwner() instanceof Player p ? p : null;
		if (target instanceof DinoEntity dino && dino.isCarcass()) {
			return; // nothing left to sedate
		} else if (target instanceof DinoEntity dino) {
			boolean out = dino.addSedativeDose();
			if (shooter != null) {
				shooter.sendOverlayMessage(out
					? Component.translatable("dinosaurs.ui.msg.sedated", dino.getDisplayName())
					: Component.translatable("dinosaurs.ui.msg.dose", String.valueOf(dino.sedativeDose()), String.valueOf(dino.dosesNeeded())));
			}
		} else if (target instanceof LivingEntity living) {
			living.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, 200, 6), this.getOwner());
			living.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 200, 4), this.getOwner());
		}
	}

	@Override
	protected void onHit(HitResult hitResult) {
		super.onHit(hitResult);
		if (!this.level().isClientSide()) this.discard();
	}
}

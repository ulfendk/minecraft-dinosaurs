package dk.ulfen.dinosaurs.gear;

import dk.ulfen.dinosaurs.entity.DinoEntity;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

/** Melee shock: slows, weakens and pushes back whatever it hits (like the Bedrock prod). */
public class ElectricProdItem extends Item {
	public ElectricProdItem(Item.Properties properties) {
		super(properties);
	}

	@Override
	public void hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {
		if (!(target.level() instanceof ServerLevel level)) return;
		boolean big = target instanceof DinoEntity d && d.spec.big;
		target.addEffect(new MobEffectInstance(MobEffects.SLOWNESS, big ? 60 : 80, big ? 2 : 6), attacker);
		target.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 60, 2), attacker);
		double dx = target.getX() - attacker.getX(), dz = target.getZ() - attacker.getZ();
		target.knockback(big ? 0.6 : 1.4, -dx, -dz, level.damageSources().mobAttack(attacker), 0.0F);
		level.sendParticles(ParticleTypes.ELECTRIC_SPARK, target.getX(), target.getY() + target.getBbHeight() * 0.6, target.getZ(), 10, 0.4, 0.5, 0.4, 0.15);
		level.playSound(null, target.getX(), target.getY(), target.getZ(), SoundEvents.GENERIC_EXTINGUISH_FIRE, SoundSource.PLAYERS, 1.0F, 1.8F);
	}
}

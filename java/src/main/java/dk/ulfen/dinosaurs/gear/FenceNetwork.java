package dk.ulfen.dinosaurs.gear;

import dk.ulfen.dinosaurs.entity.DinoEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.shapes.CollisionContext;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Fence power propagation (like the Bedrock script's updateNetwork) and the shock loop. */
public final class FenceNetwork {
	private static final int MAX_FENCES = 4096;

	private FenceNetwork() {}

	/** Re-evaluates the fence network touching {@code start} and sets every fence's POWERED state. */
	public static void update(ServerLevel level, BlockPos start) {
		Set<BlockPos> seen = new HashSet<>();
		List<BlockPos> fences = new ArrayList<>();
		ArrayDeque<BlockPos> queue = new ArrayDeque<>();
		queue.add(start.immutable());
		boolean powered = false;
		while (!queue.isEmpty() && fences.size() < MAX_FENCES) {
			BlockPos at = queue.poll();
			if (!seen.add(at) || !level.isLoaded(at)) continue;
			if (!(level.getBlockState(at).getBlock() instanceof ElectricFenceBlock)) continue;
			fences.add(at);
			for (Direction d : Direction.values()) {
				BlockPos n = at.relative(d);
				BlockState ns = level.getBlockState(n);
				if (ns.getBlock() instanceof FenceGeneratorBlock && ns.getValue(FenceGeneratorBlock.ON)) powered = true;
				if (ns.getBlock() instanceof ElectricFenceBlock && !seen.contains(n)) queue.add(n);
			}
		}
		for (BlockPos p : fences) {
			BlockState s = level.getBlockState(p);
			if (s.getValue(ElectricFenceBlock.POWERED) != powered) level.setBlock(p, s.setValue(ElectricFenceBlock.POWERED, powered), Block.UPDATE_CLIENTS);
		}
	}

	/** Updates every fence network next to {@code pos} (after a fence or generator changed there). */
	public static void updateAround(ServerLevel level, BlockPos pos) {
		for (Direction d : Direction.values()) {
			BlockPos n = pos.relative(d);
			if (level.getBlockState(n).getBlock() instanceof ElectricFenceBlock) update(level, n);
		}
	}

	/** Every 8 ticks: creatures and players touching a fence get shocked, or smash it if it has no power. */
	public static void tick(ServerLevel level) {
		if (level.getGameTime() % 8 != 0 || level.players().isEmpty()) return;
		Set<LivingEntity> seen = new HashSet<>();
		for (ServerPlayer player : level.players()) {
			for (LivingEntity e : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(48.0), LivingEntity::isAlive)) {
				if (!seen.add(e) || e.isSpectator()) continue;
				touch(level, e);
			}
		}
	}

	private static void touch(ServerLevel level, LivingEntity e) {
		AABB box = e.getBoundingBox().inflate(0.12, 0.0, 0.12);
		int y1 = (int) Math.floor(Math.min(box.maxY, box.minY + 1.4));
		for (BlockPos pos : BlockPos.betweenClosed((int) Math.floor(box.minX), (int) Math.floor(box.minY), (int) Math.floor(box.minZ), (int) Math.floor(box.maxX), y1, (int) Math.floor(box.maxZ))) {
			BlockState state = level.getBlockState(pos);
			if (!(state.getBlock() instanceof ElectricFenceBlock)) continue;
			BlockPos at = pos.immutable();
			boolean hit = state.getCollisionShape(level, at, CollisionContext.empty()).toAabbs().stream().anyMatch(b -> b.move(at).intersects(box));
			if (!hit) continue;
			if (state.getValue(ElectricFenceBlock.POWERED)) {
				zap(level, e, at);
			} else if (e instanceof DinoEntity d && d.spec.big && d.spec.carnivore() && level.getRandom().nextFloat() < 0.08F) {
				level.destroyBlock(at, true, e);
				level.playSound(null, at, SoundEvents.ANVIL_BREAK, SoundSource.BLOCKS, 0.8F, 0.6F);
			}
			return;
		}
	}

	private static void zap(ServerLevel level, LivingEntity e, BlockPos fence) {
		boolean big = e instanceof DinoEntity d && d.spec.big;
		float damage = big ? 6.0F : 3.0F;
		DamageSource source = level.damageSources().lightningBolt();
		e.hurtServer(level, source, damage);
		e.knockback(1.0, fence.getX() + 0.5 - e.getX(), fence.getZ() + 0.5 - e.getZ(), source, damage);
		level.sendParticles(ParticleTypes.ELECTRIC_SPARK, e.getX(), e.getY() + e.getBbHeight() * 0.5, e.getZ(), 8, 0.3, 0.4, 0.3, 0.1);
		level.playSound(null, e.getX(), e.getY(), e.getZ(), SoundEvents.GENERIC_EXTINGUISH_FIRE, SoundSource.BLOCKS, 0.8F, 1.6F);
	}
}

package dk.ulfen.dinosaurs.entity;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.util.GeckoLibUtil;
import dk.ulfen.dinosaurs.ModEntities;
import dk.ulfen.dinosaurs.ModItems;
import net.minecraft.core.UUIDUtil;
import net.minecraft.core.particles.ItemParticleOption;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MoverType;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import org.jspecify.annotations.Nullable;

import java.util.UUID;

/** A placed creature egg. Hatches after a few minutes into a baby that is tame for whoever placed it. */
public class DinoEggEntity extends Entity implements GeoEntity {
	public static final EntityDataAccessor<String> SPECIES = SynchedEntityData.defineId(DinoEggEntity.class, EntityDataSerializers.STRING);
	private static final RawAnimation WOBBLE = RawAnimation.begin().thenLoop("animation.dinosaurs.egg.wobble");
	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);
	private @Nullable UUID owner;
	private int age;
	private int hatchAt = 4800 + 1200 * 2;

	public DinoEggEntity(EntityType<? extends DinoEggEntity> type, Level level) {
		super(type, level);
	}

	public void setup(String species, @Nullable Player placer) {
		this.entityData.set(SPECIES, species);
		this.owner = placer == null ? null : placer.getUUID();
		this.hatchAt = 4800 + this.random.nextInt(2400);
	}

	public String species() {
		return this.entityData.get(SPECIES);
	}

	@Override
	protected void defineSynchedData(SynchedEntityData.Builder builder) {
		builder.define(SPECIES, "tyrannosaurus");
	}

	@Override
	public void tick() {
		super.tick();
		if (!this.isNoGravity()) this.setDeltaMovement(this.getDeltaMovement().add(0, -0.04, 0));
		this.move(MoverType.SELF, this.getDeltaMovement());
		this.setDeltaMovement(this.getDeltaMovement().scale(0.9));
		if (this.level() instanceof ServerLevel server && ++age >= hatchAt) hatch(server);
	}

	private void hatch(ServerLevel level) {
		var type = ModEntities.TYPES.get(species());
		this.discard();
		if (type == null) return;
		DinoEntity baby = type.create(level, EntitySpawnReason.BREEDING);
		if (baby == null) return;
		baby.setAge(-24000);
		baby.snapTo(this.getX(), this.getY(), this.getZ(), this.random.nextFloat() * 360F, 0);
		Player p = owner == null ? null : level.getPlayerByUUID(owner);
		if (p != null) {
			baby.tame(p);
			p.sendSystemMessage(Component.translatable("dinosaurs.ui.msg.hatched", Component.translatable("entity.dinosaurs." + species())));
		}
		level.addFreshEntity(baby);
		level.playSound(null, this.blockPosition(), SoundEvents.TURTLE_EGG_HATCH, this.getSoundSource(), 1.0F, 0.8F);
		var item = ModItems.egg(species());
		if (item != null) level.sendParticles(new ItemParticleOption(ParticleTypes.ITEM, item), getX(), getY() + 0.3, getZ(), 12, 0.2, 0.2, 0.2, 0.05);
	}

	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float damage) {
		if (this.isRemoved()) return false;
		var item = ModItems.egg(species());
		if (item != null && !(source.getEntity() instanceof Player p && p.isCreative())) this.spawnAtLocation(level, new ItemStack(item));
		this.discard();
		return true;
	}

	@Override
	public boolean isPickable() {
		return !this.isRemoved();
	}

	@Override
	protected void addAdditionalSaveData(ValueOutput output) {
		output.putString("Species", species());
		output.putInt("Age", age);
		output.putInt("HatchAt", hatchAt);
		if (owner != null) output.store("Owner", UUIDUtil.CODEC, owner);
	}

	@Override
	protected void readAdditionalSaveData(ValueInput input) {
		this.entityData.set(SPECIES, input.getStringOr("Species", "tyrannosaurus"));
		age = input.getIntOr("Age", 0);
		hatchAt = input.getIntOr("HatchAt", hatchAt);
		owner = input.read("Owner", UUIDUtil.CODEC).orElse(null);
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		controllers.add(new AnimationController<>("wobble", 0, state -> state.setAndContinue(WOBBLE)));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return geoCache;
	}
}

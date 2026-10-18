package dk.ulfen.dinosaurs.vehicle;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.util.GeckoLibUtil;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.tags.DamageTypeTags;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.damagesource.DamageTypes;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

import java.util.List;

/**
 * A drivable park vehicle. Seat 0 drives: W/S accelerate and reverse, A/D steer.
 * Breaks like a boat when hit by players and drops its placer item.
 */
public class VehicleEntity extends Mob implements GeoEntity {
	private static final float TURN_RATE = 4.0F;
	public final VehicleSpec spec;
	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);
	private float damage;
	private int hurtTicks;
	/** client-side: distance driven (drives the wheel animation) */
	public float drivenDistance;
	/** client-side: smoothed horizontal speed in blocks/tick */
	public float drivenSpeed;

	public VehicleEntity(EntityType<? extends VehicleEntity> type, Level level) {
		super(type, level);
		this.spec = ModVehicles.spec(type);
		this.setPersistenceRequired();
	}

	public static AttributeSupplier.Builder createAttributes(VehicleSpec s) {
		return Mob.createMobAttributes()
			.add(Attributes.MAX_HEALTH, s.health)
			.add(Attributes.MOVEMENT_SPEED, s.speed)
			.add(Attributes.STEP_HEIGHT, 1.1)
			.add(Attributes.KNOCKBACK_RESISTANCE, 1.0);
	}

	// ------------------------------------------------------------ no AI, no despawn, no death drops

	@Override
	protected void registerGoals() {
	}

	@Override
	public boolean removeWhenFarAway(double distSqr) {
		return false;
	}

	@Override
	public boolean requiresCustomPersistence() {
		return true;
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource damageSource) {
		return false;
	}

	@Override
	protected void checkFallDamage(double ya, boolean onGround, BlockState onState, BlockPos pos) {
	}

	@Override
	public boolean canBreatheUnderwater() {
		return true;
	}

	@Override
	public boolean isAffectedByPotions() {
		return false;
	}

	@Override
	public boolean canBeLeashed() {
		return false;
	}

	@Override
	public boolean isPushable() {
		return false;
	}

	@Override
	public boolean canBeCollidedWith(@Nullable Entity other) {
		return other == null || !other.isPassengerOfSameVehicle(this);
	}

	@Override
	protected boolean shouldDropLoot(ServerLevel level) {
		return false;
	}

	// ------------------------------------------------------------ breaking (players only, like boats)

	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float amount) {
		if (this.isRemoved()) return true;
		if (source.is(DamageTypes.GENERIC_KILL) || source.is(DamageTypeTags.BYPASSES_INVULNERABILITY)) {
			this.ejectPassengers();
			this.discard();
			return true;
		}
		if (!(source.getEntity() instanceof Player player)) return false;
		if (player.getAbilities().instabuild) {
			this.ejectPassengers();
			this.discard();
			return true;
		}
		this.hurtTicks = 10;
		this.damage += Math.max(1.0F, amount) * 10.0F;
		this.playSound(SoundEvents.IRON_GOLEM_HURT, 0.6F, 1.4F);
		if (this.damage > 40.0F) {
			this.ejectPassengers();
			this.spawnAtLocation(level, new ItemStack(ModVehicles.item(spec.id)));
			this.playSound(SoundEvents.ITEM_BREAK.value(), 1.0F, 0.8F);
			this.discard();
		}
		return true;
	}

	@Override
	public void tick() {
		super.tick();
		if (hurtTicks > 0) hurtTicks--;
		else if (damage > 0) damage = Math.max(0, damage - 1.0F);
		this.yBodyRot = this.yHeadRot = this.getYRot();
		if (this.level().isClientSide()) {
			double dx = this.getX() - this.xo, dz = this.getZ() - this.zo;
			float moved = (float) Math.sqrt(dx * dx + dz * dz);
			// forward or backward relative to the facing direction
			Vec3 facing = Vec3.directionFromRotation(0, this.getYRot());
			float sign = dx * facing.x + dz * facing.z >= 0 ? 1 : -1;
			drivenDistance += sign * moved / spec.scale;
			drivenSpeed = drivenSpeed * 0.7F + moved * 0.3F;
		}
	}

	// ------------------------------------------------------------ riding

	@Override
	public InteractionResult interact(Player player, InteractionHand hand, Vec3 location) {
		if (player.isSecondaryUseActive() || this.getPassengers().size() >= spec.seats.size()) return InteractionResult.PASS;
		if (!this.level().isClientSide()) player.startRiding(this);
		return InteractionResult.SUCCESS;
	}

	@Override
	protected boolean canAddPassenger(Entity passenger) {
		return this.getPassengers().size() < spec.seats.size();
	}

	@Override
	public @Nullable LivingEntity getControllingPassenger() {
		return this.getFirstPassenger() instanceof Player p ? p : null;
	}

	@Override
	protected Vec3 getPassengerAttachmentPoint(Entity passenger, EntityDimensions dimensions, float scale) {
		int i = Math.max(0, this.getPassengers().indexOf(passenger));
		List<Double> p = spec.seats.get(Math.min(i, spec.seats.size() - 1));
		return new Vec3(p.get(0), p.get(1), p.get(2)).yRot(-this.getYRot() * Mth.DEG_TO_RAD);
	}

	@Override
	protected void positionRider(Entity passenger, Entity.MoveFunction moveFunction) {
		super.positionRider(passenger, moveFunction);
		// passengers face forward but may look around, like in boats
		if (passenger instanceof LivingEntity living) living.setYBodyRot(this.getYRot());
		float delta = Mth.wrapDegrees(passenger.getYRot() - this.getYRot());
		float clamped = Mth.clamp(delta, -105.0F, 105.0F);
		passenger.yRotO += clamped - delta;
		passenger.setYRot(passenger.getYRot() + clamped - delta);
		passenger.setYHeadRot(passenger.getYRot());
	}

	@Override
	public void onPassengerTurned(Entity passenger) {
		positionRider(passenger, Entity::setPos);
	}

	@Override
	protected void tickRidden(Player controller, Vec3 riddenInput) {
		super.tickRidden(controller, riddenInput);
		if (this.isLocalInstanceAuthoritative()) {
			// A/D steer; steering reverses when backing up and only works while rolling or pressing W/S
			float forward = controller.zza;
			boolean rolling = forward != 0 || this.getDeltaMovement().horizontalDistanceSqr() > 1.0E-4;
			float steer = rolling ? -controller.xxa * TURN_RATE * (forward < 0 ? -1 : 1) : 0;
			this.setYRot(this.getYRot() + steer);
			this.yRotO = this.getYRot();
			this.yBodyRot = this.yHeadRot = this.getYRot();
		}
	}

	@Override
	protected Vec3 getRiddenInput(Player controller, Vec3 selfInput) {
		float forward = controller.zza;
		if (forward < 0.0F) forward *= 0.5F; // slower in reverse
		return new Vec3(0, 0, forward);
	}

	@Override
	protected float getRiddenSpeed(Player controller) {
		return (float) this.getAttributeValue(Attributes.MOVEMENT_SPEED);
	}

	@Override
	public Vec3 getDismountLocationForPassenger(LivingEntity passenger) {
		Vec3 side = new Vec3(this.getBbWidth() * 0.5 + 0.6, 0, 0).yRot(-this.getYRot() * Mth.DEG_TO_RAD);
		Vec3 rel = passenger.position().subtract(this.position());
		Vec3 pos = this.position().add(rel.dot(side) >= 0 ? side : side.scale(-1));
		return new Vec3(pos.x, this.getY(), pos.z);
	}

	// ------------------------------------------------------------ GeckoLib

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		RawAnimation drive = RawAnimation.begin().thenLoop("animation.dinosaurs." + spec.id + ".drive");
		controllers.add(new AnimationController<>("drive", 0, state -> state.setAndContinue(drive)));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return geoCache;
	}
}

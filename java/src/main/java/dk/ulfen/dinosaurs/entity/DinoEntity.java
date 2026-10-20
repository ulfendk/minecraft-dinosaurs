package dk.ulfen.dinosaurs.entity;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.util.GeckoLibUtil;
import dk.ulfen.dinosaurs.CreatureSpec;
import dk.ulfen.dinosaurs.ModEntities;
import dk.ulfen.dinosaurs.ModItems;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.AgeableMob;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.TamableAnimal;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.control.FlyingMoveControl;
import net.minecraft.world.entity.ai.control.SmoothSwimmingLookControl;
import net.minecraft.world.entity.ai.control.SmoothSwimmingMoveControl;
import net.minecraft.world.entity.ai.goal.AvoidEntityGoal;
import net.minecraft.world.entity.ai.goal.BreedGoal;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.FollowOwnerGoal;
import net.minecraft.world.entity.ai.goal.FollowParentGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.PanicGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.RandomSwimmingGoal;
import net.minecraft.world.entity.ai.goal.SitWhenOrderedToGoal;
import net.minecraft.world.entity.ai.goal.TemptGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomFlyingGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.ai.goal.target.OwnerHurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.OwnerHurtTargetGoal;
import net.minecraft.world.entity.ai.navigation.FlyingPathNavigation;
import net.minecraft.world.entity.ai.navigation.PathNavigation;
import net.minecraft.world.entity.ai.navigation.WaterBoundPathNavigation;
import net.minecraft.world.entity.animal.Animal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.pathfinder.PathType;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import net.minecraft.world.phys.Vec3;
import org.jspecify.annotations.Nullable;

import java.util.List;
import java.util.Set;

/**
 * One data-driven class for every prehistoric creature: behaviour comes from its {@link CreatureSpec}.
 */
public class DinoEntity extends TamableAnimal implements GeoEntity {
	private static final EntityDataAccessor<Boolean> SEDATED = SynchedEntityData.defineId(DinoEntity.class, EntityDataSerializers.BOOLEAN);
	private static final EntityDataAccessor<Boolean> CARCASS = SynchedEntityData.defineId(DinoEntity.class, EntityDataSerializers.BOOLEAN);
	/** Entity tag Realistic Hunting puts on a creature it has brought down (see {@link #isCarcass()}). */
	public static final String HUNTING_CARCASS = "hunting.carcass";
	private static final Set<String> VANILLA_PREY_SMALL = Set.of("chicken", "rabbit", "sheep", "pig");
	private static final Set<String> VANILLA_PREY_BIG = Set.of("cow", "pig", "sheep", "chicken", "rabbit", "goat", "llama", "horse", "donkey", "camel");
	private static final Set<String> VANILLA_FISH = Set.of("cod", "salmon", "tropical_fish", "pufferfish", "squid");

	public final CreatureSpec spec;
	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);
	private int sedatedTicks;
	private int sedativeDose;
	private long lastDoseTick;
	private int eggTimer;
	/** client-side: distance walked, drives the walk cycle */
	public float walkedDistance;

	public DinoEntity(EntityType<? extends DinoEntity> type, Level level) {
		super(type, level);
		this.spec = ModEntities.spec(type);
		this.eggTimer = 24000 + this.random.nextInt(24000);
		if (spec.swims()) {
			this.moveControl = new SmoothSwimmingMoveControl(this, 85, 10, 0.1F, 0.5F, true);
			this.lookControl = new SmoothSwimmingLookControl(this, 10);
			this.setPathfindingMalus(PathType.WATER, 0.0F);
		} else if (spec.flies()) {
			this.moveControl = new FlyingMoveControl(this, 10, false);
			this.setPathfindingMalus(PathType.FIRE, -1.0F);
		} else if (spec.amphibious()) {
			this.setPathfindingMalus(PathType.WATER, 0.0F);
		}
	}

	public static AttributeSupplier.Builder createAttributes(CreatureSpec s) {
		var b = Animal.createAnimalAttributes()
			.add(Attributes.MAX_HEALTH, s.health)
			.add(Attributes.MOVEMENT_SPEED, s.speed)
			.add(Attributes.FOLLOW_RANGE, 24.0)
			.add(Attributes.TEMPT_RANGE, 10.0)
			.add(Attributes.STEP_HEIGHT, s.big ? 1.1 : 0.6)
			.add(Attributes.KNOCKBACK_RESISTANCE, s.big ? Math.min(1.0, s.height / 8.0) : 0.0)
			.add(Attributes.JUMP_STRENGTH, s.ride != null ? s.ride.jump : 0.42);
		if (s.attack > 0) b.add(Attributes.ATTACK_DAMAGE, s.attack);
		if (s.flies()) b.add(Attributes.FLYING_SPEED, Math.max(0.1, s.speed * 0.6));
		return b;
	}

	// ------------------------------------------------------------ AI

	@Override
	protected PathNavigation createNavigation(Level level) {
		CreatureSpec s = ModEntities.spec(this.getType());
		if (s.swims()) return new WaterBoundPathNavigation(this, level);
		if (s.flies()) {
			FlyingPathNavigation nav = new FlyingPathNavigation(this, level);
			nav.setCanOpenDoors(false);
			nav.setCanFloat(true);
			return nav;
		}
		return super.createNavigation(level);
	}

	@Override
	protected void registerGoals() {
		CreatureSpec s = ModEntities.spec(this.getType());
		if (!s.swims()) this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(1, new SitWhenOrderedToGoal(this));
		if ("passive".equals(s.temperament) || "skittish".equals(s.temperament))
			this.goalSelector.addGoal(1, new PanicGoal(this, "skittish".equals(s.temperament) ? 1.6 : 1.3));
		if ("skittish".equals(s.temperament))
			this.goalSelector.addGoal(2, new AvoidEntityGoal<>(this, DinoEntity.class, 14.0F, 1.2, 1.5, e -> e instanceof DinoEntity d && d.spec.carnivore() && d.spec.big));
		if (s.attack > 0) this.goalSelector.addGoal(3, new MeleeAttackGoal(this, 1.25, true));
		this.goalSelector.addGoal(4, new BreedGoal(this, 1.0));
		this.goalSelector.addGoal(5, new TemptGoal(this, 1.1, this::isFood, false));
		if (!s.swims()) this.goalSelector.addGoal(5, new FollowOwnerGoal(this, 1.0, s.big ? 16.0F : 10.0F, s.big ? 6.0F : 3.0F));
		this.goalSelector.addGoal(6, new FollowParentGoal(this, 1.1));
		if (s.swims()) this.goalSelector.addGoal(7, new RandomSwimmingGoal(this, 1.0, 10));
		else if (s.flies()) this.goalSelector.addGoal(7, new WaterAvoidingRandomFlyingGoal(this, 1.0));
		else this.goalSelector.addGoal(7, new WaterAvoidingRandomStrollGoal(this, 0.9));
		this.goalSelector.addGoal(8, new LookAtPlayerGoal(this, Player.class, 10.0F));
		this.goalSelector.addGoal(9, new RandomLookAroundGoal(this));

		if (s.attack > 0) {
			this.targetSelector.addGoal(1, new OwnerHurtByTargetGoal(this));
			this.targetSelector.addGoal(2, new OwnerHurtTargetGoal(this));
		}
		if ("neutral".equals(s.temperament) || "aggressive".equals(s.temperament)) this.targetSelector.addGoal(3, new HurtByTargetGoal(this));
		if ("aggressive".equals(s.temperament)) {
			this.targetSelector.addGoal(4, new NearestAttackableTargetGoal<>(this, Player.class, 10, true, false, (target, level) -> !this.isTame() && !target.isShiftKeyDown()));
		}
		if (s.carnivore() && s.attack > 0) {
			Set<String> prey = "piscivore".equals(s.diet) ? VANILLA_FISH : s.big ? VANILLA_PREY_BIG : VANILLA_PREY_SMALL;
			this.targetSelector.addGoal(5, new NearestAttackableTargetGoal<>(this, LivingEntity.class, 10, true, false, (target, level) -> {
				if (this.isTame() || this.isBaby()) return false;
				if (target instanceof DinoEntity d) return s.big && d.spec.prey && d.getType() != this.getType();
				String id = BuiltInRegistries.ENTITY_TYPE.getKey(target.getType()).getPath();
				return prey.contains(id);
			}));
		}
	}

	@Override
	public boolean isFood(ItemStack stack) {
		return matches(stack, spec.food);
	}

	private static boolean matches(ItemStack stack, List<String> ids) {
		if (stack.isEmpty() || ids == null) return false;
		String id = BuiltInRegistries.ITEM.getKey(stack.getItem()).toString();
		return ids.contains(id);
	}

	@Override
	public boolean canBreatheUnderwater() {
		return spec.swims() || spec.amphibious();
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource damageSource) {
		return !spec.flies() && super.causeFallDamage(fallDistance, damageModifier, damageSource);
	}

	@Override
	protected void checkFallDamage(double ya, boolean onGround, BlockState onState, BlockPos pos) {
		if (!spec.flies()) super.checkFallDamage(ya, onGround, onState, pos);
	}

	@Override
	public boolean isPushedByFluid() {
		return !spec.swims();
	}

	// ------------------------------------------------------------ sedation

	@Override
	protected void defineSynchedData(SynchedEntityData.Builder builder) {
		super.defineSynchedData(builder);
		builder.define(SEDATED, false);
		builder.define(CARCASS, false);
	}

	/** A Realistic Hunting carcass: lies on its side until it's field dressed (synced from the tag). */
	public boolean isCarcass() {
		return this.entityData.get(CARCASS);
	}

	public boolean isSedated() {
		return this.entityData.get(SEDATED);
	}

	/** One tranquilizer dart. Big animals need several doses; returns true when knocked out. */
	public boolean addSedativeDose() {
		if (isCarcass()) return false;
		long now = this.level().getGameTime();
		if (now - lastDoseTick > 600) sedativeDose = 0;
		lastDoseTick = now;
		sedativeDose++;
		int need = spec.big ? (spec.carnivore() ? 4 : 3) : 1;
		if (sedativeDose < need) return false;
		sedativeDose = 0;
		sedatedTicks = 45 * 20;
		this.entityData.set(SEDATED, true);
		this.setTarget(null);
		this.getNavigation().stop();
		return true;
	}

	public int sedativeDose() {
		return sedativeDose;
	}

	public int dosesNeeded() {
		return spec.big ? (spec.carnivore() ? 4 : 3) : 1;
	}

	@Override
	protected boolean isImmobile() {
		return super.isImmobile() || isSedated();
	}

	@Override
	public boolean doHurtTarget(ServerLevel level, Entity target) {
		return !isSedated() && super.doHurtTarget(level, target);
	}

	// ------------------------------------------------------------ ticking

	@Override
	public void aiStep() {
		super.aiStep();
		if (this.level().isClientSide()) return;
		if (sedatedTicks > 0 && --sedatedTicks == 0) this.entityData.set(SEDATED, false);
		if (isSedated()) {
			this.setTarget(null);
			this.getNavigation().stop();
		}
		// adults occasionally lay an egg
		if (spec.lays && !isCarcass() && !this.isBaby() && !this.isVehicle() && --eggTimer <= 0 && this.level() instanceof ServerLevel server) {
			eggTimer = 24000 + this.random.nextInt(24000);
			var egg = ModItems.egg(spec.id);
			if (egg != null) {
				this.playSound(SoundEvents.CHICKEN_EGG, 1.0F, 0.6F);
				this.spawnAtLocation(server, new ItemStack(egg));
			}
		}
	}

	@Override
	public void tick() {
		super.tick();
		if (!this.level().isClientSide()) this.entityData.set(CARCASS, this.entityTags().contains(HUNTING_CARCASS));
		if (this.level().isClientSide()) {
			float dx = (float) (this.getX() - this.xo), dz = (float) (this.getZ() - this.zo);
			walkedDistance += Mth.sqrt(dx * dx + dz * dz) / Math.max(0.2F, this.getScale());
		}
		if (spec.ride != null && "fly".equals(spec.ride.mode)) this.setNoGravity(this.isVehicle() && this.getControllingPassenger() != null);
	}

	// ------------------------------------------------------------ interaction: taming, sitting, saddles, riding

	@Override
	public InteractionResult mobInteract(Player player, InteractionHand hand) {
		ItemStack stack = player.getItemInHand(hand);
		boolean client = this.level().isClientSide();

		// taming by feeding
		if (!this.isTame() && "feed".equals(spec.tame) && matches(stack, spec.tameItems) && !isSedated()) {
			if (!client) {
				stack.consume(1, player);
				if (this.random.nextInt(spec.big ? 5 : 3) == 0) {
					this.tame(player);
					this.navigation.stop();
					this.setTarget(null);
					this.level().broadcastEntityEvent(this, (byte) 7);
				} else {
					this.level().broadcastEntityEvent(this, (byte) 6);
				}
			}
			return InteractionResult.SUCCESS;
		}

		if (this.isTame() && this.isOwnedBy(player)) {
			// healing
			if (isFood(stack) && this.getHealth() < this.getMaxHealth()) {
				if (!client) {
					stack.consume(1, player);
					this.heal(6.0F);
				}
				return InteractionResult.SUCCESS;
			}
			// saddle on
			if (spec.ride != null && !this.isBaby() && stack.is(Items.SADDLE) && !this.isSaddled()) {
				if (!client) {
					this.setItemSlot(EquipmentSlot.SADDLE, stack.split(1));
					this.playSound(SoundEvents.HORSE_SADDLE.value(), 1.0F, 0.8F);
				}
				return InteractionResult.SUCCESS;
			}
			// saddle off
			if (stack.is(Items.SHEARS) && this.isSaddled() && !this.isVehicle()) {
				if (!client && this.level() instanceof ServerLevel server) {
					this.spawnAtLocation(server, this.getItemBySlot(EquipmentSlot.SADDLE).copy());
					this.setItemSlot(EquipmentSlot.SADDLE, ItemStack.EMPTY);
					stack.hurtAndBreak(1, player, hand);
				}
				return InteractionResult.SUCCESS;
			}
			// mount
			if (spec.ride != null && this.isSaddled() && !player.isSecondaryUseActive() && !this.isBaby() && this.getPassengers().size() < spec.ride.seats) {
				if (!client) {
					this.setOrderedToSit(false);
					player.startRiding(this);
				}
				return InteractionResult.SUCCESS;
			}
			// sit / follow
			InteractionResult parent = super.mobInteract(player, hand);
			if (parent.consumesAction()) return parent;
			if (!client) {
				this.setOrderedToSit(!this.isOrderedToSit());
				this.jumping = false;
				this.navigation.stop();
				this.setTarget(null);
			}
			return InteractionResult.SUCCESS;
		}
		// anyone may ride someone else's saddled mount as a passenger, not as driver
		if (this.isTame() && spec.ride != null && this.isSaddled() && this.getPassengers().size() > 0 && this.getPassengers().size() < spec.ride.seats) {
			if (!client) player.startRiding(this);
			return InteractionResult.SUCCESS;
		}
		return super.mobInteract(player, hand);
	}

	@Override
	public boolean canUseSlot(EquipmentSlot slot) {
		return slot == EquipmentSlot.SADDLE ? spec.ride != null && this.isAlive() && !this.isBaby() && this.isTame() : super.canUseSlot(slot);
	}

	@Override
	public @Nullable LivingEntity getControllingPassenger() {
		if (spec.ride != null && this.isSaddled() && this.getFirstPassenger() instanceof Player p && this.isOwnedBy(p)) return p;
		return super.getControllingPassenger();
	}

	@Override
	protected boolean canAddPassenger(Entity passenger) {
		return spec.ride != null && this.getPassengers().size() < spec.ride.seats;
	}

	@Override
	protected Vec3 getPassengerAttachmentPoint(Entity passenger, EntityDimensions dimensions, float scale) {
		if (spec.ride == null || spec.ride.seatPositions == null || spec.ride.seatPositions.isEmpty()) return super.getPassengerAttachmentPoint(passenger, dimensions, scale);
		int i = Math.max(0, this.getPassengers().indexOf(passenger));
		List<Double> p = spec.ride.seatPositions.get(Math.min(i, spec.ride.seatPositions.size() - 1));
		// seat positions are in blocks for an adult, +z forward; Java passengers sit on the attachment point
		return new Vec3(p.get(0), p.get(1) + 0.3, p.get(2)).scale(scale).yRot(-this.yBodyRot * Mth.DEG_TO_RAD);
	}

	@Override
	protected void tickRidden(Player controller, Vec3 riddenInput) {
		super.tickRidden(controller, riddenInput);
		this.setRot(controller.getYRot(), controller.getXRot() * 0.5F);
		this.yRotO = this.yBodyRot = this.yHeadRot = this.getYRot();
	}

	@Override
	protected Vec3 getRiddenInput(Player controller, Vec3 selfInput) {
		float strafe = controller.xxa * 0.5F;
		float forward = controller.zza;
		if (forward <= 0.0F) forward *= 0.25F;
		double up = 0;
		if (spec.ride != null && ("fly".equals(spec.ride.mode) || ("swim".equals(spec.ride.mode) && this.isInWater()))) {
			// look up / down to climb or dive
			up = -Mth.sin(controller.getXRot() * Mth.DEG_TO_RAD) * forward;
			forward *= Mth.cos(controller.getXRot() * Mth.DEG_TO_RAD);
		}
		return new Vec3(strafe, up, forward);
	}

	@Override
	protected float getRiddenSpeed(Player controller) {
		float base = (float) this.getAttributeValue(Attributes.MOVEMENT_SPEED);
		if (spec.ride != null && spec.ride.speed != null) {
			if ("fly".equals(spec.ride.mode)) return spec.ride.speed;
			if ("swim".equals(spec.ride.mode) && this.isInWater()) return spec.ride.speed * 4.0F;
		}
		return base;
	}

	@Override
	public void travel(Vec3 input) {
		if (spec.swims() && this.isInWater() && this.getControllingPassenger() == null && this.isEffectiveAi()) {
			this.moveRelative(this.getSpeed(), input);
			this.move(net.minecraft.world.entity.MoverType.SELF, this.getDeltaMovement());
			this.setDeltaMovement(this.getDeltaMovement().scale(0.9));
			return;
		}
		if (spec.flies() && !this.onGround() && this.getControllingPassenger() == null && this.isEffectiveAi()) {
			this.travelFlying(input, this.getSpeed());
			return;
		}
		super.travel(input);
	}

	// ------------------------------------------------------------ breeding

	@Override
	public @Nullable AgeableMob getBreedOffspring(ServerLevel level, AgeableMob partner) {
		@SuppressWarnings("unchecked")
		EntityType<DinoEntity> type = (EntityType<DinoEntity>) this.getType();
		DinoEntity baby = type.create(level, EntitySpawnReason.BREEDING);
		if (baby != null && this.getOwner() instanceof Player owner) baby.tame(owner);
		return baby;
	}

	// ------------------------------------------------------------ sounds

	private static @Nullable SoundEvent sound(@Nullable String id) {
		if (id == null) return null;
		return BuiltInRegistries.SOUND_EVENT.getValue(Identifier.parse(id));
	}

	@Override
	protected @Nullable SoundEvent getAmbientSound() {
		return sound(spec.sounds.ambient);
	}

	@Override
	protected @Nullable SoundEvent getHurtSound(DamageSource source) {
		return sound(spec.sounds.hurt);
	}

	@Override
	protected @Nullable SoundEvent getDeathSound() {
		return sound(spec.sounds.death);
	}

	@Override
	protected void playStepSound(BlockPos pos, BlockState state) {
		SoundEvent step = sound(spec.sounds.step);
		if (step != null) this.playSound(step, spec.big ? 0.6F : 0.3F, spec.sounds.pitch);
	}

	@Override
	public float getVoicePitch() {
		return spec.sounds.pitch * (this.isBaby() ? 1.5F : 1.0F) * (0.92F + this.random.nextFloat() * 0.16F);
	}

	@Override
	protected float getSoundVolume() {
		return spec.big ? 1.4F : 1.0F;
	}

	@Override
	public int getAmbientSoundInterval() {
		return 200;
	}

	// ------------------------------------------------------------ persistence

	@Override
	protected void addAdditionalSaveData(ValueOutput output) {
		super.addAdditionalSaveData(output);
		output.putInt("EggTimer", eggTimer);
		output.putInt("Sedated", sedatedTicks);
	}

	@Override
	protected void readAdditionalSaveData(ValueInput input) {
		super.readAdditionalSaveData(input);
		eggTimer = input.getIntOr("EggTimer", eggTimer);
		sedatedTicks = input.getIntOr("Sedated", 0);
		if (sedatedTicks > 0) this.entityData.set(SEDATED, true);
	}

	@Override
	public boolean removeWhenFarAway(double distanceSqr) {
		return !this.isTame() && !this.hasCustomName() && !this.isPersistenceRequired() && distanceSqr > 128 * 128;
	}

	// ------------------------------------------------------------ GeckoLib

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		RawAnimation main = RawAnimation.begin().thenLoop("animation.dinosaurs." + spec.id + ".main");
		controllers.add(new AnimationController<>("main", 0, state -> state.setAndContinue(main)));
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return geoCache;
	}

	public static boolean isMob(Entity e) {
		return e instanceof Mob;
	}
}

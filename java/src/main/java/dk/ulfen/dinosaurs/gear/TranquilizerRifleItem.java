package dk.ulfen.dinosaurs.gear;

import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.Projectile;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/** Fires tranquilizer darts from the player's inventory (creative players need none). */
public class TranquilizerRifleItem extends Item {
	public TranquilizerRifleItem(Item.Properties properties) {
		super(properties);
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		ItemStack rifle = player.getItemInHand(hand);
		ItemStack ammo = findDart(player);
		boolean infinite = player.hasInfiniteMaterials();
		if (ammo.isEmpty() && !infinite) {
			level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.DISPENSER_FAIL, SoundSource.PLAYERS, 0.6F, 1.4F);
			return InteractionResult.FAIL;
		}
		if (level instanceof ServerLevel server) {
			ItemStack shot = ammo.isEmpty() ? new ItemStack(ModGear.TRANQ_DART) : ammo.copyWithCount(1);
			Projectile.spawnProjectileFromRotation(TranqDartEntity::new, server, shot, player, 0.0F, 3.5F, 0.3F);
			if (!infinite) ammo.shrink(1);
			rifle.hurtAndBreak(1, player, hand);
			player.getCooldowns().addCooldown(rifle, 15);
		}
		level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.CROSSBOW_SHOOT, SoundSource.PLAYERS, 1.0F, 1.4F);
		return InteractionResult.SUCCESS;
	}

	private static ItemStack findDart(Player player) {
		ItemStack off = player.getOffhandItem();
		if (off.is(ModGear.TRANQ_DART)) return off;
		Inventory inv = player.getInventory();
		for (int i = 0; i < inv.getContainerSize(); i++) {
			ItemStack s = inv.getItem(i);
			if (s.is(ModGear.TRANQ_DART)) return s;
		}
		return ItemStack.EMPTY;
	}
}

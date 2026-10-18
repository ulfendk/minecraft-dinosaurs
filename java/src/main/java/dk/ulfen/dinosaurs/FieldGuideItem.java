package dk.ulfen.dinosaurs;

import dk.ulfen.dinosaurs.entity.DinoEntity;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/** Use on a creature to read its field guide entry; use in the air for taming, riding and park tips. */
public class FieldGuideItem extends Item {
	public FieldGuideItem(Item.Properties props) {
		super(props);
	}

	@Override
	public InteractionResult interactLivingEntity(ItemStack stack, Player player, LivingEntity target, InteractionHand hand) {
		if (!(target instanceof DinoEntity d)) return InteractionResult.PASS;
		if (!player.level().isClientSide()) {
			var s = d.spec;
			player.sendSystemMessage(Component.translatable("entity.dinosaurs." + s.id).withStyle(ChatFormatting.BOLD, ChatFormatting.GOLD));
			player.sendSystemMessage(Component.translatable("dinosaurs.info." + s.id));
			String tame = "egg".equals(s.tame) ? "tame.egg" : "feed".equals(s.tame) ? "tame.feed" : "tame.no";
			String ride = s.ride == null ? "ride.no" : "ride." + s.ride.mode;
			player.sendSystemMessage(Component.translatable("dinosaurs.ui.page.taming").withStyle(ChatFormatting.GOLD).append(" ").append(Component.translatable("dinosaurs.ui." + tame).withStyle(ChatFormatting.WHITE)));
			player.sendSystemMessage(Component.translatable("dinosaurs.ui.page.riding").withStyle(ChatFormatting.GOLD).append(" ").append(Component.translatable("dinosaurs.ui." + ride).withStyle(ChatFormatting.WHITE)));
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (!level.isClientSide()) {
			for (String k : new String[] { "help.taming1", "help.taming2", "help.taming3", "help.park1", "help.park4" })
				player.sendSystemMessage(Component.translatable("dinosaurs.ui." + k));
		}
		return InteractionResult.SUCCESS;
	}
}

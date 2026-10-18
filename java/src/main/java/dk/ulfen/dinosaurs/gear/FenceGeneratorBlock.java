package dk.ulfen.dinosaurs.gear;

import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.redstone.Orientation;
import net.minecraft.world.phys.BlockHitResult;
import org.jspecify.annotations.Nullable;

/** Powers every electric fence connected to it. Toggle with right-click or a redstone signal. */
public class FenceGeneratorBlock extends Block {
	public static final BooleanProperty ON = BooleanProperty.create("on");
	/** last seen redstone signal, so only signal edges toggle the generator */
	public static final BooleanProperty POWERED = BlockStateProperties.POWERED;

	public FenceGeneratorBlock(BlockBehaviour.Properties properties) {
		super(properties);
		this.registerDefaultState(this.stateDefinition.any().setValue(ON, false).setValue(POWERED, false));
	}

	@Override
	public @Nullable BlockState getStateForPlacement(BlockPlaceContext context) {
		boolean signal = context.getLevel().hasNeighborSignal(context.getClickedPos());
		return this.defaultBlockState().setValue(POWERED, signal).setValue(ON, signal);
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hitResult) {
		if (level instanceof ServerLevel server) {
			boolean on = !state.getValue(ON);
			setOn(server, pos, state.setValue(ON, on));
			player.sendOverlayMessage(Component.translatable(on ? "dinosaurs.ui.msg.fence_on" : "dinosaurs.ui.msg.fence_off"));
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected void neighborChanged(BlockState state, Level level, BlockPos pos, Block block, @Nullable Orientation orientation, boolean movedByPiston) {
		if (!(level instanceof ServerLevel server)) return;
		boolean signal = level.hasNeighborSignal(pos);
		if (signal != state.getValue(POWERED)) setOn(server, pos, state.setValue(POWERED, signal).setValue(ON, signal));
	}

	private static void setOn(ServerLevel level, BlockPos pos, BlockState state) {
		boolean changed = level.getBlockState(pos).getValue(ON) != state.getValue(ON);
		level.setBlock(pos, state, Block.UPDATE_ALL);
		if (changed) {
			level.playSound(null, pos, state.getValue(ON) ? SoundEvents.BEACON_ACTIVATE : SoundEvents.BEACON_DEACTIVATE, SoundSource.BLOCKS, 0.6F, 1.0F);
			FenceNetwork.updateAround(level, pos);
		}
	}

	@Override
	protected void onPlace(BlockState state, Level level, BlockPos pos, BlockState oldState, boolean movedByPiston) {
		super.onPlace(state, level, pos, oldState, movedByPiston);
		if (level instanceof ServerLevel server && !oldState.is(this)) FenceNetwork.updateAround(server, pos);
	}

	@Override
	protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
		super.affectNeighborsAfterRemoval(state, level, pos, movedByPiston);
		FenceNetwork.updateAround(level, pos);
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(ON, POWERED);
	}
}

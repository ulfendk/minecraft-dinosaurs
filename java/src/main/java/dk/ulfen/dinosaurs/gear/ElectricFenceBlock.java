package dk.ulfen.dinosaurs.gear;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.FenceBlock;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;

/**
 * Park fence: 1.5 blocks tall like vanilla fences, links only to other electric fences
 * and fence generators, and carries a POWERED state set by {@link FenceNetwork}.
 */
public class ElectricFenceBlock extends FenceBlock {
	public static final BooleanProperty POWERED = BlockStateProperties.POWERED;

	public ElectricFenceBlock(BlockBehaviour.Properties properties) {
		super(properties);
		this.registerDefaultState(this.defaultBlockState().setValue(POWERED, false));
	}

	@Override
	public boolean connectsTo(BlockState state, boolean faceSolid, Direction direction) {
		Block block = state.getBlock();
		return block instanceof ElectricFenceBlock || block instanceof FenceGeneratorBlock;
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		super.createBlockStateDefinition(builder);
		builder.add(POWERED);
	}

	@Override
	protected void onPlace(BlockState state, Level level, BlockPos pos, BlockState oldState, boolean movedByPiston) {
		super.onPlace(state, level, pos, oldState, movedByPiston);
		if (level instanceof ServerLevel server && !oldState.is(this)) FenceNetwork.update(server, pos);
	}

	@Override
	protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
		super.affectNeighborsAfterRemoval(state, level, pos, movedByPiston);
		FenceNetwork.updateAround(level, pos);
	}
}

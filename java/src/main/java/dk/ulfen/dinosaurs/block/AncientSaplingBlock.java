package dk.ulfen.dinosaurs.block;

import net.minecraft.core.BlockPos;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.BonemealSource;
import net.minecraft.world.level.block.BonemealableBlock;
import net.minecraft.world.level.block.VegetationBlock;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

import java.util.List;

/** Sapling that grows into one of its tree's structure variants (random ticks or bone meal). */
public class AncientSaplingBlock extends VegetationBlock implements BonemealableBlock {
	public static final IntegerProperty STAGE = BlockStateProperties.STAGE;
	private static final VoxelShape SHAPE = Block.column(12.0, 0.0, 12.0);
	private final List<Identifier> structures;

	public AncientSaplingBlock(BlockBehaviour.Properties properties, List<Identifier> structures) {
		super(properties);
		this.structures = structures;
		this.registerDefaultState(this.stateDefinition.any().setValue(STAGE, 0));
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(STAGE);
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPE;
	}

	@Override
	protected void randomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
		if (level.getMaxLocalRawBrightness(pos.above()) >= 9 && random.nextInt(7) == 0) advance(level, pos, state, random);
	}

	/** First stage is invisible progress (like vanilla saplings), the second grows the tree. */
	public void advance(ServerLevel level, BlockPos pos, BlockState state, RandomSource random) {
		if (state.getValue(STAGE) == 0) level.setBlock(pos, state.cycle(STAGE), Block.UPDATE_NONE);
		else TreeStructures.grow(level, pos, random, structures);
	}

	@Override
	public boolean isValidBonemealTarget(LevelReader level, BlockPos pos, BlockState state, BonemealSource source) {
		return true;
	}

	@Override
	public boolean isBonemealSuccess(Level level, RandomSource random, BlockPos pos, BlockState state, BonemealSource source) {
		return random.nextFloat() < 0.45F;
	}

	@Override
	public void performBonemeal(ServerLevel level, RandomSource random, BlockPos pos, BlockState state, BonemealSource source) {
		advance(level, pos, state, random);
	}
}

package dk.ulfen.dinosaurs.block;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.VegetationBlock;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/** Cross-model plant (fern, horsetail, cycad …): grows on soil, pops off when unsupported, no collision. */
public class AncientPlantBlock extends VegetationBlock {
	private final VoxelShape shape;

	public AncientPlantBlock(BlockBehaviour.Properties properties, int height) {
		super(properties);
		this.shape = Block.column(12.0, 0.0, Math.max(4, Math.min(16, height)));
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return shape;
	}
}

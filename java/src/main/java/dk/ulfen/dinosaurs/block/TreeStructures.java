package dk.ulfen.dinosaurs.block;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Vec3i;
import net.minecraft.resources.Identifier;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.ServerLevelAccessor;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.levelgen.structure.BoundingBox;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructurePlaceSettings;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureTemplate;
import org.jspecify.annotations.Nullable;

import java.util.List;

/**
 * Places the prehistoric tree structures (data/dinosaurs/structure/*.nbt). Every structure has its
 * trunk base at (floor(width/2), 0, floor(depth/2)).
 */
public final class TreeStructures {
	private TreeStructures() {}

	/** Sapling growth: replaces the sapling with a random tree variant if there is room. */
	public static boolean grow(ServerLevel level, BlockPos base, RandomSource random, List<Identifier> ids) {
		StructureTemplate template = template(level.getServer(), ids.get(random.nextInt(ids.size())), false);
		if (template == null || !fits(level, base, template, true)) return false;
		BlockState sapling = level.getBlockState(base);
		level.setBlock(base, Blocks.AIR.defaultBlockState(), Block.UPDATE_NONE);
		if (!place(level, base, random, template, null)) {
			level.setBlock(base, sapling, Block.UPDATE_NONE);
			return false;
		}
		return true;
	}

	static @Nullable StructureTemplate template(@Nullable MinecraftServer server, Identifier id, boolean create) {
		if (server == null) return null;
		var manager = server.getStructureTemplateManager();
		return create ? manager.getOrCreate(id) : manager.get(id).orElse(null);
	}

	/** Ground below the trunk must be soil and the trunk column must be clear. */
	static boolean fits(ServerLevelAccessor level, BlockPos base, StructureTemplate template, boolean fromSapling) {
		if (!level.getBlockState(base.below()).is(BlockTags.SUPPORTS_VEGETATION)) return false;
		int h = Math.min(template.getSize().getY(), 7);
		for (int y = fromSapling ? 1 : 0; y < h; y++) {
			BlockState s = level.getBlockState(base.above(y));
			if (!(s.isAir() || s.canBeReplaced() || s.is(BlockTags.LEAVES))) return false;
		}
		return true;
	}

	static boolean place(ServerLevelAccessor level, BlockPos base, RandomSource random, StructureTemplate template, @Nullable BoundingBox bounds) {
		Vec3i size = template.getSize();
		if (size.getX() == 0) return false;
		BlockPos origin = base.offset(-size.getX() / 2, 0, -size.getZ() / 2);
		StructurePlaceSettings settings = new StructurePlaceSettings().setRandom(random);
		if (bounds != null) settings.setBoundingBox(bounds);
		return template.placeInWorld(level, origin, origin, settings, random, Block.UPDATE_CLIENTS);
	}
}

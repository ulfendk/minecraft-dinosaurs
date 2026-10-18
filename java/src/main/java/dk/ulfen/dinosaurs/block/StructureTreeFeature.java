package dk.ulfen.dinosaurs.block;

import com.mojang.serialization.MapCodec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import net.minecraft.core.BlockPos;
import net.minecraft.resources.Identifier;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.ChunkPos;
import net.minecraft.world.level.WorldGenLevel;
import net.minecraft.world.level.chunk.ChunkGenerator;
import net.minecraft.world.level.levelgen.feature.Feature;
import net.minecraft.world.level.levelgen.structure.BoundingBox;

import java.util.List;

/** World generation feature placing one of several prehistoric tree structures ("dinosaurs:structure_tree"). */
public record StructureTreeFeature(List<Identifier> structures) implements Feature {
	public static final MapCodec<StructureTreeFeature> CODEC = RecordCodecBuilder.mapCodec(
		i -> i.group(Identifier.CODEC.listOf().fieldOf("structures").forGetter(StructureTreeFeature::structures)).apply(i, StructureTreeFeature::new)
	);

	@Override
	public MapCodec<StructureTreeFeature> codec() {
		return CODEC;
	}

	@Override
	public boolean place(WorldGenLevel level, ChunkGenerator chunkGenerator, RandomSource random, BlockPos origin) {
		if (structures.isEmpty()) return false;
		var template = TreeStructures.template(level.getLevel().getServer(), structures.get(random.nextInt(structures.size())), true);
		if (template == null || !TreeStructures.fits(level, origin, template, false)) return false;
		// world generation may only write into the 3x3 chunks around the origin chunk
		ChunkPos chunk = ChunkPos.containing(origin);
		BoundingBox bounds = new BoundingBox(
			chunk.getMinBlockX() - 16, level.getMinY(), chunk.getMinBlockZ() - 16, chunk.getMaxBlockX() + 16, level.getMaxY(), chunk.getMaxBlockZ() + 16
		);
		return TreeStructures.place(level, origin, random, template, bounds);
	}
}

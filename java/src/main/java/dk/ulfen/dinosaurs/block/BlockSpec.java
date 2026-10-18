package dk.ulfen.dinosaurs.block;

import com.google.gson.Gson;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** Generated block/worldgen data (resource /dinosaurs/blocks.json, see src/emit/java/blocks.ts). */
public final class BlockSpec {
	public List<Plant> plants;
	public List<Tree> trees;
	public List<FeatureSpec> features;

	public static final class Plant {
		public String id;
		public int height;
		public String mapColor;
	}

	public static final class Tree {
		public String id;
		public List<String> structures;
	}

	public static final class FeatureSpec {
		public String feature;
		public String step;
		public List<String> biomes;
	}

	static BlockSpec load() {
		try (var in = BlockSpec.class.getResourceAsStream("/dinosaurs/blocks.json")) {
			if (in == null) throw new IllegalStateException("missing /dinosaurs/blocks.json - run `npm run build:java` first");
			return new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), BlockSpec.class);
		} catch (java.io.IOException e) {
			throw new RuntimeException(e);
		}
	}
}

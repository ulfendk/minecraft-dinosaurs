package dk.ulfen.dinosaurs.gametest;

import dk.ulfen.dinosaurs.DinosaursMod;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.minecraft.core.BlockPos;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.AABB;

/**
 * Park gear in the real client: a powered and an unpowered fence line with a generator,
 * the gear items on display, and functional checks with a player present
 * (powered fences shock, big carnivores smash unpowered fences).
 */
public class GearScreenshotTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		try (TestSingleplayerContext world = context.worldBuilder().create()) {
			var server = world.getServer();
			for (String cmd : new String[] { "gamerule advance_time false", "gamerule spawn_mobs false", "time set noon", "weather clear", "gamerule send_command_feedback false" })
				server.runCommand(cmd);
			context.runOnClient(mc -> { if (!mc.gui.hud.isHidden()) mc.gui.hud.toggle(); });
			context.waitTicks(20);

			// powered line (z = 0) with generator + redstone, unpowered line (z = 4)
			server.runCommand("fill -4 -60 0 3 -60 0 dinosaurs:electric_fence");
			server.runCommand("setblock 4 -60 0 dinosaurs:fence_generator");
			server.runCommand("setblock 5 -60 0 minecraft:redstone_block");
			server.runCommand("fill -4 -60 4 3 -60 4 dinosaurs:electric_fence");
			server.runCommand("setblock -4 -59 0 dinosaurs:electric_fence");
			for (String[] item : new String[][] { { "electric_prod", "-2" }, { "tranquilizer_rifle", "0" }, { "tranq_dart", "2" } })
				server.runCommand("summon minecraft:item_display " + item[1] + ".5 -58.2 -1.5 {item:{id:\"dinosaurs:" + item[0] + "\",count:1},billboard:\"center\",transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[1.2f,1.2f,1.2f]}}");
			server.runCommand("gamemode spectator @a");
			server.runCommand("tp @a 0.5 -57.5 -6 facing 0.5 -59.5 2");
			context.waitTicks(40);
			context.takeScreenshot("gear_fences");
			server.runCommand("tp @a 6 -58.5 -2.5 facing 0 -59.3 1");
			context.waitTicks(10);
			context.takeScreenshot("gear_fences_close");

			// shock: a pig pressed against the powered line loses health
			server.runCommand("summon minecraft:pig 0.5 -60 1.05 {NoAI:1b}");
			context.waitTicks(5);
			float before = health(server, EntityTypes.PIG, new AABB(-1, -61, 0, 2, -58, 2));
			context.waitTicks(40);
			float after = health(server, EntityTypes.PIG, new AABB(-1, -61, 0, 2, -58, 2));
			DinosaursMod.LOG.info("GEARTEST shock: pig health {} -> {}", before, after);
			if (!(after < before)) throw new AssertionError("powered fence did not shock the pig (" + before + " -> " + after + ")");

			// a T. rex leaning on the unpowered line eventually smashes through
			server.runCommand("summon dinosaurs:tyrannosaurus 0.5 -60 5.4 {NoAI:1b}");
			int smashed = 0;
			for (int i = 0; i < 40 && smashed == 0; i++) {
				context.waitTicks(10);
				smashed = server.computeOnServer(s -> {
					int missing = 0;
					var level = s.overworld();
					for (int x = -4; x <= 3; x++) if (level.getBlockState(new BlockPos(x, -60, 4)).isAir()) missing++;
					return missing;
				});
			}
			DinosaursMod.LOG.info("GEARTEST smash: {} unpowered fence(s) broken by the T. rex", smashed);
			if (smashed == 0) throw new AssertionError("T. rex did not smash the unpowered fence");
		}
	}

	private static float health(net.fabricmc.fabric.api.client.gametest.v1.context.TestServerContext server, EntityType<?> type, AABB box) {
		return server.computeOnServer(s -> s.overworld().getEntitiesOfClass(LivingEntity.class, box, e -> e.getType() == type).stream().findFirst().map(LivingEntity::getHealth).orElse(-1.0F));
	}
}

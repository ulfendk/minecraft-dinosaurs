package dk.ulfen.dinosaurs.gametest;

import dk.ulfen.dinosaurs.DinosaursMod;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;

/**
 * Renders every creature in the real game client and saves a screenshot per species
 * (build/run/clientGameTest/screenshots). Run with: ./gradlew runClientGameTest
 */
public class ScreenshotTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		try (TestSingleplayerContext world = context.worldBuilder().create()) {
			var server = world.getServer();
			server.runCommand("gamerule advance_time false");
			server.runCommand("gamerule spawn_mobs false");
			server.runCommand("time set noon");
			server.runCommand("weather clear");
			server.runCommand("gamemode spectator @a");
			server.runCommand("gamerule send_command_feedback false");
			context.runOnClient(mc -> { if (!mc.gui.hud.isHidden()) mc.gui.hud.toggle(); });
			context.waitTicks(40);
			String only = System.getenv().getOrDefault("DINO_ONLY", "");
			for (var spec : DinosaursMod.SPECS) {
				if (!only.isEmpty() && !only.contains(spec.id)) continue;
				server.runCommand("tp @e[type=!player] 0 -200 0");
				context.waitTicks(5);
				// stage: stone floor, creature at the origin, camera at a 3/4 angle sized to the creature
				float size = Math.max(spec.width, spec.height) * spec.scale / 1.6F;
				float d = Math.max(2.5F, spec.height * 1.15F + spec.width * 0.6F + 1.2F);
				server.runCommand("fill -12 -61 -12 12 -61 12 minecraft:grass_block");
				server.runCommand("fill -12 -60 -12 12 -45 12 minecraft:air");
				if (spec.swims()) server.runCommand("fill -8 -61 -8 8 -61 8 minecraft:sand");
				server.runCommand("summon dinosaurs:" + spec.id + " 0 " + (spec.swims() ? "-58" : "-60") + " 0 {NoAI:1b,NoGravity:" + (spec.swims() ? "1b" : "0b") + ",Rotation:[180f,0f]}");
				double h = spec.height * 0.5;
				server.runCommand(String.format(java.util.Locale.ROOT, "tp @a %.2f %.2f %.2f facing 0 %.2f 0", d * 0.75, -60 + h + d * 0.3, -d * 0.65, -60 + h));
				context.waitTicks(30);
				context.takeScreenshot("dino_" + spec.id + "_a");
				server.runCommand(String.format(java.util.Locale.ROOT, "tp @a %.2f %.2f %.2f facing 0 %.2f 0", d * 1.05, -60 + h, 0.0, -60 + h));
				context.waitTicks(10);
				context.takeScreenshot("dino_" + spec.id + "_b");
			}
		}
	}
}

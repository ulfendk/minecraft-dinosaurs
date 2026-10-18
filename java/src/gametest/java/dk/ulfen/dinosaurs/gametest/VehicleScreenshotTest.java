package dk.ulfen.dinosaurs.gametest;

import dk.ulfen.dinosaurs.vehicle.ModVehicles;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestServerContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.minecraft.client.CameraType;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.util.Mth;

/**
 * Seats the player (driver) and villagers (passengers) in every vehicle, screenshots them from
 * third person, then drives each one with simulated W / W+A input. Set DINO_VEHICLES=none to skip.
 */
public class VehicleScreenshotTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		if ("none".equals(System.getenv().getOrDefault("DINO_VEHICLES", ""))) return;
		try (TestSingleplayerContext world = context.worldBuilder().create()) {
			var server = world.getServer();
			server.runCommand("time set noon");
			server.runCommand("weather clear");
			server.runCommand("gamemode creative @a");
			context.runOnClient(mc -> { if (!mc.gui.hud.isHidden()) mc.gui.hud.toggle(); });
			context.waitTicks(40);
			for (var spec : ModVehicles.SPECS) {
				String type = "dinosaurs:" + spec.id;
				server.runCommand("ride @p dismount");
				server.runCommand("tp @e[type=!player] 0 -300 0");
				server.runCommand("fill -30 -61 -30 30 -61 30 minecraft:stone");
				server.runCommand("fill -30 -60 -30 30 -48 30 minecraft:air");
				server.runCommand("tp @a 0 -60 4");
				server.runCommand("summon " + type + " 0 -60 0 {Rotation:[0f,0f]}");
				context.waitTicks(5);
				server.runCommand("ride @p mount @e[type=" + type + ",limit=1]");
				for (int i = 1; i < spec.seats.size(); i++) {
					server.runCommand("summon minecraft:villager 0 -60 3 {NoAI:1b,Silent:1b,Tags:[\"passenger\"]}");
					server.runCommand("ride @e[type=villager,tag=passenger,limit=1,sort=nearest] mount @e[type=" + type + ",limit=1]");
					server.runCommand("tag @e[type=villager] remove passenger");
				}
				context.waitTicks(10);
				// front view: third person front, camera above the hood
				context.runOnClient(mc -> mc.options.setCameraType(CameraType.THIRD_PERSON_FRONT));
				server.runCommand("rotate @p -40 -25");
				context.waitTicks(15);
				context.takeScreenshot("vehicle_" + spec.id + "_front");
				// rear three-quarter view
				context.runOnClient(mc -> mc.options.setCameraType(CameraType.THIRD_PERSON_BACK));
				server.runCommand("rotate @p 60 25");
				context.waitTicks(15);
				context.takeScreenshot("vehicle_" + spec.id + "_back");
				context.runOnClient(mc -> mc.options.setCameraType(CameraType.FIRST_PERSON));

				// drive: W moves the vehicle forward, W+A turns it
				double[] start = state(server, type);
				context.getInput().holdKey(o -> o.keyUp);
				context.waitTicks(40);
				context.getInput().releaseKey(o -> o.keyUp);
				context.waitTicks(10);
				double[] moved = state(server, type);
				double dist = Math.hypot(moved[0] - start[0], moved[2] - start[2]);
				context.getInput().holdKey(o -> o.keyUp);
				context.getInput().holdKey(o -> o.keyLeft);
				context.waitTicks(20);
				context.getInput().releaseKey(o -> o.keyLeft);
				context.getInput().releaseKey(o -> o.keyUp);
				context.waitTicks(10);
				double[] turned = state(server, type);
				double yawChange = Math.abs(Mth.wrapDegrees(turned[3] - moved[3]));
				System.out.printf("[dinosaurs-test] %s drove %.1f blocks, turned %.0f degrees%n", spec.id, dist, yawChange);
				if (dist < 3) throw new AssertionError(spec.id + " did not drive forward (" + dist + " blocks)");
				if (yawChange < 20) throw new AssertionError(spec.id + " did not steer (" + yawChange + " degrees)");
			}
		}
	}

	/** x, y, z, yaw of the (only) vehicle of the given type, as seen by the server. */
	private static double[] state(TestServerContext server, String type) {
		return server.computeOnServer(s -> {
			for (var e : s.overworld().getAllEntities()) {
				if (BuiltInRegistries.ENTITY_TYPE.getKey(e.getType()).toString().equals(type) && e.getY() > -100)
					return new double[] { e.getX(), e.getY(), e.getZ(), e.getYRot() };
			}
			throw new AssertionError("vehicle " + type + " not found");
		});
	}
}

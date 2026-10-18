package dk.ulfen.dinosaurs.client;

import dk.ulfen.dinosaurs.client.block.BlocksClient;
import dk.ulfen.dinosaurs.client.gear.GearClient;
import dk.ulfen.dinosaurs.client.vehicle.VehiclesClient;

/** Client registration for the block, gear and vehicle subsystems. */
final class ClientSubsystems {
	static void init() {
		BlocksClient.init();
		GearClient.init();
		VehiclesClient.init();
	}
}

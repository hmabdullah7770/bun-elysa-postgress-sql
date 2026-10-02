import { Elysia, t } from "elysia";
import { createAuthMiddleware } from "../middleware/auth";
import {
  getDeviceById,
  getUserDevices,
  linkUserToDevice,
  playWithDevice,
  storeDeviceInfo,
  updateDeviceHealth,
} from "../controller/device.controller";

const deviceRoutes = new Elysia({ prefix: "/api/v1/devices" })
  .post("/store", storeDeviceInfo, {
    body: t.Object({
      deviceId: t.String(),
      deviceName: t.Optional(t.String()),
      brand: t.String(),
      model: t.String(),
      deviceType: t.Optional(t.String()),
      systemName: t.String(),
      systemVersion: t.String(),
      totalRAM: t.Number(),
      totalStorage: t.Number(),
      appVersion: t.Optional(t.String()),
      isAuth: t.Optional(t.Boolean()),
      buildNumber: t.Optional(t.String()),
      pushToken: t.Optional(t.String()),
      deviceMetadata: t.Optional(t.Object({
        manufacturer: t.Optional(t.String()),
        fingerprint: t.Optional(t.String()),
        apiLevel: t.Optional(t.Number()),
        carrier: t.Optional(t.String()),
        hasNotch: t.Optional(t.Boolean()),
        isTablet: t.Optional(t.Boolean()),
        isEmulator: t.Optional(t.Boolean()),
      })),
    }),
  })
  .use(createAuthMiddleware())
  .get("/user", getUserDevices)
  .get("/:deviceId", getDeviceById, {
    params: t.Object({ deviceId: t.String() }),
  })
  .put("/:deviceId/health", updateDeviceHealth, {
    params: t.Object({ deviceId: t.String() }),
    body: t.Object({
      freeRAM: t.Optional(t.Number()),
      freeStorage: t.Optional(t.Number()),
      batteryLevel: t.Optional(t.Number()),
      isCharging: t.Optional(t.Boolean()),
    }),
  })
  .patch("/:id/link-user", linkUserToDevice, {
    params: t.Object({ id: t.String() }),
  })
  .post("/:deviceId/play", playWithDevice, {
    params: t.Object({ deviceId: t.String() }),
  });

export default deviceRoutes;
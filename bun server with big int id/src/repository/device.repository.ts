import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  devices,
  type Device,
  type DeviceHealthReport,
  type NewDevice,
} from "../schemas/device.schema";

export class DeviceRepository {
  async findByDeviceId(deviceId: string): Promise<Device | undefined> {
    const result = await db.select().from(devices)
      .where(eq(devices.deviceId, deviceId)).limit(1);
    return result[0];
  }

  async findById(id: string): Promise<Device | undefined> {
    const result = await db.select().from(devices)
      .where(eq(devices._id, id)).limit(1);
    return result[0];
  }

  async findByDeviceIdAndUserId(
    deviceId: string,
    userId: string,
  ): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(and(
      eq(devices.deviceId, deviceId),
      eq(devices.userId, userId),
    )).limit(1);
    return result[0];
  }

  async findByUserId(userId: string): Promise<Device[]> {
    return db.select().from(devices)
      .where(eq(devices.userId, userId))
      .orderBy(desc(devices.lastActive));
  }

  async create(data: NewDevice): Promise<Device> {
    const result = await db.insert(devices).values(data).returning();
    if (!result[0]) throw new Error("Device creation failed");
    return result[0];
  }

  async updateById(id: string, data: Partial<NewDevice>): Promise<Device | undefined> {
    const result = await db.update(devices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(devices._id, id))
      .returning();
    return result[0];
  }

  async updateHealthReports(
    id: string,
    healthReports: DeviceHealthReport[],
  ): Promise<Device | undefined> {
    return this.updateById(id, { healthReports, lastActive: new Date() });
  }

  async linkToUser(id: string, userId: string): Promise<Device | undefined> {
    return this.updateById(id, {
      userId,
      isAuth: true,
      lastActive: new Date(),
    });
  }
}

export const deviceRepository = new DeviceRepository();
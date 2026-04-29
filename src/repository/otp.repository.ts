// src/repositories/otp.repository.ts
import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { otps, type NewOtp, type Otp } from "../schemas/otp.schema";

export class OtpRepository {
  async create(data: NewOtp): Promise<Otp> {
    const result = await db.insert(otps).values(data).returning();
    if (!result[0]) throw new Error("OTP creation failed");
    return result[0];
  }

  async findByEmailAndPurpose(
    email: string,
    purpose: "registration" | "password_reset"
  ): Promise<Otp | undefined> {
    const result = await db
      .select()
      .from(otps)
      .where(and(eq(otps.email, email.toLowerCase()), eq(otps.purpose, purpose)))
      .limit(1);
    return result[0];
  }

  async deleteByEmailAndPurpose(
    email: string,
    purpose: "registration" | "password_reset"
  ) {
    return db
      .delete(otps)
      .where(and(eq(otps.email, email.toLowerCase()), eq(otps.purpose, purpose)));
  }

  async deleteById(id: string) {
    return db.delete(otps).where(eq(otps._id, id));
  }

  async upsertByEmail(
    email: string,
    data: { otp: string; expiresAt: Date; purpose: "registration" | "password_reset" }
  ) {
    // Delete existing then create new
    await this.deleteByEmailAndPurpose(email, data.purpose);
    return this.create({
      email: email.toLowerCase(),
      otp: data.otp,
      expiresAt: data.expiresAt,
      purpose: data.purpose,
    });
  }
}

export const otpRepository = new OtpRepository();

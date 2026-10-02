import app from "./app";
import { db } from "./db";
// import { db2 } from "./db"
import { sql } from "drizzle-orm";
import { flags } from "./config/flags";  // ← import flags
import { initializeFirebase } from "./config/firebase";

async function main() {
  try {
    const firebaseApp = initializeFirebase();
    if (firebaseApp) console.log("Firebase Admin initialized");

    // Verify DB connection before starting server
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connected successfully");

    if (!flags.useQstashQueue) {
      await import("./MQ/BullMQ/workers/notification.worker");
      await import("./MQ/BullMQ/workers/email.worker");
    }
    if (flags.mailer) await import("./MQ/BullMQ/config/mailer");

    // if (flags.masterDb) {
    //    await db2.execute(sql`SELECT 1`);
    //   console.log("✅ Master database connected");
    // } else {
    //   console.log("⏭️  Master database skipped (flag disabled)");
    // }

    app.listen(process.env.PORT || 3000, () => {
      console.log(
        `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
}

main();


// import { Elysia } from "elysia";
// import {db} from './db'



// const app = new Elysia().get("/", () => "Hello Elysia").listen(process.env.PORT || 3000)


// console.log(
//   `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
// );


// const server = Bun.serve({
//   port: 3000,
//   fetch(req) {
//     const url = new URL(req.url);

//     if (url.pathname === "/") {
//       return new Response("Hello from Bun! 🚀", {
//         headers: { "Content-Type": "text/plain" },
//       });
//     }

//     return new Response("Not Found", { status: 404 });
//   },
// });

// console.log(`Server running at http://localhost:${server.port}`);


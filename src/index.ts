import  app  from "./app";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    // Verify DB connection before starting server
    await db.execute(sql`SELECT 1`);
    console.log("✅ Database connected successfully");

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


import { promises } from "fs";
import { join } from "path";
import { createApp } from "./server";
import { getDatabaseConnection } from "./database";

const STORIES_DIR = join(__dirname, "stories");
const MAIN_FILE = "main.js";

// const db = getDatabaseConnection();
// const app = createApp(db);

import { createTestApp, runApp, setupTestDatabase } from "../tests/utils";
const app = createTestApp();
const db = setupTestDatabase();

promises.readdir(STORIES_DIR, { withFileTypes: true }).then(entries => {
  entries.forEach(async (entry) => {
    if (entry.isDirectory()) {
      const file = join(STORIES_DIR, entry.name, MAIN_FILE);
      const data = await import(file);
      data.setup(app, db);
      app.use(data.path, data.router);
    }
  });
});

// set port, listen for requests
const PORT = Number(process.env.PORT) || 8081;
runApp(app, PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

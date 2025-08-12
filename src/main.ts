import { promises } from "fs";
import { join } from "path";

import { createApp } from "./server";
import { getDatabaseConnection } from "./database";


const STORIES_DIR = join(__dirname, "stories");
const MAIN_FILE = "main.js";

const db = getDatabaseConnection();
const app = createApp(db);
promises.readdir(STORIES_DIR, { withFileTypes: true }).then(entries => {
  entries.forEach(async (entry) => {
    if (entry.isDirectory()) {
      const file = join(STORIES_DIR, entry.name, MAIN_FILE);
      const data = await import(file);
      data.setup(app, db);
      app.use(data.path, data.router);
    }
  });
})

// We should just fail if this step doesn't succeed
.catch(error => {
  console.error(error);
  throw new Error("Error setting up sub-routers!");
});

// set port, listen for requests
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

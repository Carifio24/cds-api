import { promises } from "fs";
import { join } from "path";
import { createApp } from "./server";
import { createDB } from "./database";

const STORIES_DIR = join(__dirname, "stories");
const MAIN_FILE = "main.js";
const cosmicdsDB = createDB();
const app = createApp(cosmicdsDB);

promises.readdir(STORIES_DIR, { withFileTypes: true }).then(entries => {
  entries.forEach(async (entry) => {
    if (entry.isDirectory()) {
      const file = join(STORIES_DIR, entry.name, MAIN_FILE);
      const data = await import(file);
      app.use(data.path, data.router);
    }
  });
});



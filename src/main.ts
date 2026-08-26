import { readdirSync } from "fs";
import { join } from "path";
import { createApp } from "./server";
import { getDatabaseConnection } from "./database";
import { storyRouter } from "./story_router";
import { setupSwaggerDocs } from "./openapi/utils";

const STORIES_DIR = join(__dirname, "stories");
const MAIN_FILE = "main.js";

const db = getDatabaseConnection();
const app = createApp(db);

const setupPromises: Promise<void>[] = [];

const entries = readdirSync(STORIES_DIR, { withFileTypes: true });
entries.forEach(entry => {
  const promise = new Promise<void>((resolve, _reject) => {
    if (entry.isDirectory()) {
      const file = join(STORIES_DIR, entry.name, MAIN_FILE);
      import(file).then(data => {
        data.setup(app, db);
        app.use(data.path, data.router);
        resolve();
      }).catch(_err => {});
    } else {
      resolve();
    }
  });
  setupPromises.push(promise);
});

Promise.all(setupPromises)
.then(() => setupSwaggerDocs(app))
.catch(error => {
  console.error(error);
  throw new Error("Error setting up sub-routers!");
});

const stories = [
  "carina", "blaze-star-nova", "radwave-in-motion",
  "radwave-in-motion-deutsch", "jwst-brick",
  "pinwheel-supernova", "green-comet", "annular-eclipse-2023",
  "rubin-first-look", "tempo-lab",
];
stories.forEach(story => {
  const router = storyRouter({ storyName: story });
  app.use(`/${story}`, router);
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

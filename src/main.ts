import { readdirSync } from "fs";
import { join } from "path";
import { createApp, setupRoutes } from "./server";
import { getDatabaseConnection } from "./database";
import { storyRouter } from "./story_router";
import { setupSwaggerDocs } from "./openapi/utils";
import { StoryInfo } from "./types";
import { convertAllDatesToString } from "./utils";
import mung from "express-mung";

const STORIES_DIR = join(__dirname, "stories");
const MAIN_FILE = "main.js";

const db = getDatabaseConnection();
const app = createApp(db);

const setupPromises: Promise<void>[] = [];

const entries = readdirSync(STORIES_DIR, { withFileTypes: true });
const storyParams = { app, db };
entries.forEach(entry => {
  const promise = new Promise<void>((resolve, _reject) => {
    if (entry.isDirectory()) {
      const file = join(STORIES_DIR, entry.name, MAIN_FILE);
      import(file).then((data: StoryInfo) => {
        data.setup(storyParams);
        app.use(data.path, data.router);
        resolve();
      }).catch(err => console.error(err));
    } else {
      resolve();
    }
  });
  setupPromises.push(promise);
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

Promise.all(setupPromises)
.then(() => {
  setupSwaggerDocs(app);
  setupRoutes(app);
  entries.forEach(async entry => {
    if (entry.isDirectory()) {
      const file = join(STORIES_DIR, entry.name, MAIN_FILE);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const data = require(file);
      data.createEndpoints(data.router);
    }
  });
})
.catch(error => {
  console.error(error);
  throw new Error("Error setting up sub-routers!");
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

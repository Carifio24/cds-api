import { join } from "path";
import { createApp } from "./app";
import { getDatabaseConnection } from "./database";

const STORIES_DIR = join(__dirname, "stories");
const MAIN_FILE = "main.js";

const db = getDatabaseConnection();

createApp({
  db,
  storiesDir: STORIES_DIR,
  mainFilename: MAIN_FILE,
  sync: false,
  sendEmails: true,
  storyRouters: true,
})
.then(app => {
  // set port, listen for requests
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
  });
})
.catch(error => console.error(error));

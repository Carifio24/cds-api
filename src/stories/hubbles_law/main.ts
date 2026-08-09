import { classSetupRegistry } from "../../registries";
import { StoryInfo } from "../../types";
import { hubbleClassSetup } from "./database";
import { BASE_PATH, createEndpoints, router, setup } from "./router";

classSetupRegistry.register("hubbles_law", hubbleClassSetup);

const storyInfo: StoryInfo = {
  path: BASE_PATH,
  router,
  setup,
  createEndpoints,
};

module.exports = storyInfo;

import { StoryInfo } from "../../types";
import { router, setup, createEndpoints } from "./router";

const storyInfo: StoryInfo = {
  path: "/planet-parade",
  router,
  setup,
  createEndpoints,
};

module.exports = storyInfo;

import { StoryInfo } from "../../types";
import { createEndpoints, router, setup } from "./router";

const storyInfo: StoryInfo = {
  path: "/minids",
  router,
  setup,
  createEndpoints,
};

module.exports = storyInfo;

import { StoryInfo } from "../../types";
import { createEndpoints, router, setup } from "./router";

const storyInfo: StoryInfo = {
  path: "/tempo-lite",
  router,
  setup,
  createEndpoints,
};

module.exports = storyInfo;

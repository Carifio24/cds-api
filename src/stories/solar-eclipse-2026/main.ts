import { StoryInfo } from "../../types";
import { createEndpoints, router, setup } from "./router";

const storyInfo: StoryInfo = {
  path: "/solar-eclipse-2026",
  router,
  setup,
  createEndpoints,
};

module.exports = storyInfo;

import { StoryInfo } from "../../types";
import { createEndpoints, router, setup } from "./router";

const storyInfo: StoryInfo = {
  path: "/storybook",
  router,
  setup,
  createEndpoints,
};

module.exports = storyInfo;

import { StoryInfo } from "../../types";
import { createEndpoints } from "../hubbles_law/router";
import { router, setup } from "./router";

const storyInfo: StoryInfo = {
  path: "/solar-eclipse-2024",
  router,
  setup,
  createEndpoints,
};

module.exports = storyInfo;

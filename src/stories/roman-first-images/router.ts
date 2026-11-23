import { storyRouter } from "../../story_router";
import { RomanFirstImagesData, initializeModels } from "./models";
import { getRomanFirstImagesData, submitRomanFirstImagesData, updateRomanFirstImagesData } from "./database";
import type { StorySetupParams } from "../../types";

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function router() {
  return storyRouter<RomanFirstImagesData>({
    storyName: "roman-first-images",
    userExperience: true,
    dataTracking: {
      model: RomanFirstImagesData,
      getter: getRomanFirstImagesData,
      updater: updateRomanFirstImagesData,
      submitter: submitRomanFirstImagesData,
    },
  });
}

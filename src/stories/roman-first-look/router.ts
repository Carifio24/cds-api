import { storyRouter } from "../../story_router";
import { RomanFirstLookData, initializeModels } from "./models";
import { getRomanFirstLookData, submitRomanFirstLookData, updateRomanFirstLookData } from "./database";
import type { StorySetupParams } from "../../types";

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
}

export function router() {
  return storyRouter<RomanFirstLookData>({
    storyName: "roman-first-look",
    userExperience: true,
    dataTracking: {
      model: RomanFirstLookData,
      getter: getRomanFirstLookData,
      updater: updateRomanFirstLookData,
      submitter: submitRomanFirstLookData,
    },
  });
}

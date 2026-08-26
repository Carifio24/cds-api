import { Router } from "express";
import { addUserExperience } from "./mixins/user_experience";
import { AddDataTrackingOptions, addDataTracking } from "./mixins/tracking";
import { addVisit } from "./mixins/visit";

export interface StoryRouterOptions<Data> {
  storyName: string;
  userExperience?: boolean;
  visit?: boolean;
  dataTracking?: AddDataTrackingOptions<Data>;
}

export function storyRouter<Data>(options: StoryRouterOptions<Data>): Router {
  const router = Router();

  if (options.userExperience ?? true) {
    addUserExperience(router, options);
  }
  if (options.dataTracking) {
    addDataTracking(router, options.dataTracking);
  }
  if (options.visit ?? true) {
    addVisit(router, options);
  }
  return router;
}

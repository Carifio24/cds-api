import { Router } from "express";
import { addUserExperience } from "./mixins/user_experience";

export function storyRouter(storyName: string): Router {
  const router = Router();
  addUserExperience(router, { storyName });
  return router;

}

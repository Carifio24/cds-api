import type { GenericResponse } from "./server";
import { ExperienceRating } from "./models/user_experience";
import { getUserExperienceForStory, setExperienceInfoForStory } from "./database";
import { logger } from "./logger";

import type { Request } from "express";
import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";
import { JSONSchema } from "@effect/schema";

type SubmitUserExperienceRequest = Request<{ storyName: string }>;
export async function updateUserExperienceHandler(req: SubmitUserExperienceRequest, res: GenericResponse) {
  const storyName = req.params.storyName as string;
  const schema = S.struct({
    story_name: S.string,
    comments: S.optional(S.string),
    uuid: S.string,
    question: S.string,
    rating: S.optional(S.enums(ExperienceRating)),
  });
  const body = {
    ...req.body,
    story_name: storyName,
  };
  const maybe = S.decodeUnknownEither(schema)(body);
  if (Either.isLeft(maybe)) {
    res.status(400).json({
      success: false,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error The generated schema has a properties field
      error: `Invalid request body; should have the following schema: ${JSON.stringify(JSONSchema.make(schema).properties)}`,
    });
    return;
  }

  const data = maybe.right;
  const experienceInfo = await setExperienceInfoForStory(data);
  if (experienceInfo !== null) {
    res.json({
      success: true,
      rating: experienceInfo.toJSON(),
    });
  } else {
    res.status(500).json({
      success: false,
      error: "Error creating user experience info",
    });
  }
}

type GetUserExperienceRequest = Request<{ storyName: string, uuid: string }>;
export async function getUserExperienceHandler(req: GetUserExperienceRequest, res: GenericResponse) {
  const uuid = req.params.uuid as string;
  const storyName = req.params.storyName as string;
  const ratings = await getUserExperienceForStory(uuid, storyName)
    .catch(error => {
      logger.error(error);
      return null;
    });

  if (ratings === null) {
    res.status(500).json({
      error: `There was an error creating a user experience rating for used ${uuid}, story ${storyName}`,
    });
    return;
  }

  if (ratings.length === 0) {
    res.status(404).json({
      error: `User ${uuid} does not have any user experience ratings for story ${storyName}`,
    });
    return;
  }

  res.json({ ratings });
}

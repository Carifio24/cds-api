import { Router } from "express";
import { DataTypes, Model, ModelStatic } from "sequelize";
import { ExperienceRating } from "./models/user_experience";
import { getUserExperienceForStory, setExperienceInfoForStory } from "./database";
import { logger } from "./logger";
import { OptionalInt, OptionalString } from "./utils";

import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";


const TYPES_MAP = new Map();
TYPES_MAP.set(DataTypes.INTEGER.UNSIGNED, OptionalInt);
TYPES_MAP.set(DataTypes.INTEGER, OptionalInt);
TYPES_MAP.set(DataTypes.STRING, OptionalString);


export function addTrackingData<M extends Model & { user_uuid: string }>(
  router: Router,
  storyName: string,
  modelType: ModelStatic<M>,
) {

  type StructFieldType = S.StructFields[keyof S.StructFields];

  const attributes = modelType.getAttributes();
  const updateFields: Partial<Record<keyof M, StructFieldType>> = {};
  for (const entry in Object.entries(attributes)) {
    const [name, info] = entry;
    const key = name as keyof M;
    updateFields[key] = TYPES_MAP.get(info);
  }

  const Update = S.struct(updateFields as Record<keyof M, StructFieldType>);
  const Entry = S.extend(Update, S.struct({ user_uuid: S.string }));

  router.put("/data", async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(Entry)(data);

    if (Either.isLeft(maybe)) {
      res.status(400);
      res.json({ error: "Malformed data submission" });
      return;
    }

    const response = await modelType.upsert(maybe.right).then(pair => pair[0]);
    if (response === null) {
      res.status(400);
      res.json({ error: `Error creating ${storyName} entry` });
      return;
    }

    res.json({ response });
  });

}

export function addUserExperience(router: Router, storyName: string) {

  router.put("/user-experience", async (req, res) => {
    const schema = S.struct({
      story_name: S.string,
      comments: S.optional(S.string),
      uuid: S.string,
      question: S.string,
      rating: S.optional(S.enums(ExperienceRating)),
    });
    const content = {
      ...req.body,
      story_name: storyName,
    };
    const maybe = S.decodeUnknownEither(schema)(content);
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
  }); 

  router.get("/user-experience/:uuid", async (req, res) => {
    const uuid = req.params.uuid as string;
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
  });

}

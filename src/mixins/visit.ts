import type { Router } from "express";
import * as Either from "effect/Either";
import * as S from "@effect/schema/Schema";
import { addVisitForStory } from "../database";

export interface AddVisitOptions {
  storyName: string;
  visitPath?: string;
}

export function addVisit(router: Router, options: AddVisitOptions) {
  const visitPath = options.visitPath ?? "/visit";
  const visitSchema = S.struct({
    info: S.object,
  });
  router.post(visitPath, async (req, res) => {
    const input = req.body;
    const maybe = S.decodeUnknownEither(visitSchema)(input);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        success: false,
        error: "Invalid request body; should have form { info: { venue: <string> } }",
      });
      return;
    }

    const data = maybe.right;
    const visitInfo = await addVisitForStory(options.storyName, data.info);
    if (visitInfo !== null) {
      res.json({
        success: true,
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Error creating visit info entry for story ${options.storyName}`,
      });
    }
  });

  return router;
}

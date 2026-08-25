import * as Either from "effect/Either";
import type { Simplify } from "effect/Types";
import * as S from "@effect/schema/Schema";
import type { Router } from "express";

export interface AddDataTrackingOptions<A,I> {
  dataSchema: S.Schema<A,I,never>;
  submitter: (data: Simplify<A & { readonly user_uuid: string }>) => Promise<void>;
  getter: (id: string) => Promise<A>;
  updater: (id: string, data: A) => Promise<A | null>;
  dataPath?: string;
};

export function addDataTracking<A,I>(
  router: Router,
  options: AddDataTrackingOptions<A,I>
) {

  const entrySchema = S.extend(options.dataSchema, S.struct({ user_uuid: S.string });
  const path = options.dataPath ?? "/data";

  router.put(path, async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(entrySchema)(data);

    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: `Malformed data submission: ${maybe.left.error}`,
      });
      return;
    }

    const response = await options.submitter(maybe.right);
    if (response === null) {
      res.status(400).json({
        error: "Error creating data entry",
      });
      return;
    }

    res.json(response);
  });

  router.get(`${path}/:uuid`, async (req, res) => {
    const uuid = req.params.uuid as string;
    const response = await options.getter(uuid);
    if (response === null) {
      res.status(404).json({
        error: "Specified user data does not exist",
      });
      return;
    }

    res.json(response);
  });

  router.patch(`${path}/:uuid`, async (req, res) => {
    const data = req.body;

    const maybe = S.decodeUnknownEither(options.dataSchema)(data);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: `Malformed update submission: ${maybe.left.error}`,
      });
      return;
    }

    const uuid = req.params.uuid as string;
    const current = await options.getter(uuid);
    if (current === null) {
      res.status(404).json({
        error: "Specified user data does not exist",
      });
      return;
    }

    const response = await options.updater(uuid, maybe.right);
    if (response === null) {
      res.status(500).json({
        error: "Error updating user data",
      });
      return;
    }
    res.json(response);
  });
}

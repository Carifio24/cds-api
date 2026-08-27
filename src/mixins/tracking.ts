import * as Either from "effect/Either";
import * as S from "@effect/schema/Schema";
import type { Simplify } from "effect/Types";
import { parseError } from "@effect/schema/ParseResult";
import type { Router } from "express";
import type { InferCreationAttributes, ModelStatic } from "sequelize";

import { BaseTrackingData } from "../models/base_tracking_data";
import { modelToEffectSchema, type ModelEffectSchema } from "../schema";

type AllGetter<Data> = () => Promise<Data[]>;
type Getter<Data extends BaseTrackingData<Data>> = (id: string) => Promise<Data | null>;
type UpdateType<Data extends BaseTrackingData<Data>> = Simplify<Omit<InferCreationAttributes<Data>, "user_uuid">>;

export interface AddDataTrackingOptions<Data extends BaseTrackingData<Data>> {
  model: ModelStatic<Data>;
  submitter: (data: S.Schema.To<ModelEffectSchema<Data>>) => Promise<Data | null>;
  allGetter?: AllGetter<Data>;
  getter: Getter<Data>;
  updater: (id: string, data: UpdateType<Data>) => Promise<Data | null>;
  dataPath?: string;
}

export function addDataTracking<Data extends BaseTrackingData<Data>>(
  router: Router,
  options: AddDataTrackingOptions<Data>
) {

  const path = options.dataPath ?? "/data";
  const dataSchema = modelToEffectSchema(options.model);
  const updateSchema = dataSchema.pipe(S.omit("user_uuid" as keyof InferCreationAttributes<Data>));

  router.put(path, async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(dataSchema)(data);

    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: `Malformed data submission: ${parseError(maybe.left.error).toString()}`,
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

  const allGetter: AllGetter<Data> = options.allGetter ?? options.model.findAll;
  router.get(path, async (_req, res) => {
    const data = await allGetter();
    res.json(data); 
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

    const maybe = S.decodeUnknownEither(updateSchema)(data);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: `Malformed updatesubmission: ${parseError(maybe.left.error).toString()}`,
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

  return router;
}

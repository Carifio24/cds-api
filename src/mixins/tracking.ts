import * as Either from "effect/Either";
import * as S from "@effect/schema/Schema";
import type { Router } from "express";
import type { ModelStatic } from "sequelize";

import { BaseTrackingData } from "../models/base_tracking_data";
import { modelToEffectSchema, type ModelEffectSchema } from "../schema";

type AllGetter<Data> = () => Promise<Data[]>;
type Getter<Data extends BaseTrackingData<Data>> = (id: string) => Promise<Data | null>;

export interface AddDataTrackingOptions<Data extends BaseTrackingData<Data>, Update> {
  updateSchema: S.Schema<Update>;
  model: ModelStatic<Data>;
  submitter: (data: S.Schema.To<ModelEffectSchema<Data>>) => Promise<Data | null>;
  allGetter?: AllGetter<Data>;
  getter: Getter<Data>;
  updater: (id: string, data: Update) => Promise<Data | null>;
  dataPath?: string;
}

export function addDataTracking<Data extends BaseTrackingData<Data>, Update>(
  router: Router,
  options: AddDataTrackingOptions<Data, Update>
) {

  const path = options.dataPath ?? "/data";
  const dataSchema = modelToEffectSchema(options.model);

  router.put(path, async (req, res) => {
    const data = req.body;
    const maybe = S.decodeUnknownEither(dataSchema)(data);

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

    const maybe = S.decodeUnknownEither(options.updateSchema)(data);
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

    const x = maybe.right;
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

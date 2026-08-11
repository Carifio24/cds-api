import * as S from "@effect/schema/Schema";
import * as Either from "effect/Either";

import { Galaxy } from "./models/galaxy";

import {
  GenericRequest,
  GenericResponse
} from "../../server";

import { convertAllDatesToString, convertDatesToString, OptionalInt, OptionalString } from "../../utils";

import {
  getGalaxyByName,
  getAllGalaxies,
  markGalaxyBad,
  markGalaxySpectrumBad,
  markGalaxyTileloadBad,
  getHubbleMeasurement,
  submitHubbleMeasurement,
  submitSampleHubbleMeasurement,
  getStudentHubbleMeasurements,
  getSampleHubbleMeasurement,
  getSampleHubbleMeasurements,
  removeHubbleMeasurement,
  setGalaxySpectrumStatus,
  getUncheckedSpectraGalaxies,
  getClassMeasurements,
  getClassMeasurementsForStudent,
  getAllHubbleMeasurements,
  getAllHubbleStudentData,
  getAllHubbleClassData,
  getGalaxiesForDataGeneration,
  getNewGalaxies,
  getGalaxiesForTypes,
  getAllSampleHubbleMeasurements,
  getSampleGalaxy,
  getGalaxyById,
  removeSampleHubbleMeasurement,
  getAllNthSampleHubbleMeasurements,
  getClassMeasurementCountForStudent,
  getStudentsWithCompleteMeasurementsCount,
  getMergedIDsForClass,
  setWaitingRoomOverride,
  removeWaitingRoomOverride,
  getWaitingRoomOverride,
  resetATWaitingRoomTest,
  mergeNStudentsIntoClass,
  getHubbleMeasurementsForStudents,
  Measurement,
  MeasurementType,
  SampleMeasurement,
  SampleMeasurementType,
} from "./database";

import { 
  RemoveHubbleMeasurementResult,
  SubmitHubbleMeasurementResult
} from "./request_results";

import { Router } from "express";
import { ForeignKeyConstraintError, UniqueConstraintError } from "sequelize";
import { classForStudentStory, findClassById, findStudentById } from "../../database";
import { HubbleClassStudentMerge, HubbleMeasurement, initializeModels } from "./models";
import { setUpHubbleAssociations } from "./associations";
import { ClassStories, Story, Student } from "../../models";
import { Schema } from "@effect/schema";

import { OAS3Options } from "swagger-jsdoc";
import { COSMICDS_OPENAPI_APIKEY_SCHEME, COSMICDS_OPENAPI_TAGS, COSMICDS_OPENAPI_VERSION } from "../../openapi/options";
import { registerSwaggerDocs } from "../../openapi/utils";
import { schemas } from "./openapi_schemas";
import { StorySetupParams } from "../../types";

export const BASE_PATH = "/hubbles_law";

const DEFAULT_CLASS_STUDENT_IDS = [
  3761,
  3873,
  4131,
  4390,
  4100,
  3079,
  5473,
  5313,
  4213,
  4361,
  3170,
  3842,
  5577,
  5470,
  5287,
  5606,
  5379,
  5498,
  3151,
  5338,
];

export const router = Router();

export function setup(params: StorySetupParams) {
  initializeModels(params.db);
  setUpHubbleAssociations();

  Story.upsert({
    name: "hubbles_law",
    display_name: "Hubble's Law",
  }).catch(error => console.error(error));

  const swaggerOptions: OAS3Options = {
    apis: [
      "./dist/src/stories/hubbles_law/router.js",
    ],
    definition: {
      openapi: COSMICDS_OPENAPI_VERSION,
      info: {
        title: "CosmicDS API - Hubble's Law",
        version: "0.1.0",
        description: "The endpoints on the CosmicDS API server relating to the Hubble's Law story",
      },
      tags: [
        ...COSMICDS_OPENAPI_TAGS,
        {
          name: "measurements",
          description: "Operations relating to students' Hubble measurements",
        },
        {
          name: "galaxies",
          description: "Operations relating to managing galaxies used for the Hubble's Law story",
        },
      ],
      components: {
        securitySchemes: {
          apiKey: COSMICDS_OPENAPI_APIKEY_SCHEME, 
        },
        schemas: schemas(),
      },
      security: [
        { apiKey: [] },
      ],
    },
  };

  registerSwaggerDocs({
    router,
    swaggerOptions,
    name: "Hubble's Law",
    basePath: "/hubbles_law",
    title: "CosmicDS Database API - Hubble's Law",
  });

}

export function createEndpoints(router: Router) {
  /**
   *  @openapi
   *  /submit-measurement:
   *    put:
   *      tags:
   *        - students
   *        - measurements
   *      description: Submit a Hubble measurement for a student
   *      requestBody:
   *        description: At least one of galaxy_id or galaxy_name must be given. If both are given, only galaxy_id is used
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/HubbleMeasurementInput"
   *      responses:
   *        200:
   *          description: The measurement was submitted successfully
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  measurement:
   *                    schema:
   *                      $ref: "#/components/schemas/HubbleMeasurement"
   *        400:
   *          description: The request body did not have the required form
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        422:
   *          description: Either the student ID or galaxy ID did not correspond to a valid item
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.put("/submit-measurement", async (req, res) => {
  
    const schema = S.extend(Measurement.pipe(Schema.omit("galaxy_id")), S.struct({
      galaxy_id: OptionalInt,
      galaxy_name: OptionalString,
    })).pipe(
      Schema.filter(obj => "galaxy_id" in obj || "galaxy_name" in obj,
      { message: () => "At least one of galaxy_id or galaxy_name must be specified" },
    ));
  
    const maybe = S.decodeUnknownEither(schema)(req.body); 
  
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: "The request body was malformed",
      });
      return;
    }
  
    let data: MeasurementType;
  
    const maybeGalaxyID = maybe.right.galaxy_id;
    if (typeof maybeGalaxyID === "number") {
      data = { ...maybe.right, galaxy_id: maybeGalaxyID };
    } else {
      const dataToEdit = { ...maybe.right };
      let galaxyName = dataToEdit.galaxy_name as string;
      if (!galaxyName.endsWith(".fits")) {
        galaxyName += ".fits";
      }
      const galaxy = await getGalaxyByName(galaxyName);
      delete dataToEdit.galaxy_name;
      data = { ...dataToEdit, galaxy_id: galaxy?.id || 0 };
    }
  
    const result = await submitHubbleMeasurement(data);
    const status = SubmitHubbleMeasurementResult.statusCode(result);
  
    res.statusCode = status;
    if (status >= 400) {
      res.json({
        error: status,
      });
    } else {
      res.json({
        measurement: data,
      });
    }
  });
  
  /**
   *  @openapi
   *  /sample-measurement:
   *    put:
   *      description: Submit a sample Hubble measurement for a student
   *      tags:
   *        - students
   *        - measurements
   *      requestBody:
   *        required: true
   *        description: At least one of galaxy_id or galaxy_name must be given. If both are given, only galaxy_id is used. The identifier must correspond to the sample galaxy
   *        content:
   *          application/json:
   *            schema:
   *              $ref: "#/components/schemas/HubbleSampleMeasurementInput"
   *      responses:
   *        200:
   *          description: The sample measurement was submitted successfully
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  measurement:
   *                    schema:
   *                      $ref: "#/components/schemas/HubbleSampleMeasurement"
   *        400:
   *          description: The request body did not have the required form
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        422:
   *          description: Either the student ID or galaxy ID did not correspond to a valid item
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.put("/sample-measurement", async (req, res) => {
  
    const schema = S.extend(SampleMeasurement.pipe(Schema.omit("galaxy_id")), S.struct({
      galaxy_id: OptionalInt,
      galaxy_name: OptionalString,
    })).pipe(
      Schema.filter(obj => "galaxy_id" in obj || "galaxy_name" in obj,
      { message: () => "At least one of galaxy_id or galaxy_name must be specified" },
    ));
  
    const maybe = S.decodeUnknownEither(schema)(req.body);
  
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: "The request body was malformed",
      });
      return;
    }
  
    let data: SampleMeasurementType;
  
    const maybeGalaxyID = maybe.right.galaxy_id;
  
    let galaxy: Galaxy | null;
    if (typeof maybeGalaxyID === "number") {
      galaxy = await getGalaxyById(maybeGalaxyID);
      data = { ...maybe.right, galaxy_id: maybeGalaxyID, measurement_number: maybe.right.measurement_number ?? "first" };
    } else {
      const dataToEdit = { ...maybe.right };
      let galaxyName = dataToEdit.galaxy_name as string;
      if (!galaxyName.endsWith(".fits")) {
        galaxyName += ".fits";
      }
      galaxy = await getGalaxyByName(galaxyName);
      delete dataToEdit.galaxy_name;
  
      data = { ...dataToEdit, galaxy_id: galaxy?.id || 0, measurement_number: maybe.right.measurement_number ?? "first" };
    }
  
    let result: SubmitHubbleMeasurementResult;
    if (galaxy?.is_sample === 0) {
      result = await submitSampleHubbleMeasurement(data);
    } else {
      result = SubmitHubbleMeasurementResult.BadRequest;
      res.status(400).json({
        error: `The given galaxy ID ${galaxy?.id} is not that of the sample galaxy`,
      });
      return;
    }
  
    const status = SubmitHubbleMeasurementResult.statusCode(result);
    res.statusCode = status;
    if (status >= 400) {
      res.json({
        error: status,
      });
    } else {
      res.json({
        measurement: data,
      });
    }
  });
  
  /**
   *  @openapi
   *  /measurement/{studentID}/{galaxyIdentifier}:
   *    delete:
   *      tags:
   *        - students
   *        - measurements
   *      description: Delete a student's measurement for a particular galaxy
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: galaxyIdentifier
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *      responses:
   *        200:
   *          description: The measurement was successfully deleted
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  galaxy_id:
   *                    type: integer
   *        400:
   *          description: The given student ID is not a number
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: A measurement for the given student and galaxy was not found
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.delete("/measurement/:studentID/:galaxyIdentifier", async (req, res) => {
    const data = req.params;
    const studentID = parseInt(data.studentID);
  
    if (isNaN(studentID)) {
      res.status(400).json({
        error: `The student ID must be a number; received ${studentID}`,
      });
      return;
    }
  
    let galaxyID = parseInt(data.galaxyIdentifier) || 0;
    if (galaxyID === 0) {
      const galaxy = await getGalaxyByName(data.galaxyIdentifier);
      galaxyID = galaxy?.id || 0;
    }
  
    const result = await removeHubbleMeasurement(studentID, galaxyID);
    res.statusCode = RemoveHubbleMeasurementResult.statusCode(result);
  
    if (res.statusCode >= 400) {
      res.json({
        error: result,
      });
    } else {
      res.json({
        student_id: studentID,
        galaxy_id: galaxyID,
      });
    }
  });
  
  /**
    * @openapi
    * /sample-measurement/{studentID}/{measurementNumber}:
    *   delete:
    *     tags:
    *       - students
    *       - measurements
    *     description: Delete a student's sample measurement
    *     parameters:
    *       - name: studentID
    *         in: path
    *         required: true
    *         schema:
    *           type: integer
    *       - name: measurementNumber
    *         in: path
    *         required: true
    *         schema:
    *           type: string
    *           enum:
    *             - first
    *             - second
    *     responses:
    *       200:
    *         description: The sample measurement was successfully deleted
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 student_id:
    *                   type: integer
    *                 measurement_number:
    *                   type: string
    *                   enum:
    *                     - first
    *                     - second
    *       400:
    *         description: At least one of the student ID or measurement number was not of the correct format
    *         content:
    *           application/json:
    *             schema:
    *               $ref: "#/components/schemas/Error"
    *       404:
    *         description: A sample measurement for the given student and galaxy was not found
    *         content:
    *           application/json:
    *             schema:
    *               $ref: "#/components/schemas/Error"
   */
  router.delete("/sample-measurement/:studentID/:measurementNumber", async (req, res) => {
    const data = req.params;
    const studentID = parseInt(data.studentID);
    const measurementNumber = data.measurementNumber?.toLowerCase();
  
    if (isNaN(studentID) || !(["first", "second"].includes(measurementNumber))) {
      res.status(400).json({
        error: `The student ID must be a number and measurement number must be one of "first", "second",
                received student ID: ${studentID}, measurement number: ${measurementNumber}.`,
      });
      return;
    }
  
    const result = await removeSampleHubbleMeasurement(studentID, measurementNumber);
    res.statusCode = RemoveHubbleMeasurementResult.statusCode(result);
  
    if (res.statusCode >= 400) {
      res.json({
        error: result,
      });
    } else {
      res.json({
        student_id: studentID,
        measurement_number: measurementNumber,
      });
    }
  });
  
  /**
   *  @openapi
   *  /measurements/classes/{classID}:
   *    get:
   *      tags:
   *        - classes
   *        - measurements
   *      description: Get all of the student measurements for a class
   *      parameters:
   *        - name: classID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *      responses:
   *        200:
   *          description: The class exists. Returns an object with the class ID and a list of measurements
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  class_id:
   *                    type: integer
   *                  measurements:
   *                    type: array
   *                    items:
   *                      $ref: "#/components/schemas/HubbleMeasurement"
   *        400:
   *          description: The given class ID was not a number
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No class exists with the given ID
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/measurements/classes/:classID", async (req, res) => {
    const classID = parseInt(req.params.classID);
  
    if (isNaN(classID)) {
      res.status(400).json({
        error: `The class ID must be a number; received ${classID}`,
      });
      return;
    }
  
    const isValidClass = (await findClassById(classID)) !== null;
    if (!isValidClass) {
      res.status(404).json({
        error: `No class with ID ${classID}`,
      });
      return;
    }
  
    const completeOnly = (req.query.complete_only as string)?.toLowerCase() === "true";
    const excludeMergedStudents = (req.query.exclude_merge as string)?.toLowerCase() === "true";
    const measurements = await getClassMeasurements(classID, !excludeMergedStudents, completeOnly);
    res.status(200).json({
      class_id: classID,
      measurements: measurements.map(meas => convertDatesToString(meas)),
    });
  });
  
  /**
   *  @openapi
   *  /measurements/{studentID}:
   *    get:
   *      tags:
   *        - students
   *        - measurements
   *      description: Get all of a given student's measurements
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *      responses:
   *        200:
   *          description: The student exists. Returns an object containing the student ID and a list of measurements
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  measurements:
   *                    type: array
   *                    items:
   *                      $ref: "#/components/schemas/HubbleMeasurement"
   *        400:
   *          description: The given student ID is not a number
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No student exists with the given ID
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/measurements/:studentID", async (req, res) => {
    const params = req.params;
    const studentID = parseInt(params.studentID);
  
    if (isNaN(studentID)) {
      res.status(400).json({
        error: `The student ID must be a number; received ${studentID}`,
      });
      return;
    }
  
    const student = await findStudentById(studentID);
    if (student === null) {
      res.status(404).json({
        error: `No student exists with ID ${studentID}`,
      });
      return;
    }
      
    const measurements = await getStudentHubbleMeasurements(studentID);
  
    res.json({
      student_id: studentID,
      measurements: (measurements ?? []).map(meas => convertDatesToString(meas)),
    });
  });
  
  /**
   *  @openapi
   *  /measurements/{studentID}/{galaxyID}:
   *    get:
   *      tags:
   *        - students
   *        - measurements
   *      description: Get a student's measurement for a particular galaxy
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: galaxyID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *      responses:
   *        200:
   *          description: Returns an object containing the student ID, the galaxy ID, and the measurement as a JSON object
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  galaxy_id:
   *                    type: integer
   *                  measurement:
   *                    schema:
   *                      $ref: "#/components/schemas/HubbleMeasurement"
   *        400:
   *          description: At least one of the student or galaxy IDs was not an integer
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No measurement was found for the given student and galaxy
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/measurements/:studentID/:galaxyID", async (req, res) => {
    const params = req.params;
    const studentID = parseInt(params.studentID);
    const galaxyID = parseInt(params.galaxyID);
  
    if (isNaN(studentID) || isNaN(galaxyID)) {
      res.status(400).json({
        error: `Student ID and galaxy ID must both be integers; received student ID: ${studentID}, galaxy ID: ${galaxyID}`
      });
      return;
    }
  
    const measurement = await getHubbleMeasurement(studentID, galaxyID);
  
    if (measurement === null) {
      res.status(400).json({
        error: `No measurement found with student ID ${studentID} and galaxy ID ${galaxyID}`
      });
      return;
    }
  
    res.json({
      student_id: studentID,
      galaxy_id: galaxyID,
      measurement: convertDatesToString(measurement),
    });
  });
  
  /**
   *  @openapi
   *  /sample-measurements/{studentID}:
   *    get:
   *      tags:
   *        - students
   *        - measurements
   *      description: Get all of a student's sample measurements
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *      responses:
   *        200:
   *          description: The student exists. Returns an object containing the student ID and a list of measurements
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  measurements:
   *                    type: array
   *                    items:
   *                      $ref: "#/components/schemas/HubbleSampleMeasurement"
   *        400:
   *          description: The given student ID is not a number
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No student exists with the given ID
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/sample-measurements/:studentID", async (req, res) => {
    const params = req.params;
    const studentID = parseInt(params.studentID);
  
    if (isNaN(studentID)) {
      res.status(400).json({
        error: `The student ID must be a number; received ${studentID}`,
      });
      return;
    }
  
    const student = await findStudentById(studentID);
    if (student === null) {
      res.status(404).json({
        error: `No student exists with ID ${studentID}`,
      });
      return;
    }
  
    const measurements = await getSampleHubbleMeasurements(studentID);
  
    res.json({
      student_id: studentID,
      measurements: measurements.map(meas => convertAllDatesToString(meas)),
    });
  });
  
  /**
   *  @openapi
   *  /sample-measurements/{studentID}/{measurementNumber}:
   *    get:
   *      tags:
   *        - students
   *        - measurements
   *      description: Get a student's sample measurement for a given measurement number
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: measurementNumber
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            enum:
   *              - first
   *              - second
   *      responses:
   *        200:
   *          description: The student exists and has a measurement with the given number. Returns an object containing the student ID and the measurement of a JSON object
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  measurement:
   *                    schema:
   *                      $ref: "#/components/schemas/HubbleSampleMeasurement"
   *        400:
   *          description: At least one of the student ID or measurement number was not of the correct format 
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: Either the student does not exist, or the requested measurement was not found
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/sample-measurements/:studentID/:measurementNumber", async (req, res) => {
    const params = req.params;
    const studentID = parseInt(params.studentID);
    const measurementNumber = params.measurementNumber?.toLowerCase();
  
    if (isNaN(studentID) || !(["first", "second"].includes(measurementNumber))) {
      res.status(400).json({
        error: `The student ID must be a number and measurement number must be one of "first", "second",
                received student ID: ${studentID}, measurement number: ${measurementNumber}.`,
      });
      return;
    }
  
    const student = await findStudentById(studentID);
    if (student === null) {
      res.status(404).json({
        error: `No student exists with ID ${studentID}`,
      });
      return;
    }
  
    const measurement = await getSampleHubbleMeasurement(studentID, params.measurementNumber);
  
    if (measurement === null) {
      res.status(404).json({
        error: `No measurement found for stuent ID ${studentID}, measurement number ${measurementNumber}`,
      });
      return;
    }
  
    res.json({
      student_id: studentID,
      measurement: convertAllDatesToString(measurement),
    });
  });
  
  /**
   *  @openapi
   *  /sample-measurements:
   *    get:
   *      tags:
   *        - measurements
   *      description: Get all sample measurements
   *      responses:
   *        200:
   *          description: Returns a list of HubbleSampleMeasurement objects, one for each measurement
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/HubbleSampleMeasurement"
   */
  router.get("/sample-measurements", async (req, res) => {
    const filterNullString = ((req.query.filter_null as string) ?? "true").toLowerCase();
    const filterNull = filterNullString !== "false";
    const measurements = await getAllSampleHubbleMeasurements(filterNull);
    res.json(convertAllDatesToString(measurements));
  });
  
  /**
   *  @openapi
   *  /sample-measurements/{measurementNumber}:
   *    get:
   *      tags:
   *        - measurements
   *      description: Get all sample measurements for the given measurement number
   *      parameters:
   *        - name: measurementNumber
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            enum:
   *              - first
   *              - second
   *      responses:
   *        200:
   *          description: Returns a list of HubbleSampleMeasurement objects, one for each measurement with the given measurement number
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  $ref: "#/components/schemas/HubbleSampleMeasurement"
   *        400:
   *          description: The given measurement number was not either "first" or "second"
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/sample-measurements/:measurementNumber", async (req, res) => {
    const params = req.params;
    const measurementNumber = params.measurementNumber?.toLowerCase();
    if (measurementNumber !== "first" && measurementNumber !== "second") {
      res.status(400).json({
        error: `The measurement number must be either "first" or "second", received ${params.measurementNumber}`,
      });
    } else {
      const measurements = await getAllNthSampleHubbleMeasurements(measurementNumber);
      res.json(convertAllDatesToString(measurements));
    }
  });
  
  /**
   *  @openapi
   *  /sample-galaxy:
   *    get:
   *      tags:
   *        - galaxies
   *      description: Return information about the sample galaxy
   *      responses:
   *        200:
   *          description: Returns a Galaxy JSON object describing the sample galaxy
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Galaxy"
   */
  router.get("/sample-galaxy", async (_req, res) => {
    const galaxy = await getSampleGalaxy();
    res.json(galaxy);
  });
  
  /**
   *  @openapi
   *  /class-measurements/size/{studentID}/{classID}:
   *    get:
   *      tags:
   *        - measurements
   *      description: Get the number of class measurements for a given student and class
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: classID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: complete_only
   *          in: query
   *          description: If given as true, only complete measurements are counted
   *          required: false
   *          schema:
   *            type: boolean
   *            default: false
   *      responses:
   *        200:
   *          description: Returns an object containing the student ID, the class ID, and the count of relevant class measurements
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  class_id:
   *                    type: integer
   *                  measurement_count:
   *                    type: integer
   *        404:
   *          description: Either the student or class ID is invalid
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/class-measurements/size/:studentID/:classID", async (req, res) => {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");  // HTTP 1.1
    res.header("Pragma", "no-cache");  // HTTP 1.0
    res.header("Expires", "0");  // Proxies
    const studentID = parseInt(req.params.studentID);
    const isValidStudent = (await findStudentById(studentID)) !== null;
    if (!isValidStudent) {
      res.status(404).json({
        error: "Invalid student ID",
      });
      return;
    }
  
    const classID = parseInt(req.params.classID);
    const isValidClass = (await findClassById(classID)) !== null;
    if (!isValidClass) {
      res.status(404).json({
        error: "Invalid class ID",
      });
      return;
    }
  
    const completeOnly = (req.query.complete_only as string)?.toLowerCase() === "true";
    const count = await getClassMeasurementCountForStudent(studentID, classID, completeOnly);
    res.json({
      student_id: studentID,
      class_id: classID,
      measurement_count: count,
    });
  });
  
  /**
   *  @openapi
   *  /class-measurements/students-completed/{studentID}/{classID}:
   *    get:
   *      tags:
   *        - measurements
   *      description: Get the number of students related to the given student and class which have completed measurements
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: classID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *      responses:
   *        200:
   *          description: The student and class IDs are both valid. Returns an object containing the student ID, the class ID, and the number of relevant students who have completed their measurements
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  class_id:
   *                    type: integer
   *                  students_completed_measurements:
   *                    type: integer
   *        404:
   *          description: Either the student or class ID is invalid
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/class-measurements/students-completed/:studentID/:classID", async (req, res) => {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");  // HTTP 1.1
    res.header("Pragma", "no-cache");  // HTTP 1.0
    res.header("Expires", "0");  // Proxies
    const studentID = parseInt(req.params.studentID);
    const isValidStudent = (await findStudentById(studentID)) !== null;
    if (!isValidStudent) {
      res.status(404).json({
        error: "Invalid student ID",
      });
      return;
    }
  
    const classID = parseInt(req.params.classID);
    const isValidClass = (await findClassById(classID)) !== null;
    if (!isValidClass) {
      res.status(404).json({
        error: "Invalid class ID",
      });
      return;
    }
  
    const count = await getStudentsWithCompleteMeasurementsCount(studentID, classID);
    res.json({
      student_id: studentID,
      class_id: classID,
      students_completed_measurements: count,
    });
  });
  
  /**
   *  @openapi
   *  /class-measurements/{studentID}/{classID}:
   *    get:
   *      tags:
   *        - students
   *        - classes
   *        - measurements
   *      description: Get the class measurements from a given class, for a given student
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: classID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: complete_only
   *          in: query
   *          required: false
   *          schema:
   *            type: boolean
   *            default: false
   *        - name: exclude_student
   *          in: query
   *          required: false
   *          schema:
   *            type: boolean
   *            default: false
   *        - name: student_ids
   *          in: query
   *          required: false
   *          schema:
   *            type: array
   *            items:
   *              type: integer
   *      responses:
   *        200:
   *          description: All of the student IDs and the class ID are valid. Returns an object containing the student ID, the class ID, and a list of relevant measurements
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  class_id:
   *                    type: integer
   *                  measurements:
   *                    type: array
   *                    items:
   *                      $ref: "#/components/schemas/HubbleMeasurement"
   *        400:
   *          description: At least one of the student IDs is not an integer
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: At least one of the class or student IDs is invalid
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get(["/class-measurements/:studentID/:classID", "/stage-3-data/:studentID/:classID"], async (req, res) => {
    const lastCheckedStr = req.query.last_checked as string;
    let lastChecked: number | null = parseInt(lastCheckedStr);
    if (isNaN(lastChecked)) {
      lastChecked = null;
    }
    const completeOnly = (req.query.complete_only as string)?.toLowerCase() === "true";
    const excludeStudent = (req.query.exclude_student as string)?.toLowerCase() === "true";
    const params = req.params;
    let studentID = parseInt(params.studentID);
    let classID = parseInt(params.classID);
    if (studentID === 0) {
      studentID = 2487;
    }
    if (classID === 0) {
      classID = 159;
    }
  
    const student = await findStudentById(studentID);
    const invalidStudent = student === null;
    const cls = await findClassById(classID);
    const invalidClass = cls === null;
    if (invalidStudent || invalidClass) {
      const invalidItems = [];
      if (invalidStudent) { invalidItems.push("student"); }
      if (invalidClass) { invalidItems.push("class"); }
      const error = `Invalid ${invalidItems.join(" and ")} ID${invalidItems.length == 2 ? "s": ""}`;
      res.status(404).json({
        error,
      });
      return;
    }
  
    let measurements: HubbleMeasurement[];
    if ("student_ids" in req.query) {
      const idsString = req.query.student_ids as string;
      const studentIDs = idsString.split(",").map(t => Number(t));
      const valid = !studentIDs.some(x => isNaN(x));
  
      if (!valid) {
        res.status(400).json({
          error: "At least one of your specified student IDs is invalid. Student IDs should be integers.",
        });
        return;
      }
      measurements = await getHubbleMeasurementsForStudents(studentIDs, completeOnly);
    } else {
      measurements = await getClassMeasurementsForStudent(student.id, cls.id, lastChecked, completeOnly, excludeStudent);
    }
  
    res.json({
      student_id: studentID,
      class_id: classID,
      measurements: convertAllDatesToString(measurements),
    });
  });
  
  /**
   *  @openapi
   *  /class-measurements/{studentID}:
   *    get:
   *      tags:
   *        - students
   *        - classes
   *        - measurements
   *      description: Get the class measurements relevant for a given student
   *      parameters:
   *        - name: studentID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: student_ids
   *          in: query
   *          required: false
   *          description: If specified, the measurements for these students are returned
   *          schema:
   *            type: array
   *            items:
   *              type: integer
   *        - name: exclude_student
   *          in: query
   *          required: false
   *          description: If true, the given student's data is excluded from the returned measurements. Not used if a list of student IDs is specified
   *          schema:
   *            type: boolean
   *            default: false
   *      responses:
   *        200:
   *          description: The student ID is valid, as are any student IDs if specified. Returns an object containing the student ID and a list of measurements. For consistency with /class-measurements/{studentID}/{classID}, this object also contains a class ID field whose value is null
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  student_id:
   *                    type: integer
   *                  class_id:
   *                    type: null
   *                  measurements:
   *                    type: array
   *                    items:
   *                      $ref: "#/components/schemas/HubbleMeasurement"
   *        400:
   *          description: At least one of the given student IDs is invalid
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: The given student cannot be found
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get(["/class-measurements/:studentID", "stage-3-measurements/:studentID"], async (req, res) => {
    const params = req.params;
    const studentID = parseInt(params.studentID);
    const isValidStudent = (await findStudentById(studentID)) !== null;
    if (!isValidStudent) {
      res.status(404).json({
        error: "Invalid student ID",
      });
      return;
    }
  
    const cls = await classForStudentStory(studentID, "hubbles_law");
  
    let measurements: HubbleMeasurement[];
    if ("student_ids" in req.query) {
      const idsString = req.query.student_ids as string;
      const studentIDs = idsString.split(",").map(t => Number(t));
      const valid = !studentIDs.some(x => isNaN(x));
  
      if (!valid) {
        res.status(400).json({
          error: "At least one of your specified student IDs is invalid. Student IDs should be integers.",
        });
        return;
      }
      measurements = await getHubbleMeasurementsForStudents(studentIDs);
    } else if (cls !== null) {
      const excludeStudent = (req.query.exclude_student as string)?.toLowerCase() === "true";
      measurements = await getClassMeasurementsForStudent(studentID, cls.id, null, excludeStudent);
    } else {
      measurements = await getHubbleMeasurementsForStudents(DEFAULT_CLASS_STUDENT_IDS);
    }
  
    res.status(200).json({
      student_id: studentID,
      class_id: null,
      measurements: convertAllDatesToString(measurements),
    });
  });
  
  /**
   *  @openapi
   *  /merge-students:
   *    put:
   *      tags:
   *        - classes
   *      description: Update a class's merge status to include the given number of merge students
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                class_id:
   *                  type: integer
   *                desired_merge_count:
   *                  type: integer
   *                  description: This is the intended number of total students to have merged into the class, not an amount to add. Thus repeating this request with the same count will have no additional effect
   *      responses:
   *        200:
   *          description: The merge was successful. The class now has the requested number of students merged into it
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  message:
   *                    type: string
   *        400:
   *          description: The request body format was invalid
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No class was found with the given class ID
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.put("/merge-students", async (req, res) => {
    const body = req.body;
    const schema = S.struct({
      class_id: S.number.pipe(S.int()),
      desired_merge_count: S.number.pipe(S.int()),
    });
    const maybe = S.decodeUnknownEither(schema)(body);
  
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: "Invalid format. Request body should have the form { class_id: <integer>, desired_merge_count: <integer> }",
      });
      return;
    }
  
    const data = maybe.right;
    const cls = await findClassById(data.class_id);
    if (cls == null) {
      res.status(404).json({
        error: `No class found with class ID ${data.class_id}`,
      });
      return;
    }
  
    const currentMergeCount = await HubbleClassStudentMerge.count({ where: { class_id: data.class_id } });
    if (currentMergeCount >= data.desired_merge_count) {
      res.status(200).json({
        message: `No merge was performed as there are already at least ${data.desired_merge_count} students merged into class ${data.class_id}`,
      });
      return;
    }
  
    const difference = data.desired_merge_count - currentMergeCount;
    const merges = await mergeNStudentsIntoClass(data.class_id, difference)
                       .catch(error => {
                         console.error(error);
                         return null;
                       });
    if (merges == null) {
      res.status(500).json({
        error: `There was an error merging students into class ${data.class_id}`,
      });
    } else {
      res.status(200).json({
        message: `Merged ${difference} new students into class ${data.class_id}, bringing the total merge count to ${data.desired_merge_count}`,
      });
    }
  
  });
  
  /**
   *  @openapi
   *  /merge-students/{classID}:
   *    get:
   *      tags:
   *        - classes
   *      description: Return a list of information about the students merged into a given class
   *      parameters:
   *        - name: classID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: full
   *          in: query
   *          required: false
   *          schema:
   *            type: boolean
   *            default: false
   *      responses:
   *        200:
   *          description: The class exists. If `full` is true, this is a list of `Student` objects; otherwise this is a list of student IDs
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  students:
   *                    type: array
   *                    schema:
   *                      items:
   *                        oneOf:
   *                          - $ref: "#/components/schemas/Student"
   *                          - type: integer
   *        404:
   *          description: The class does not exist
   *          content:
   *            application/json:
   *              schema:
   *               $ref: "#/components/schemas/Error"
   *        422:
   *          description: The class exists but is not signed up for Hubble's Law
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/merge-students/:classID", async (req, res) => {
    const classID = Number(req.params.classID);
    const cls = await findClassById(classID);
    if (cls == null) {
      res.status(404).json({
        error: `No class exists with ID ${classID}`,
      });
      return;
    }
  
    const signedUp = await ClassStories.findOne({
      where: {
        class_id: classID,
        story_name: "hubbles_law",
      }
    });
    if (signedUp == null) {
      res.status(422).json({
        error: `The class with ID ${classID} is not signed up for Hubble's Law`,
      });
      return;
    }
  
    const full = (req.query.full as string)?.toLowerCase() === "true";
  
    const mergedStudents = await Student.findAll({
      include: [{
        model: HubbleClassStudentMerge,
        where: {
          class_id: classID,
        }
      }],
    });
  
    res.json({
      students: full ? mergedStudents : mergedStudents.map(student => student.id),
    });
  });
  
  
  /**
   *  @openapi
   *  /merged-classes/{classID}:
   *    get:
   *      deprecated: true
   *      tags:
   *        - classes
   *      description: Return the list of classes that are merged with a given class. Deprecated as the class-merging system will not be used going forward
   *      parameters:
   *        - name: classID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *        - name: ignore_merge_order
   *          in: query
   *          required: false
   *          schema:
   *            type: boolean
   *            default: false
   *      responses:
   *        200:
   *          description: The class exists. Return a list of IDs of classes merged with it
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  merged_class_ids:
   *                    type: array
   *                    items:
   *                      type: integer
   *        404:
   *          description: No class found with the given ID
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/merged-classes/:classID", async (req, res) => {
    const classID = Number(req.params.classID);
    const ignoreMergeOrder = (req.query?.ignore_merge_order as string)?.toLowerCase() === "true";
    const cls = await findClassById(classID);
    if (cls === null) {
      res.status(404).json({
        error: `No class found with ID ${classID}`,
      });
      return;
    }
    const classIDs = await getMergedIDsForClass(classID, ignoreMergeOrder);
    res.json({
      merged_class_ids: classIDs,
    });
  });
  
  /**
   *  @openapi
   *  /all-data:
   *    get:
   *      tags:
   *        - measurements
   *      description: Return all Hubble measurements, student summaries, and class summaries
   *      parameters:
   *        - name: class_id
   *          in: query
   *          required: false
   *          schema:
   *            type: integer
   *        - name: minimal
   *          in: query
   *          required: false
   *          description: If true, only a minimal set of attributes needed for the Hubble's Law story are returned
   *          schema:
   *            type: boolean
   *            default: false
   *        - name: before
   *          in: query
   *          required: false
   *          description: If specified, only fetch measurements last updated before the given date
   *          schema:
   *            type: string
   *            format: date
   *      responses:
   *        200:
   *          description: Return an object containing lists of relevant measurements, student summaries, and class summaries. The schema of each is determined by the minimal query parameter
   *          content:
   *            application/json:
   *              schema:
   *                anyOf:
   *                  - type: object
   *                    properties:
   *                      measurements:
   *                        type: array
   *                        items:
   *                          $ref: "#/components/schemas/HubbleMeasurement"
   *                      studentData:
   *                        type: array
   *                        items:
   *                          $ref: "#/components/schemas/HubbleStudentData"
   *                      classData:
   *                        type: array
   *                        items:
   *                          $ref: "#/components/schemas/HubbleClassData"
   *                  - type: object
   *                    properties:
   *                      measurements:
   *                        type: array
   *                        items:
   *                          $ref: "#/components/schemas/MinimalHubbleMeasurement"
   *                      studentData:
   *                        type: array
   *                        items:
   *                          $ref: "#/components/schemas/MinimalHubbleStudentData"
   *                      classData:
   *                        type: array
   *                        items:
   *                          $ref: "#/components/schemas/MinimalHubbleClassData"
   */
  router.get("/all-data", async (req, res) => {
    const minimal = (req.query?.minimal as string)?.toLowerCase() === "true";
    let classID: number | null = parseInt(req.query.class_id as string);
    if (isNaN(classID)) {
      classID = null;
    }
    const beforeMs: number = parseInt(req.query.before as string);
    const before = isNaN(beforeMs) ? null : new Date(beforeMs);
    const classData = await getAllHubbleClassData(before, minimal, classID);
    const classIDs = new Set(classData.map(data => data.class_id));
  
    const [measurements, studentData] =
      await Promise.all([
        getAllHubbleMeasurements(before, minimal),
        getAllHubbleStudentData([...classIDs], minimal),
      ]);

    res.json({
      measurements: convertAllDatesToString(measurements),
      studentData: convertAllDatesToString(studentData),
      classData: convertAllDatesToString(classData),
    });
  });
  
  /**
   *  @openapi
   *  /galaxies:
   *    get:
   *      tags:
   *        - galaxies
   *      description: Return information on all valid galaxies. Valid galaxies are those not marking as having some element of bad data
   *      parameters:
   *        - name: types
   *          in: query
   *          required: false
   *          description: If specified, only galaxies of the specified types are returned
   *          schema:
   *            type: array
   *            items:
   *              type: string
   *        - name: flags
   *          in: query
   *          required: false
   *          description: If specified, return the galaxy flag fields in the response
   *          schema:
   *            type: boolean
   *            default: false
   *      responses:
   *        200:
   *          description: Return a list of objects, one for each galaxy (only of the relevant types if specified). The schema is determined by the flags query parameter
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  oneOf:
   *                    - $ref: "#/components/schemas/Galaxy"
   *                    - $ref: "#/components/schemas/MinimalGalaxy"
   */
  router.get("/galaxies", async (req, res) => {
    const types = req.query?.types ?? undefined;
    const flags = (/true/i).test((req.query?.flags as string) ?? undefined);
    let galaxies: Galaxy[];
    if (types === undefined) {
      galaxies = await getAllGalaxies(flags);
    } else {
      let galaxyTypes: string[];
      if (Array.isArray(types)) {
        galaxyTypes = types as string[];
      } else {
        galaxyTypes = (types as string).split(",");
      }
      galaxies = await getGalaxiesForTypes(galaxyTypes, flags);
    }
    res.json(galaxies);
  });
  
  async function markBadHandler(
    req: GenericRequest,
    res: GenericResponse,
    errorMessage: string,
    marker: (galaxy: Galaxy) => Promise<boolean>
  ) {
    const schema = S.struct({
      galaxy_id: S.optional(S.number.pipe(S.int())),
      galaxy_name: S.optional(S.string),
    });
  
    const maybe = S.decodeUnknownEither(schema)(req.body);
  
    if (Either.isLeft(maybe)
          ||
        (maybe.right.galaxy_id == null && maybe.right.galaxy_name == null)
       ) {
      res.status(400).json({
        error: `
          Request body is malformed.
          It should have at least one of
          galaxy_id (integer) or galaxy_name (string)
        `,
      });
      return;
    }
  
    const data = maybe.right;
    const galaxy = await (data.galaxy_id != null ? getGalaxyById(data.galaxy_id) : getGalaxyByName(data.galaxy_name!));
  
    if (galaxy === null) {
      res.status(404).json({
        error: "No matching galaxy found",
      });
      return;
    }
  
    const success = await marker(galaxy);
    if (success) {
      res.status(204).end();
    } else {
      res.status(500).json({
        error: errorMessage,
      });
    }
  
  }
  
  /**
   * Really should be POST
   *  This was previously idempotent, but no longer is
   */
  
  /**
   *  @openapi
   *  /mark-galaxy-bad:
   *    put:
   *      tags:
   *        - galaxies
   *      description: Mark a galaxy as "bad", meaning that it won't be an option for future students in the Hubble data story. This was originally idempotent but not is not, so really should be a POST
   *      requestBody:
   *        required: true
   *        description: Only the galaxy_id is used if both are provided
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                galaxy_id:
   *                  type: integer
   *                galaxy_name:
   *                  type: string
   *      responses:
   *        204:
   *          description: The galaxy was successfully marked as bad
   *        400:
   *          description: The request body was malformed
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No galaxy matching the given identifier was found
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        500:
   *          description: An error occurred while marking the galaxy as bad in the database
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.put("/mark-galaxy-bad", async (req, res) => {
    const error = "Error marking the galaxy as bad";
    markBadHandler(req, res, error, markGalaxyBad)
      .catch(_err => {
        res.status(500).json({
          error
        });
      });
  });
  
  /**
   *  @openapi
   *  /mark-spectrum-bad:
   *    post:
   *      tags:
   *        - galaxies
   *      description: Mark a galaxy's spectrum as "bad", meaning that galaxy won't be an option for future students in the Hubble data story.
   *      requestBody:
   *        required: true
   *        description: Only the galaxy_id is used if both are provided
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                galaxy_id:
   *                  type: integer
   *                galaxy_name:
   *                  type: string
   *      responses:
   *        204:
   *          description: The spectrum was successfully marked as bad
   *        400:
   *          description: The request body was malformed
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No galaxy matching the given identifier was found
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        500:
   *          description: An error occurred while marking the spectrum as bad in the database
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.post("/mark-spectrum-bad", async (req, res) => {
    const error = "Error marking the spectrum as bad";
    markBadHandler(req, res, error, markGalaxySpectrumBad)
      .catch(_err => {
        res.status(500).json({
          error
        });
      });
  
  });
  
  /**
   *  @openapi
   *  /spectra/{type}/{name}:
   *    get:
   *      tags:
   *        - galaxies
   *      parameters:
   *        - name: type
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            enum:
   *              - spiral
   *              - elliptical
   *              - irregular
   *        - name: name
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *      responses:
   *        302:
   *          description: Redirect to where the given galaxy's spectrum is stored on AWS
   *          content:
   *            binary/octet-stream:
   *              schema:
   *                type: string
   *                format: binary
   */
  router.get("/spectra/:type/:name", async (req, res) => {
    res.redirect(`https://cosmicds.s3.us-east-1.amazonaws.com/spectra/${req.params.type}/${req.params.name}`);
  });
  
  
  const WaitingRoomOverrideSchema = S.struct({
    class_id: S.number.pipe(S.int()),
  });
  
  /**
   *  @openapi
   *  /waiting-room-override/{classID}:
   *    get:
   *      tags:
   *        - classes
   *      description: Get the waiting room override for a class
   *      parameters:
   *        - name: classID
   *          in: path
   *          required: true
   *          schema:
   *            type: integer
   *      responses:
   *        200:
   *          description: The class exists. Returns an object containing the class ID and its override status
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  class_id:
   *                    type: integer
   *                  override_status:
   *                    type: boolean
   *        404:
   *          description: No class was found with the given ID
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        500:
   *          description: There was a server error while determining the class's waiting room override status
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.get("/waiting-room-override/:classID", async (req, res) => {
    const classID = Number(req.params.classID);
    const cls = await findClassById(classID);
    if (cls === null) {
      res.status(404).json({
        error: `No class found with ID ${classID}`,
      });
      return;
    }
  
    getWaitingRoomOverride(classID)
      .then(override => {
        res.json({
          class_id: classID,
          override_status: override !== null,
        });
      })
      .catch(_error => {
        res.status(500).json({
          error: `Error determining waiting room override status for class with ID ${classID}`,
        });
      });
  
  });
  
  /**
   *  @openapi
   *  /waiting-room-override:
   *    put:
   *      tags:
   *        - classes
   *      description: Set a class to allow overriding the waiting room
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                class_id:
   *                  type: integer
   *      responses:
   *        200:
   *          description: The waiting room override was already set
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  class_id:
   *                    type: integer
   *                  message:
   *                    type: string
   *        201:
   *          description: The waiting room override for the class was successfully set
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  class_id:
   *                    type: integer
   *                  message:
   *                    type: string
   *        400:
   *          description: The request body has the wrong format
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        404:
   *          description: No class was found with the given ID
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        500:
   *          description: There was an error while setting the waiting room override
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.put("/waiting-room-override", async (req, res) => {
    const body = req.body;
    const maybe = S.decodeUnknownEither(WaitingRoomOverrideSchema)(body);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: "Invalid format. Request body should have the form { class_id: <integer> }",
      });
      return;
    }
  
    const right = maybe.right;
    const result = await setWaitingRoomOverride(right.class_id);
    const success = !(result instanceof Error); 
    const responseData = {
      class_id: right.class_id,
    };
    if (!success) {
      if (result instanceof ForeignKeyConstraintError) {
        res.status(404).json({
          ...responseData,
          error: `No class found with ID ${right.class_id}`,
        });
  
      // It's fine if the override already exists
      } else if (result instanceof UniqueConstraintError) {
        res.status(200).json({
          class_id: right.class_id,
          message: `The waiting room override for class ${right.class_id} was already set`,
        });
      } else {
        res.status(500).json({
          error: `An error occurred while setting the waiting room override for class ${right.class_id}`,
        });
      }
      return;
    }
    
    if (result) {
      res.status(201).json({
        ...responseData,
        message: `Successfully set waiting room override for class ${right.class_id}`,
      });
    } else {
      res.status(200).json({
        message: `The waiting room override for class ${right.class_id} was already set`,
      });
    }
  });
  
  
  /**
   *  @openapi
   *  /waiting-room-override:
   *    delete:
   *      tags:
   *        - classes
   *      description: Remove the waiting room override flag from a given class
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                class_id:
   *                  type: integer
   *      responses:
   *        200:
   *          description: The waiting room override was successfully removed, or no waiting room override existed. Returns an object containing the class ID, a flag indicating whether the override was removed, and a message describing the result
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  class_id:
   *                    type: number
   *                  removed:
   *                    type: boolean
   *                  message:
   *                    type: string
   *        400:
   *          description: The request body has the wrong format
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   *        500:
   *          description: There was an error while removing the waiting room override for the given class
   *          content:
   *            application/json:
   *              schema:
   *                $ref: "#/components/schemas/Error"
   */
  router.delete("/waiting-room-override", async (req, res) => {
    const body = req.body;
    const maybe = S.decodeUnknownEither(WaitingRoomOverrideSchema)(body);
    if (Either.isLeft(maybe)) {
      res.status(400).json({
        error: "Invalid format. Request body should have the form { class_id: <integer> }",
      });
      return;
    }
  
    const right = maybe.right;
    const countRemoved = await removeWaitingRoomOverride(right.class_id);
    const success = !isNaN(countRemoved);
    const responseData = {
      removed: success && countRemoved > 0,
      class_id: right.class_id,
    };
    if (isNaN(countRemoved)) {
      res.status(500).json({
        ...responseData,
        error: `An error occurred while removing the waiting room override for class ${right.class_id}`,
      });
      return;
    }
  
    const message = countRemoved > 0 ?
      `The waiting room override for class ${right.class_id} was removed` :
      `No waiting room override for class ${right.class_id} existed`;
  
    res.json({
      ...responseData,
      message,
    });
  });
  
  
  /** These endpoints are specifically for the spectrum-checking branch */
  
  router.get("/unchecked-galaxies", async (_req, res) => {
    const response = await getUncheckedSpectraGalaxies();
    res.json(response);
  });
  
  router.post("/mark-tileload-bad", async (req, res) => {
    const error = "Error reporting bad tile load.";
    markBadHandler(req, res, error, markGalaxyTileloadBad)
      .catch(_err => {
        res.status(500).json({
          error
        });
      });
  });
  
  router.post("/set-spectrum-status", async (req, res) => {
    const data = req.body;
    const good = data.good;
    let name = data.galaxy_name;
    if (!name.endsWith(".fits")) {
      name += ".fits";
    }
  
    const galaxy = await getGalaxyByName(name);
    if (galaxy === null) {
      res.status(400).json({
        status: "no_such_galaxy",
        galaxy: name
      });
      return;
    }
    if (typeof good !== "boolean") { 
      res.status(400).json({
        status: "invalid_status",
        galaxy: name
      });
      return;
    }
  
    const success = await setGalaxySpectrumStatus(galaxy, good)
      .then(() => true)
      .catch(error => {
        console.log(error);
        return false;
      });
  
    if (!success) {
      res.status(500).json({
        error: `Error setting galaxy spectrum status for ${name} to ${good ? "" : " not "}good`,
      });
      return;
    }
  
    res.json({
      status: "status_updated",
      marked_good: good,
      marked_bad: !good,
      galaxy: name
    });
  });
  
  router.get("/new-galaxies", async (_req, res) => {
    const galaxies = await getNewGalaxies();
    res.json(galaxies);
  });
  
  /** These endpoints are specifically for the data generation branch */
  router.get("/data-generation-galaxies", async (_req, res) => {
    const galaxies = await getGalaxiesForDataGeneration().catch(console.log);
    res.json(galaxies);
  });
  
  
  /** TEMPORARY - for the test waiting room class used by AT */
  router.delete("/at-waiting-room-test", async (_req, res) => {
    await resetATWaitingRoomTest()
      .then(() => {
        res.status(200).json({
          message: "Successfully cleared the waiting room test students.",
        });
      })
      .catch(_err => {
        res.status(500).json({
          error: "There was an error clearing the waiting room test students.",
        });
      });
  });
}

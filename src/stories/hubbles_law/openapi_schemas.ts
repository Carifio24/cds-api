import { Schemas, schemas as baseSchemas } from "../../openapi/schemas";
import { modelToSchema } from "../../openapi/utils";
import { Galaxy, HubbleClassData, HubbleMeasurement, HubbleStudentData, SampleHubbleMeasurement } from "./models";

const measurementInput = {
  type: "object",
  required: ["student_id"],
  properties: {
    student_id: { type: "integer" },
    galaxy_id: { type: "integer" },
    galaxy_name: { type: "string" },
    rest_wave_value: { type: "number" },
    rest_wave_unit: { type: "string" },
    obs_wave_value: { type: "number" },
    obs_wave_unit: { type: "string" },
    velocity_value: { type: "number" },
    velocity_unit: { type: "string" },
    ang_size_value: { type: "number" },
    ang_size_unit: { type: "string" },
    est_dist_value: { type: "number" },
    est_dist_unit: { type: "string" },
    brightness: { type: "number" },
  }
};

const sampleMeasurementInput = {
  ...measurementInput,
  properties: {
    ...measurementInput.properties, 
    measurement_number: { 
      type: "string", 
      enum: ["first", "second"],
    },
  },
};

const minimalMeasurement = {
  type: "object",
  required: ["student_id", "galaxy_id", "velocity_value", "est_dist_value", "class_id"],
  properties: {
    student_id: { type: "integer" },
    galaxy_id: { type: "integer" },
    velocity_value: { type: "number" },
    est_dist_value: { type: "number" },
    class_id: { type: "integer" },
  },
};

const minimalStudentData = {
  type: "object",
  required: ["student_id", "age_value", "class_id"],
  properties: {
    student_id: { type: "integer" },
    age_value: { type: "number" },
    class_id: { type: "integer" },
  },
};

const minimalClassData = {
  type: "object",
  required: ["class_id", "age_value"],
  properties: {
    age_value: { type: "number" },
    class_id: { type: "integer" },
  },
};

const minimalGalaxy = {
  type: "object",
  required: ["id", "ra", "decl", "z", "type", "name", "element"],
  properties: {
    id: { type: "integer" },
    ra: { type: "number" },
    decl: { type: "number" },
    z: { type: "number" },
    type: { type: "number" },
    name: { type: "string" },
    element: {
      type: "string",
      enum: ["H-α", "Mg-I"],
    },
  },
};



export function schemas(): Schemas {
  const studentData = modelToSchema(HubbleStudentData);
  studentData.properties.class_id = { type: ["integer", "null"] };

  const measurement = modelToSchema(HubbleMeasurement);
  measurement.properties.class_id = { type: ["integer", "null"] };

  return {
    ...baseSchemas(),
    Galaxy: modelToSchema(Galaxy),
    HubbleStudentData: studentData,
    HubbleClassData: modelToSchema(HubbleClassData),
    HubbleMeasurementInput: measurementInput,
    HubbleMeasurement: measurement,
    HubbleSampleMeasurementInput: sampleMeasurementInput,
    HubbleSampleMeasurement: modelToSchema(SampleHubbleMeasurement),
    MinimalHubbleMeasurement: minimalMeasurement,
    MinimalHubbleStudentData: minimalStudentData,
    MinimalHubbleClassData: minimalClassData,
    MinimalGalaxy: minimalGalaxy,
  };
}

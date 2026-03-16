import type { OAS3Definition } from "swagger-jsdoc";
import { Class, Educator, Student } from "../models";
import { modelToSchema } from "./utils";

type Schemas = OAS3Definition["schemas"];

export function schemas(): Schemas {
  return {
    Educator: modelToSchema(Educator),
    Student: modelToSchema(Student),
    Class: modelToSchema(Class),
    User: {
      oneOf: [
        "#/components/schemas/Educator",
        "#/components/schemas/Student"
      ],
    },
    EducatorCreationInfo: {
      type: "object",
      required: ["first_name", "last_name", "password", "email", "username"],
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        password: { type: "string" },
        email: { type: "string", format: "email" },
        username: { type: "string" },
        institution: { type: "string" },
        age: { type: "number", format: "int32" },
        gender: { type: "string" },
      },
    },
    EducatorCreated: {
      type: "object",
      required: ["educator_info", "status", "success"],
      properties: {
        educator_info: {
          schema: {
            "$ref": "#/components/schemas/EducatorCreationInfo",
          }
        },
        status: { type: "string", enum: ["bad_request", "ok", "email_already_exists", "error"] },
        success: { type: "boolean" },
      },
    },
    StudentCreationInfo: {
      type: "object",
      required: ["username", "password"],
      properties: {
        username: { type: "string" },
        password: { type: "string" },
        email: { type: "string", format: "email" },
        age: { type: "number", format: "int32" },
        gender: { type: "string" },
        institution: { type: "string" },
        classroom_code: { type: "string" },
      },
    },
    StudentCreated: {
      type: "object",
      required: ["student_info", "status", "success"],
      properties: {
        educator_info: {
          schema: {
            "$ref": "#/components/schemas/StudentCreationInfo",
          }
        },
        status: { type: "string", enum: ["bad_request", "ok", "email_already_exists", "error"] },
        success: { type: "boolean" },
      },
    },
    ClassCreationInfo: {
      type: "object",
      required: ["educator_id", "name", "expected_size"],
      properties: {
        educator_id: { type: "number", format: "int32" },
        name: { type: "string" },
        expected_size: { type: "number", format: "int32" },
        asynchronous: { type: "boolean" },
        story_name: { type: "string" },
      },
    },
    ClassCreated: {
      type: "object",
      required: ["status", "success"],
      properties: {
        class_info: {
          schema: {
            "$ref": "#/components/schemas/ClassCreationInfo",
          },
          status: { type: "string", enum: ["bad_request", "ok", "already_exists", "error"] },
          success: { type: "boolean" },
        }
      }
    }
  };
}

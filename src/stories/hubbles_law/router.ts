import { Galaxy } from "./models/galaxy";

import {
  GenericRequest,
  GenericResponse
} from "../../server";

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
  tryToMergeClass,
  getClassMeasurementCount,
  getStudentsWithCompleteMeasurementsCount
} from "./database";

import { 
  RemoveHubbleMeasurementResult,
  SubmitHubbleMeasurementResult
} from "./request_results";

import { Express, Router } from "express";
import { Sequelize } from "sequelize";
import { findClassById, findStudentById } from "../../database";
import { SyncMergedHubbleClasses, initializeModels } from "./models";
import { setUpHubbleAssociations } from "./associations";

export const router = Router();

export function setup(_app: Express, db: Sequelize) {
  initializeModels(db);
  setUpHubbleAssociations();
}

router.put("/submit-measurement", async (req, res) => {
  const data = req.body;
  const valid = (
    typeof data.student_id === "number" &&
    ((typeof data.galaxy_id === "number") || (typeof data.galaxy_name === "string")) &&
    (!data.rest_wave_value || typeof data.rest_wave_value === "number") &&
    (!data.rest_wave_unit || typeof data.rest_wave_unit === "string") &&
    (!data.obs_wave_value || typeof data.obs_wave_value === "number") &&
    (!data.obs_wave_unit || typeof data.obs_wave_unit === "string") &&
    (!data.velocity_value || typeof data.velocity_value === "number") &&
    (!data.velocity_unit || typeof data.velocity_unit === "string") &&
    (!data.ang_size_value || typeof data.ang_size_value === "number") &&
    (!data.ang_size_unit || typeof data.ang_size_unit === "string") &&
    (!data.est_dist_value || typeof data.est_dist_value === "number") &&
    (!data.est_dist_unit || typeof data.est_dist_unit === "string") &&
    (!data.brightness || typeof data.brightness === "number")
  );

  if (typeof data.galaxy_id !== "number") {
    let galaxyName = data.galaxy_name;
    if (!galaxyName.endsWith(".fits")) {
      galaxyName += ".fits";
    }
    const galaxy = await getGalaxyByName(galaxyName);
    data.galaxy_id = galaxy?.id || 0;
    delete data.galaxy_name;
  }

  let result: SubmitHubbleMeasurementResult;
  if (valid) {
    result = await submitHubbleMeasurement(data);
  } else {
    result = SubmitHubbleMeasurementResult.BadRequest;
    res.status(400);
  }
  res.json({
    measurement: data,
    status: result,
    success: SubmitHubbleMeasurementResult.success(result)
  });
});

router.put("/sample-measurement", async (req, res) => {
  const data = req.body;
  const valid = (
    typeof data.student_id === "number" &&
    ((typeof data.galaxy_id === "number") || (typeof data.galaxy_name === "string")) &&
    (!data.rest_wave_value || typeof data.rest_wave_value === "number") &&
    (!data.rest_wave_unit || typeof data.rest_wave_unit === "string") &&
    (!data.obs_wave_value || typeof data.obs_wave_value === "number") &&
    (!data.obs_wave_unit || typeof data.obs_wave_unit === "string") &&
    (!data.velocity_value || typeof data.velocity_value === "number") &&
    (!data.velocity_unit || typeof data.velocity_unit === "string") &&
    (!data.ang_size_value || typeof data.ang_size_value === "number") &&
    (!data.ang_size_unit || typeof data.ang_size_unit === "string") &&
    (!data.est_dist_value || typeof data.est_dist_value === "number") &&
    (!data.est_dist_unit || typeof data.est_dist_unit === "string") &&
    (!data.measurement_number || typeof data.measurement_number == "string") &&
    (!data.brightness || typeof data.brightness === "number")
  );

  let galaxy;
  if (typeof data.galaxy_id !== "number") {
    let galaxyName = data.galaxy_name;
    if (!galaxyName.endsWith(".fits")) {
      galaxyName += ".fits";
    }
    galaxy = await getGalaxyByName(galaxyName);
    data.galaxy_id = galaxy?.id || 0;
    delete data.galaxy_name;
  } else {
    galaxy = await getGalaxyById(data.galaxy_id);
  }

  if (!data.measurement_number) {
    data.measurement_number = "first";
  }

  let result: SubmitHubbleMeasurementResult;
  if (valid || galaxy === null || galaxy.is_sample === 0) {
    result = await submitSampleHubbleMeasurement(data);
  } else {
    result = SubmitHubbleMeasurementResult.BadRequest;
    res.status(400);
  }
  res.json({
    measurement: data,
    status: result,
    success: SubmitHubbleMeasurementResult.success(result)
  });
});

router.delete("/measurement/:studentID/:galaxyIdentifier", async (req, res) => {
  const data = req.params;
  const studentID = parseInt(data.studentID) || 0;

  let galaxyID = parseInt(data.galaxyIdentifier) || 0;
  if (galaxyID === 0) {
    const galaxy = await getGalaxyByName(data.galaxyIdentifier);
    galaxyID = galaxy?.id || 0;
  }
  const valid = (studentID !== 0) && (galaxyID !== 0);

  let result: RemoveHubbleMeasurementResult;
  if (valid) {
    result = await removeHubbleMeasurement(studentID, galaxyID);
  } else {
    result = RemoveHubbleMeasurementResult.BadRequest;
    res.status(400);
  }
  res.status(RemoveHubbleMeasurementResult.statusCode(result))
    .json({
      student_id: studentID,
      galaxy_id: galaxyID,
      status: result,
      success: RemoveHubbleMeasurementResult.success(result)
    });
});

router.delete("/sample-measurement/:studentID/:measurementNumber", async (req, res) => {
  const data = req.params;
  const studentID = parseInt(data.studentID) || 0;
  const measurementNumber = data.measurementNumber;
  const valid = (studentID !== 0 && (measurementNumber === "first" || measurementNumber === "second"));

  let result: RemoveHubbleMeasurementResult;
  if (valid) {
    result = await removeSampleHubbleMeasurement(studentID, measurementNumber);
  } else {
    result = RemoveHubbleMeasurementResult.BadRequest;
    res.status(400);
  }
  res.status(RemoveHubbleMeasurementResult.statusCode(result))
    .json({
      student_id: studentID,
      status: result,
      success: RemoveHubbleMeasurementResult.success(result)
    });
});

router.get("/measurements/:studentID", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const student = await findStudentById(studentID);
  const measurements = student !== null ?
    await getStudentHubbleMeasurements(studentID) :
    null;
  const status = measurements === null ? 404 : 200;
  res.status(status).json({
    student_id: studentID,
    measurements: measurements
  });
});

router.get("/measurements/:studentID/:galaxyID", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const galaxyID = parseInt(params.galaxyID);
  const measurement = await getHubbleMeasurement(studentID, galaxyID);
  const status = measurement === null ? 404 : 200;
  res.status(status).json({
    student_id: studentID,
    galaxy_id: galaxyID,
    measurement: measurement
  });
});

router.get("/sample-measurements/:studentID", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const measurements = await getSampleHubbleMeasurements(studentID);
  const status = measurements === null ? 404 : 200;
  res.status(status).json({
    student_id: studentID,
    measurements: measurements
  });
});

router.get("/sample-measurements/:studentID/:measurementNumber", async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const measurement = await getSampleHubbleMeasurement(studentID, params.measurementNumber);
  const status = measurement === null ? 404 : 200;
  res.status(status).json({
    student_id: studentID,
    measurement: measurement
  });
});

router.get("/sample-measurements", async (req, res) => {
  const filterNullString = ((req.query.filter_null as string) ?? "true").toLowerCase();
  const filterNull = filterNullString !== "false";
  const measurements = await getAllSampleHubbleMeasurements(filterNull);
  res.json(measurements);
});

router.get("/sample-measurements/:measurementNumber", async (req, res) => {
  const params = req.params;
  const measurementNumber = params.measurementNumber;
  if (measurementNumber !== "first" && measurementNumber !== "second") {
    res.status(400).json(null);
  } else {
    const measurements = await getAllNthSampleHubbleMeasurements(measurementNumber);
    res.json(measurements);
  }
});

router.get("/sample-galaxy", async (_req, res) => {
  const galaxy = await getSampleGalaxy();
  res.json(galaxy);
});

router.get("/class-measurements/size/:studentID/:classID", async (req, res) => {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");  // HTTP 1.1
  res.header("Pragma", "no-cache");  // HTTP 1.0
  res.header("Expires", "0");  // Proxies
  const studentID = parseInt(req.params.studentID);
  const isValidStudent = (await findStudentById(studentID)) !== null;
  if (!isValidStudent) {
    res.status(404).json({
      message: "Invalid student ID",
    });
    return;
  }

  const classID = parseInt(req.params.classID);
  const isValidClass = (await findClassById(classID)) !== null;
  if (!isValidClass) {
    res.status(404).json({
      message: "Invalid class ID",
    });
    return;
  }

  const completeOnly = (req.query.complete_only as string)?.toLowerCase() === "true";
  const count = await getClassMeasurementCount(studentID, classID, completeOnly);
  res.status(200).json({
    student_id: studentID,
    class_id: classID,
    measurement_count: count,
  });
});

router.get("/class-measurements/students-completed/:studentID/:classID", async (req, res) => {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate");  // HTTP 1.1
  res.header("Pragma", "no-cache");  // HTTP 1.0
  res.header("Expires", "0");  // Proxies
  const studentID = parseInt(req.params.studentID);
  const isValidStudent = (await findStudentById(studentID)) !== null;
  if (!isValidStudent) {
    res.status(404).json({
      message: "Invalid student ID",
    });
    return;
  }

  const classID = parseInt(req.params.classID);
  const isValidClass = (await findClassById(classID)) !== null;
  if (!isValidClass) {
    res.status(404).json({
      message: "Invalid class ID",
    });
    return;
  }

  const count = await getStudentsWithCompleteMeasurementsCount(studentID, classID);
  res.status(200).json({
    student_id: studentID,
    class_id: classID,
    students_completed_measurements: count,
  });
});

router.get(["/class-measurements/:studentID/:classID", "/stage-3-data/:studentID/:classID"], async (req, res) => {
  const lastCheckedStr = req.query.last_checked as string;
  let lastChecked: number | null = parseInt(lastCheckedStr);
  if (isNaN(lastChecked)) {
    lastChecked = null;
  }
  const completeOnly = (req.query.complete_only as string)?.toLowerCase() === "true";
  const params = req.params;
  let studentID = parseInt(params.studentID);
  let classID = parseInt(params.classID);
  if (studentID === 0) {
    studentID = 2487;
  }
  if (classID === 0) {
    classID = 159;
  }

  const invalidStudent = (await findStudentById(studentID)) === null;
  const invalidClass = (await findClassById(classID)) === null;
  if (invalidStudent || invalidClass) {
    const invalidItems = [];
    if (invalidStudent) { invalidItems.push("student"); }
    if (invalidClass) { invalidItems.push("class"); }
    const message = `Invalid ${invalidItems.join(" and ")} ID${invalidItems.length == 2 ? "s": ""}`;
    res.status(404).json({
      message
    });
    return;
  }

  const measurements = await getClassMeasurements(studentID, classID, lastChecked, completeOnly);
  res.status(200).json({
    student_id: studentID,
    class_id: classID,
    measurements,
  });
});

router.get(["/class-measurements/:studentID", "stage-3-measurements/:studentID"], async (req, res) => {
  const params = req.params;
  const studentID = parseInt(params.studentID);
  const isValidStudent = (await findStudentById(studentID)) !== null;
  if (!isValidStudent) {
    res.status(404).json({
      message: "Invalid student ID"
    });
    return;
  }

  const measurements = await getClassMeasurements(studentID, null);
  res.status(200).json({
    student_id: studentID,
    class_id: null,
    measurements,
  });
});

router.get("/all-data", async (req, res) => {
  const minimal = (req.query?.minimal as string)?.toLowerCase() === "true";
  const beforeMs: number = parseInt(req.query.before as string);
  const before = isNaN(beforeMs) ? null : new Date(beforeMs);
  const [measurements, studentData, classData] =
    await Promise.all([
      getAllHubbleMeasurements(before, minimal),
      getAllHubbleStudentData(before, minimal),
      getAllHubbleClassData(before, minimal)
    ]);
  res.json({
    measurements,
    studentData,
    classData
  });
});

router.put("/sync-merged-class/:classID", async(req, res) => {
  const classID = parseInt(req.params.classID);
  if (isNaN(classID)) {
    res.statusCode = 400;
    res.json({
      error: "Class ID must be a number"
    });
    return;
  }
  const database = SyncMergedHubbleClasses.sequelize;
  if (database === undefined) {
    res.status(500).json({
      error: "Error connecting to database",
    });
    return;
  }
  const data = await tryToMergeClass(database, classID);
  if (data.mergeData === null) {
    res.statusCode = 404;
    res.json({
      error: data.message
    });
    return;
  }

  res.json({
    merge_info: data.mergeData,
    message: data.message
  });
});

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

async function markBad(req: GenericRequest, res: GenericResponse, marker: (galaxy: Galaxy) => Promise<boolean>) {
  const galaxyID = req.body.galaxy_id;
  const galaxyName = req.body.galaxy_name;
  if (!(galaxyID || galaxyName)) { 
    res.status(400).json({
      status: "missing_id_or_name"
    });
    return;
   }

  let galaxy: Galaxy | null;
  if (galaxyID) {
    galaxy = await Galaxy.findOne({ where: { id : galaxyID }});
  } else {
    galaxy = await getGalaxyByName(galaxyName);
  }

  if (galaxy === null) {
    res.status(400).json({
      status: "no_such_galaxy"
    });
    return;
  }

  return marker(galaxy);
}

/**
 * Really should be POST
 * This was previously idempotent, but no longer is
 */
router.put("/mark-galaxy-bad", async (req, res) => {
  const success = await markBad(req, res, markGalaxyBad);

  if (success) {
    res.status(204).end();
  } else {
    res.status(500).json({
      error: "Error marking galaxy as bad",
    });
  }

});

router.post("/mark-spectrum-bad", async (req, res) => {
  const success = await markBad(req, res, markGalaxySpectrumBad);

  if (success) {
    res.status(204).end();
  } else {
    res.status(500).json({
      error: "Error marking spectrum as bad",
    });
  }

});

router.get("/spectra/:type/:name", async (req, res) => {
  res.redirect(`https://cosmicds.s3.us-east-1.amazonaws.com/spectra/${req.params.type}/${req.params.name}`);
});


/** These endpoints are specifically for the spectrum-checking branch */

router.get("/unchecked-galaxies", async (_req, res) => {
  const response = await getUncheckedSpectraGalaxies();
  res.json(response);
});

router.post("/mark-tileload-bad", async (req, res) => {
  const success = await markBad(req, res, markGalaxyTileloadBad);

  if (success) {
    res.status(204).end();
  } else {
    res.status(500).json({
      error: "Error marking spectrum as bad",
    });
  }

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

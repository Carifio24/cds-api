import { Attributes, FindOptions, Op, QueryTypes, Sequelize, WhereAttributeHash, WhereOptions, col, fn, literal } from "sequelize";
import { AsyncMergedHubbleStudentClasses, Galaxy, HubbleMeasurement, HubbleWaitingRoomOverride, SampleHubbleMeasurement, SyncMergedHubbleClasses } from "./models";
import { findClassById, findStudentById } from "../../database";
import { RemoveHubbleMeasurementResult, SubmitHubbleMeasurementResult } from "./request_results";
import { Class, StoryState, Student, StudentsClasses } from "../../models";
import { HubbleStudentData } from "./models/hubble_student_data";
import { HubbleClassData } from "./models/hubble_class_data";
import { IgnoreStudent } from "../../models/ignore_student";
import { logger } from "../../logger";
import { HubbleClassMergeGroup } from "./models/hubble_class_merge_group";
import * as S from "@effect/schema/Schema";

const galaxyAttributes = ["id", "ra", "decl", "z", "type", "name", "element"];

export const HubbleMeasurementSchema = S.struct({
  student_id: S.number.pipe(S.int()),
  galaxy_id: S.optional(S.string),
});

export async function submitHubbleMeasurement(data: {
  student_id: number,
  galaxy_id: number,
  rest_wave_value: number | null,
  rest_wave_unit: string | null,
  obs_wave_value: number | null,
  obs_wave_unit: string | null,
  velocity_value: number | null,
  velocity_unit: string | null,
  ang_size_value: number | null,
  ang_size_unit: string | null,
  est_dist_value: number | null,
  est_dist_unit: string | null,
  brightness?: number
}): Promise<SubmitHubbleMeasurementResult> {

  logger.verbose(`Attempting to submit measurement for student ${data.student_id}, galaxy ${data.galaxy_id}`);

  const student = await findStudentById(data.student_id);
  if (student === null) {
    logger.verbose("No such student!");
    return SubmitHubbleMeasurementResult.NoSuchStudent;
  }

  const measurement = await HubbleMeasurement.findOne({
    where: {
      [Op.and]: [
        { student_id: data.student_id },
        { galaxy_id: data.galaxy_id }
      ]
    }
  })
  .catch((_error) => {
    logger.verbose("Measurement not found");
  });

  logger.verbose(`Measurement data is ${JSON.stringify(data)}`);

  if (measurement) {
    measurement.update(data, {
      where: {
        [Op.and]: [
          { student_id: measurement.student_id },
          { galaxy_id: measurement.galaxy_id }
        ]
      }
    })
    .catch((error) => {
      logger.error("Error updating measurement!");
      logger.error(error);
    });
    logger.verbose("Updated measurement");
    return SubmitHubbleMeasurementResult.MeasurementUpdated;
  } else {
    logger.verbose("Creating new measurement");
    HubbleMeasurement.create(data).catch(console.log);
    return SubmitHubbleMeasurementResult.MeasurementCreated;
  }
}

export async function submitSampleHubbleMeasurement(data: {
  student_id: number,
  galaxy_id: number,
  measurement_number: string,
  rest_wave_value: number | null,
  rest_wave_unit: string | null,
  obs_wave_value: number | null,
  obs_wave_unit: string | null,
  velocity_value: number | null,
  velocity_unit: string | null,
  ang_size_value: number | null,
  ang_size_unit: string | null,
  est_dist_value: number | null,
  est_dist_unit: string | null,
  brightness?: number,
}): Promise<SubmitHubbleMeasurementResult> {

  const student = await findStudentById(data.student_id);
  if (student === null) {
    return SubmitHubbleMeasurementResult.NoSuchStudent;
  }

  const measurement = await SampleHubbleMeasurement.findOne({
    where: {
      [Op.and]: [
        { student_id: data.student_id },
        { galaxy_id: data.galaxy_id },
        { measurement_number: data.measurement_number }
      ]
    }
  })
  .catch(console.log);

  if (measurement) {
    measurement.update(data, {
      where: {
        [Op.and]: [
          { student_id: measurement.student_id },
          { galaxy_id: measurement.galaxy_id },
          { measurement_number: data.measurement_number }
        ]
      }
    })
    .catch(console.log);
    return SubmitHubbleMeasurementResult.MeasurementUpdated;
  } else {
    SampleHubbleMeasurement.create(data).catch(console.log);
    return SubmitHubbleMeasurementResult.MeasurementCreated;
  }
}

export async function getHubbleMeasurement(studentID: number, galaxyID: number): Promise<HubbleMeasurement | null> {
  return HubbleMeasurement.findOne({
    where: {
      [Op.and]: [
        { student_id: studentID },
        { galaxy_id: galaxyID }
      ],
    },
    include: [{
      model: Galaxy,
      attributes: galaxyAttributes,
      as: "galaxy",
      required: true
    }]
  }).catch(error => {
    console.log(error);
    return null;
  });
}

export async function getSampleHubbleMeasurements(studentID: number): Promise<SampleHubbleMeasurement[]> {
  return SampleHubbleMeasurement.findAll({
    where: { student_id: studentID },
    include: [{
      model: Galaxy,
      attributes: galaxyAttributes,
      as: "galaxy",
      required: true
    }]
  }).catch(error => {
    console.log(error);
    return [];
  });
}

export async function getSampleHubbleMeasurement(studentID: number, measurementNumber: string): Promise<SampleHubbleMeasurement | null> {
  return SampleHubbleMeasurement.findOne({
    where: { student_id: studentID, measurement_number: measurementNumber },
    include: [{
      model: Galaxy,
      attributes: galaxyAttributes,
      as: "galaxy",
      required: true
    }]
  }).catch(error => {
    console.log(error);
    return null;
  });
}

const EXCLUDE_MEASUREMENTS_WITH_NULL_CONDITION: WhereAttributeHash<HubbleMeasurement | SampleHubbleMeasurement> = {
  obs_wave_value: { [Op.not]: null },
  velocity_value: { [Op.not]: null },
  ang_size_value: { [Op.not]: null },
  est_dist_value: { [Op.not]: null }
};

export async function getAllSampleHubbleMeasurements(excludeWithNull = true): Promise<SampleHubbleMeasurement[]> {
  const query = excludeWithNull ? { where: EXCLUDE_MEASUREMENTS_WITH_NULL_CONDITION } : {};
  return SampleHubbleMeasurement.findAll(query).catch(_error => []);
}

export async function getAllNthSampleHubbleMeasurements(measurementNumber: "first" | "second"): Promise<SampleHubbleMeasurement[]> {
  return SampleHubbleMeasurement.findAll({
    where: { measurement_number: measurementNumber }
  }).catch(_error => []);
}

export async function getStudentHubbleMeasurements(studentID: number): Promise<HubbleMeasurement[] | null> {
  return HubbleMeasurement.findAll({
    where: {
      student_id: studentID
    },
    include: [{
      model: Galaxy,
      attributes: galaxyAttributes,
      as: "galaxy",
      required: true
    }]
  })
  .catch(error => {
    console.log(error);
    return null;
  });
}

async function getHubbleMeasurementsForStudentClass(studentID: number, classID: number, excludeWithNull: boolean = false): Promise<HubbleMeasurement[]> {

  const classIDs = await getMergedIDsForClass(classID);

  const studentWhereConditions: WhereOptions = [];
  const classDataStudentIDs = await getClassDataIDsForStudent(studentID);
  if (classDataStudentIDs.length > 0) {
    classDataStudentIDs.push(studentID);
    studentWhereConditions.push({
      id: {
        [Op.in]: classDataStudentIDs
      }
    });
  }

  const measurementWhereConditions: WhereOptions<HubbleMeasurement> = [];
  if (excludeWithNull) {
    measurementWhereConditions.push(EXCLUDE_MEASUREMENTS_WITH_NULL_CONDITION);
  }

  return HubbleMeasurement.findAll({
    where: measurementWhereConditions,
    include: [{
      model: Student,
      attributes: ["id"],
      as: "student",
      required: true,
      where: studentWhereConditions,
      include: [{
        model: Class,
        attributes: ["id"],
        where: {
          id: {
            [Op.in]: classIDs
          }
        }
      },
      {
        model: IgnoreStudent,
        required: false,
        attributes: [],
        where: {
          story_name: "hubbles_law"
        }
      }],
    },
    {
      model: Galaxy,
      attributes: galaxyAttributes,
      as: "galaxy",
      required: true
    }]
  });
}

async function getHubbleStudentDataForClasses(classIDs: number[]): Promise<HubbleStudentData[]> {
  return HubbleStudentData.findAll({
    include: [{
      model: Student,
      attributes: ["id"],
      as: "student",
      required: true,
      include: [{
        model: Class,
        attributes: ["id"],
        where: {
          id: {
            [Op.in]: classIDs
          }
        }
      },
      {
        model: IgnoreStudent,
        required: false,
        attributes: ["student_id", "story_name"],
        where: {
          student_id: null
        }
      }]
    }]
  });
}

async function getClassIDsForAsyncStudent(studentID: number, classID: number | null): Promise<number[]> {
  const classIDs: (number | null)[] = [classID];
  const mergedClassID = (await AsyncMergedHubbleStudentClasses.findOne({
    where: {
      class_id: classID,
      student_id: studentID
    }
  }))?.merged_class_id ?? null;
  if (mergedClassID !== null) {
    classIDs.push(mergedClassID);
  }
  const nonNullIDs: number[] = classIDs.filter((x): x is number => x !== null);
  return nonNullIDs;
}

async function getClassIDsForSyncClass(classID: number): Promise<number[]> {
  const classIDs: number[] = [classID];
  const mergedClass = (await SyncMergedHubbleClasses.findOne({
    where: {
      class_id: classID
    }
  }));
  const mergedClassID = mergedClass?.class_id ?? null;
  if (mergedClassID !== null) {
    classIDs.push(mergedClassID);
  }
  return classIDs;
}

export async function getMergedIDsForClass(classID: number, ignoreMergeOrder=false): Promise<number[]> {
  // TODO: Currently this uses two queries:
  // The first to get the merge group (if there is one)
  // Then a second to get all of the classes in the merge group
  // Maybe we can just write some SQL to make these one query?
  const mergeGroup = await HubbleClassMergeGroup.findOne({
    where: {
      class_id: classID
    }
  });
  if (mergeGroup === null) {
    return [classID];
  }

  const where: WhereOptions = {
    group_id: mergeGroup.group_id,
  };
  if (!ignoreMergeOrder) {
    where.merge_order = {
      [Op.lte]: mergeGroup.merge_order,
    };
  }
  const mergeEntries = await HubbleClassMergeGroup.findAll({ where });
  return mergeEntries.map(entry => entry.class_id);
}

export async function getClassDataIDsForStudent(studentID: number): Promise<number[]> {
  const state = (await StoryState.findOne({
    where: { student_id: studentID },
    attributes: [
      [fn("JSON_EXTRACT", col("story_state"), literal("'$.class_data_students'")), "class_data_students"]
    ]
  }));
  // TODO: Remove the need for ts-ignore here
  // @ts-ignore: Not sure how to add AS-ed in fields to type of the output
  return state?.getDataValue("class_data_students") ?? [];
}

export async function getClassMeasurements(studentID: number,
                                           classID: number,
                                           lastChecked: number | null = null,
                                           excludeWithNull: boolean = false,
): Promise<HubbleMeasurement[]> {
  let data = await getHubbleMeasurementsForStudentClass(studentID, classID, excludeWithNull);
  if (data.length > 0 && lastChecked != null) {
    const lastModified = Math.max(...data.map(meas => meas.last_modified.getTime()));
    if (lastModified <= lastChecked) {
      data = [];
    }
  }
  return data;
}

// The advantage of this over the function above is that it saves bandwidth,
// since we aren't sending the data itself.
// This is intended to be used with cases where we need to frequently check the number of measurements
export async function getClassMeasurementCount(studentID: number,
                                               classID: number,
                                               excludeWithNull: boolean = false,
): Promise<number> {
  const data = await getClassMeasurements(studentID, classID, null, excludeWithNull);
  return data?.length ?? 0;
}

// Similar to the function above, this is intended for cases where we need to frequently check
// how many students have completed their measurements, such as the beginning of Stage 4 in the Hubble story
export async function getStudentsWithCompleteMeasurementsCount(studentID: number,
                                                               classID: number,
): Promise<number> {
  const data = await getHubbleMeasurementsForStudentClass(studentID, classID, true);
  const counts: Record<number, number> = {};
  data?.forEach(measurement => {
    if (measurement.student_id in counts) {
      counts[measurement.student_id] += 1;
    } else {
      counts[measurement.student_id] = 1;
    }
  });
  let num = 0;
  for (const id in counts) {
    if (counts[id] >= 5) {
      num += 1;
    }
  }
  return num;
}

async function getHubbleStudentDataForAsyncStudent(studentID: number, classID: number | null): Promise<HubbleStudentData[] | null> {
  const classIDs = await getClassIDsForAsyncStudent(studentID, classID);
  return getHubbleStudentDataForClasses(classIDs);
}

async function getHubbleStudentDataForSyncClass(classID: number): Promise<HubbleStudentData[]> {
  const classIDs = await getClassIDsForSyncClass(classID);
  return getHubbleStudentDataForClasses(classIDs);
}

export async function _getStageThreeStudentData(studentID: number, classID: number | null): Promise<HubbleStudentData[]> {
  const cls = classID !== null ? await findClassById(classID) : null;
  const asyncClass = cls?.asynchronous ?? true;
  let data: HubbleStudentData[] | null;
  if (classID === null || asyncClass) {
    data = await getHubbleStudentDataForAsyncStudent(studentID, classID);
  } else {
    data = await getHubbleStudentDataForSyncClass(classID);
  }
  return data ?? [];
}

const MINIMAL_MEASUREMENT_FIELDS = ["student_id", "galaxy_id", "velocity_value", "est_dist_value", "class_id"];

export async function getAllHubbleMeasurements(before: Date | null = null,
                                               minimal=false,
                                               classID: number | null = null,
                                               excludeWithNull=true): Promise<HubbleMeasurement[]> {
  const whereOptions: WhereOptions = [
     { "$student.IgnoreStudents.student_id$": null }
  ];
  if (before !== null) {
    whereOptions.push({ last_modified: { [Op.lt]: before } });
  }
  if (excludeWithNull) {
    for (const [key, condition] of Object.entries(EXCLUDE_MEASUREMENTS_WITH_NULL_CONDITION)) {
      whereOptions.push({ [key]: condition });
    }
  }
  const classesWhere: WhereOptions<Class> = [];
  if (classID !== null) {
    const classIDs = await getMergedIDsForClass(classID, true);
    classesWhere.push({ id: { [Op.notIn]: classIDs } });
  }
  const exclude = minimal ? Object.keys(HubbleMeasurement.getAttributes()).filter(key => !MINIMAL_MEASUREMENT_FIELDS.includes(key)) : [];

  const measurements = await HubbleMeasurement.findAll({
    raw: true,
    attributes: {
      // The "student" here comes from the alias below
      // We do this so that we get access to the included field as just "class_id"
      include: [[Sequelize.col("student.Classes.id"), "class_id"]],
      exclude,
    },
    where: {
      [Op.and]: whereOptions
    },
    include: [{
      model: Galaxy,
      as: "galaxy",
      attributes: []
    }, {
      model: Student,
      as: "student",
      attributes: [],
      where: {
        [Op.or]: [
          { seed: 1 }, { dummy: 0 }
        ]
      },
      include: [{
        model: Class,
        attributes: [],
        through: { attributes: [] },
        where: classesWhere,
      },
      {
        model: IgnoreStudent,
        required: false,
        attributes: [],
        where: {
          story_name: "hubbles_law"
        }
      }]
    }]
  }) as (HubbleMeasurement & { class_id: number })[];

  const classIDs = new Set<number>();
  measurements.forEach(measurement => classIDs.add(measurement.class_id));
  const mergeGroupData = await HubbleClassMergeGroup.findAll({
    attributes: [
      "class_id",
      "group_id",
      // We use a RANK rather than the merge order because we don't know what the highest merge order value will be
      // But the best rank will always be 1
      [Sequelize.literal("RANK() OVER(PARTITION BY group_id ORDER BY merge_order DESC)"), "rk"],
    ],
    order: [["rk", "ASC"]],
  }) as (HubbleClassMergeGroup & { rk: number })[];

  const mergeIDsToUse: Record<number, number> = {};
  const groupIDs: Record<number, number | undefined> = {};
  mergeGroupData.forEach(data => {
    // Because this is a column constructed inside the query,
    // it doesn't work to do `data.rk`, or `data.getDataValue("rk")`
    const rank = data.get("rk");
    if (rank === 1) {
      mergeIDsToUse[data.class_id] = data.class_id;
      groupIDs[data.group_id] = data.class_id;
    } else {
      mergeIDsToUse[data.class_id] = groupIDs[data.group_id] ?? data.class_id;
    }
  });

  measurements.forEach(measurement => {
    measurement.class_id = mergeIDsToUse[measurement.class_id] ?? measurement.class_id;
  });

  return measurements;

}

const MINIMAL_STUDENT_DATA_FIELDS = ["student_id", "age_value"];
export async function getAllHubbleStudentData(before: Date | null = null, minimal=false, classID: number | null = null): Promise<HubbleStudentData[]> {
  const whereOptions: WhereOptions = [
    { "$student.IgnoreStudents.student_id$": null }
  ];
  if (before !== null) {
    whereOptions.push({ last_data_update: { [Op.lt]: before } });
  }
  const classesWhere: WhereOptions<Class> = [];
  if (classID !== null) {
    const classIDs = await getMergedIDsForClass(classID, true);
    classesWhere.push({ id : { [Op.notIn]: classIDs } });
  }
  const exclude = minimal ? Object.keys(HubbleStudentData.getAttributes()).filter(key => !MINIMAL_STUDENT_DATA_FIELDS.includes(key)) : [];

  const data = await HubbleStudentData.findAll({
    raw: true, // We want a flattened object
    attributes: {
      // The "student" here comes from the alias below
      // We do this so that we get access to the included field as just "class_id"
      include: [[Sequelize.col("student.Classes.id"), "class_id"]],
      exclude,
    },
    where: {
      [Op.and]: whereOptions
    },
    include: [{
      model: Student,
      as: "student",
      attributes: minimal ? [] : ["seed", "dummy"],
      include: [{
        model: IgnoreStudent,
        required: false,
        attributes: [],
        where: {
          story_name: "hubbles_law"
        }
      },
      {
        model: Class,
        attributes: [],
        through: { attributes: [] },
        where: classesWhere,
      }],
      where: {
         [Op.or]: [
          { seed: 1 }, { dummy: 0 }
        ]
      }
    }],
  });

  return data;
}

export async function getAllHubbleClassData(before: Date | null = null, minimal=false, classID: number | null = null): Promise<HubbleClassData[]> {
  const whereOptions: WhereOptions<HubbleClassData> = before !== null ? [{ last_data_update: { [Op.lt]: before } }] : [];
  const studentsClassesWhere: WhereOptions<StudentsClasses> = [];
  if (classID !== null) {
    const classIDs = await getMergedIDsForClass(classID, true);
    studentsClassesWhere.push({ class_id : { [Op.notIn]: classIDs } });
  }
  const query: FindOptions<HubbleClassData> = {
    include: [{
      model: StudentsClasses,
      as: "class_data",
      attributes: [],
      where: studentsClassesWhere,
    }],
    where: {
      [Op.and]: whereOptions
    },
    group: ["HubbleClassData.class_id"],
    having: Sequelize.where(Sequelize.fn("count", Sequelize.col("HubbleClassData.class_id")), { [Op.gte]: 13 })
  };
  if (minimal) {
    query.attributes = ["class_id", "age_value"];
  }
  return HubbleClassData.findAll(query);
}

export async function removeHubbleMeasurement(studentID: number, galaxyID: number): Promise<RemoveHubbleMeasurementResult> {
  const count = await HubbleMeasurement.destroy({
    where: {
      student_id: studentID,
      galaxy_id: galaxyID
    }
  });
  return count > 0 ? RemoveHubbleMeasurementResult.MeasurementDeleted : RemoveHubbleMeasurementResult.NoSuchMeasurement;
}

export async function removeSampleHubbleMeasurement(studentID: number, measurementNumber: string): Promise<RemoveHubbleMeasurementResult> {
  const count = await SampleHubbleMeasurement.destroy({
    where: {
      student_id: studentID,
      measurement_number: measurementNumber
    }
  });
  return count > 0 ? RemoveHubbleMeasurementResult.MeasurementDeleted : RemoveHubbleMeasurementResult.NoSuchMeasurement;
}

export async function getGalaxiesForTypes(types: string[], flags=false): Promise<Galaxy[]> {
  const query: FindOptions<Attributes<Galaxy>> = {
    where: {
      is_bad: 0,
      spec_is_bad: 0,
      is_sample: 0,
      type: { [Op.in]: types }
    }
  };

  if (!flags) {
    query.attributes = galaxyAttributes;
  }

  return Galaxy.findAll(query);
}

export async function getAllGalaxies(flags=false): Promise<Galaxy[]> {
  const query: FindOptions<Attributes<Galaxy>> = {
    where: {
      is_bad: 0,
      spec_is_bad: 0,
      is_sample: 0
    }
  };

  if (!flags) {
    query.attributes = galaxyAttributes;
  }

  return Galaxy.findAll(query);
}

export async function getGalaxyByName(name: string): Promise<Galaxy | null> {
  return Galaxy.findOne({
    where: { name: name }
  });
}

export async function getGalaxyById(id: number): Promise<Galaxy | null> {
  return Galaxy.findOne({
    where: { id: id }
  });
}

export async function getSampleGalaxy(): Promise<Galaxy | null> {
  return Galaxy.findOne({
    where: { is_sample: 1 }
  });
}

export async function markGalaxyBad(galaxy: Galaxy): Promise<boolean> {
  return galaxy.update({ marked_bad: galaxy.marked_bad + 1 })
    .then(() => true)
    .catch(error => {
      console.log(error);
      return false;
    });
}

export async function markGalaxySpectrumBad(galaxy: Galaxy): Promise<boolean> {
  return galaxy.update({ spec_marked_bad: galaxy.spec_marked_bad + 1 })
    .then(() => true)
    .catch(error => {
      console.log(error);
      return false;
    });
}

export async function markGalaxyTileloadBad(galaxy: Galaxy): Promise<boolean> {
  return galaxy.update({ tileload_marked_bad: galaxy.tileload_marked_bad + 1 })
    .then(() => true)
    .catch(error => {
      console.log(error);
      return false;
    });
}

export async function getAsyncMergedClassIDForStudent(studentID: number): Promise<number | null> {
  const merged = await AsyncMergedHubbleStudentClasses.findOne({
    where: {
      student_id: studentID
    }
  });
  return merged?.class_id ?? null;
}

export async function getSyncMergedClassID(classID: number): Promise<number | null> {
  const merged = await SyncMergedHubbleClasses.findOne({
    where: {
      class_id: classID
    }
  });
  return merged?.class_id ?? null;
}

/** These functions are specifically for the spectrum-checking branch */

export async function setGalaxySpectrumStatus(galaxy: Galaxy, good: boolean): Promise<void> {
  const goodInt = good ? 1 : 0;
  const update = {
    spec_is_good: goodInt,
    spec_is_bad: 1 - goodInt,
    spec_checked: galaxy.spec_checked + 1
  };
  await galaxy.update(update);
}

export async function getUncheckedSpectraGalaxies(): Promise<Galaxy[]> {
  return Galaxy.findAll({
    where: { spec_checked: 0 }
  });
}

export async function getNewGalaxies(): Promise<Galaxy[]> {
  return Galaxy.findAll({
    where: {
      [Op.and]: [
        { is_bad: 0 },
        { spec_is_bad: 0 },
        { id: { [Op.gt]: 1387 } },
        { id: { [Op.lte]: 1788 } },
      ]
    }
  });
}

/** These functions are specifically for the data generation branch */

/** For the data generation branch, we want to preferentially choose galaxies with 
 * fewer measurements. So this function will sort the galaxies by the number of measurements 
 * from seed students. The data generation branch will then feed this data sequentially
 * to the team members using it.
 * 
 * The SQL that we're looking to generate here is
 * SELECT * FROM Galaxies
 * INNER JOIN HubbleMeasurements ON Galaxies.id = HubbleMeasurements.galaxy_id
 * INNER JOIN Students on Students.id = HubbleMeasurements.student_id
 * WHERE (Students.seed = 1 OR Students.dummy = 0)
 * GROUP BY Galaxies.id
 * ORDER BY COUNT(Galaxies.id), Galaxy.id DESC
 */
export async function getGalaxiesForDataGeneration(types=["Sp"]): Promise<Galaxy[]> {
  const measurements = await Galaxy.findAll({
    where: {
      is_bad: 0,
      spec_is_bad: 0,
      is_sample: 0,
      type: { [Op.in]: types }
    },
    include: [
      {
        model: HubbleMeasurement,
        attributes: [],
        required: true,
        include: [{
          model: Student,
          as: "student",
          attributes: [],
          required: true,
          where: {
            [Op.or]: [
              { seed: 1 }, { dummy: 0 }
            ]
          }
        }]
      }
    ],
    group: ["Galaxy.id"],
    order: [Sequelize.fn("count", Sequelize.col("Galaxy.id")), ["id", "DESC"]]
  });
  const measurementIDs = measurements.map(gal => gal.id);
  const noMeasurements = await Galaxy.findAll({
    where: {
      is_bad: 0,
      spec_is_bad: 0,
      is_sample: 0,
      type: { [Op.in]: types },
      id: { [Op.notIn]: measurementIDs }
    },
    order: [["id", "DESC"]]
  });
  return noMeasurements.concat(measurements);
}

export async function getMergeDataForClass(classID: number): Promise<SyncMergedHubbleClasses | null> {
  return SyncMergedHubbleClasses.findOne({ where: { class_id: classID } });
}

type GroupData = {
  unique_gid: string;
  is_group: boolean;
  merged_count: number;
};
export async function findClassForMerge(database: Sequelize, classID: number): Promise<Class & GroupData> {
  // The SQL is complicated enough here; doing this with the ORM
  // will probably be unreadable
  const result = await database.query(
    `
    SELECT
        id,
        COUNT(*) as group_count,
        IFNULL(group_id, UUID()) AS unique_gid,
        (group_id IS NOT NULL) AS is_group,
        MAX(merge_order) as merged_count
    FROM
        Classes
            LEFT OUTER JOIN
        (SELECT * FROM HubbleClassMergeGroups ORDER BY merge_order DESC) G ON Classes.id = G.class_id
    		INNER JOIN
    		(
    			SELECT * FROM StudentsClasses GROUP BY class_id
    			HAVING COUNT(student_id) >= 15
    		) C
    		ON Classes.id = C.class_id
    WHERE id != ${classID}
    GROUP BY unique_gid
    ORDER BY is_group ASC, group_count ASC, merged_count DESC
    LIMIT 1;
        `,
    { type: QueryTypes.SELECT }
  ) as (Class & GroupData)[];
  return result[0];
}

async function nextMergeGroupID(): Promise<number> {
  const max = (await HubbleClassMergeGroup.findAll({
    attributes: [
      [Sequelize.fn("MAX", Sequelize.col("group_id")), "group_id"]
    ]
  })) as (HubbleClassMergeGroup & { group_id: number })[];
  return (max[0].group_id + 1) as number;
}

export async function addClassToMergeGroup(classID: number): Promise<number | null> {

  // Sanity check
  const existingGroup = await HubbleClassMergeGroup.findOne({ where: { class_id: classID } });
  if (existingGroup !== null) {
    return existingGroup.group_id;
  }

  const database = Class.sequelize;
  if (database === undefined) {
    return null;
  }

  const clsToMerge = await findClassForMerge(database, classID);
  let mergeGroup;
  if (clsToMerge.is_group) {
    mergeGroup = await HubbleClassMergeGroup.create({ class_id: classID, group_id: Number(clsToMerge.unique_gid), merge_order: clsToMerge.merged_count + 1 });
  } else {
    const newGroupID = await nextMergeGroupID();
    await HubbleClassMergeGroup.create({ class_id: clsToMerge.id, group_id: newGroupID, merge_order: 1 });
    mergeGroup = await HubbleClassMergeGroup.create({ class_id: classID, group_id: newGroupID, merge_order: 2 });
  }

  return mergeGroup.group_id;

}

export async function removeClassFromMergeGroup(classID: number): Promise<number> {
  return HubbleClassMergeGroup.destroy({
    where: {
      class_id: classID,
    }
  });
}

export async function getWaitingRoomOverride(classID: number): Promise<HubbleWaitingRoomOverride | null> {
  return HubbleWaitingRoomOverride.findOne({
    where: {
      class_id: classID,
    }
  });
}

export async function setWaitingRoomOverride(classID: number): Promise<boolean | Error> {
  let successOrError = await HubbleWaitingRoomOverride.findOrCreate({
    where: {
      class_id: classID,
    }
  })
  .then(result => result[1])
  .catch((error: Error) => error);

  // Once we've set the override, that means that we need to add this class to a merge group
  const mergeGroup = await addClassToMergeGroup(classID);
  if (mergeGroup === null) {
    successOrError = new Error(`Error adding class ${classID} to a merge group`);
  }

  return successOrError;
}

export async function removeWaitingRoomOverride(classID: number): Promise<number> {

  const classFindOptions: FindOptions<HubbleClassMergeGroup> = { where: { class_id: classID } };
  const mergeGroup = await HubbleClassMergeGroup.findOne(classFindOptions);
  return HubbleWaitingRoomOverride.destroy(classFindOptions)
  .then(async (count) => {
    const cls = await findClassById(classID);
    if (mergeGroup !== null && cls !== null) {

    // This condition should always be satisfied, since we should only be doing overrides
    // for non-small classes anyways (if the class is small, there shouldn't be any need 
    // to want an override to begin with)
      if (cls.small_class) {
        await removeClassFromMergeGroup(classID);
      }

      // If the merge group now only has one member, delete it
      const groupFindOptions: FindOptions = { where: { group_id: mergeGroup.group_id } };
      const mergeMembers = await HubbleClassMergeGroup.findAll(groupFindOptions);
      if (mergeMembers.length === 1) {
        await HubbleClassMergeGroup.destroy(groupFindOptions);
      }
    }

    return count;
  })
  .catch(_error => NaN);
}

export async function hubbleClassSetup(
  cls: Class,
  _storyName: string,
) {
  if (cls) {
    console.log(cls);
    if (cls.asynchronous || cls.small_class) {
      await addClassToMergeGroup(cls.id);
    }
  }
}

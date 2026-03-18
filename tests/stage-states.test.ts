/* eslint-disable @typescript-eslint/no-floating-promises */

import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import request from "supertest";
import type { Sequelize } from "sequelize";
import type { Express } from "express";
import { v4 } from "uuid";

import { authorize, createTestApp, getTestDatabaseConnection, randomClassForEducator, randomEducator, randomStory, randomStudent } from "./utils";
import { Student, StageState, StudentsClasses, Class } from "../src/models";

async function setupStageAndStudentStates() {
  const story = await randomStory();
  const student1 = await randomStudent();
  const student2 = await randomStudent();
  const educator = await randomEducator();
  const cls = await randomClassForEducator(educator.id);
  const studentClass1 = await StudentsClasses.create({
    student_id: student1.id,
    class_id: cls.id,
  });
  const studentClass2 = await StudentsClasses.create({
    student_id: student2.id,
    class_id: cls.id,
  });

  const stageState1A = await StageState.create({
    student_id: student1.id,
    story_name: story.name,
    stage_name: "A",
    state: {
      x: 1,
      y: 2,
      z: "s",
      w: {
        wFlag: false,
      },
    } as unknown as JSON,
  });
  const stageState2A = await StageState.create({
    student_id: student2.id,
    story_name: story.name,
    stage_name: "A",
    state: {
      x: 0,
      y: 5,
      z: "y",
      w: {
        wFlag: true,
      },
    } as unknown as JSON,
  });

  const stageState1B = await StageState.create({
    student_id: student1.id,
    story_name: story.name,
    stage_name: "B",
    state: {
      xx: 1,
      yy: -4.1,
      zz: "abcde",
      ww: {
        wwFlag: true,
        wwVar: 11
      }
    } as unknown as JSON,
  });
  const stageState2B = await StageState.create({
    student_id: student2.id,
    story_name: story.name,
    stage_name: "B",
    state: {
      xx: 4,
      yy: 2.6,
      zz: "vwxyz",
      ww: {
        wwFlag: false,
        wwVar: 3,
      }
    } as unknown as JSON,
  });


  const cleanup = async () => {
    await stageState1A?.destroy();
    await stageState1B?.destroy();
    await stageState2A?.destroy();
    await stageState2B?.destroy();
    await story?.destroy();
    await studentClass1?.destroy();
    await studentClass2?.destroy();
    await cls?.destroy();
    await educator?.destroy();
    await student1?.destroy();
    await student2?.destroy();
  };

  return {
    story,
    cls,
    educator,
    student1,
    student2,
    studentClass1,
    studentClass2,
    stageState1A,
    stageState1B,
    stageState2A,
    stageState2B,
    cleanup,
  };
}



describe("Test stage state routes", () => {
  let testDB: Sequelize;
  let testApp: Express;
  beforeAll(async () => {
    testDB = await getTestDatabaseConnection();
    testApp = createTestApp(testDB);
  });
  
  afterAll(async () => {
    testDB.close();
  });

  it("Should return all the stage states for a given student + story", async () => {
    const { story, student1, student2, stageState1A, stageState1B, stageState2A, stageState2B, cleanup } = await setupStageAndStudentStates();

    const studentStates = {
      [String(student1.id)]: {
        "A": stageState1A,
        "B": stageState1B,
      },
      [String(student2.id)]: {
        "A": stageState2A,
        "B": stageState2B,
      }
    };

    for (const studentID of Object.keys(studentStates)) {
      await authorize(request(testApp).get(`/stage-states/${story.name}?student_id=${studentID}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then(res => {
          const resStates = res.body;
          
          for (const stage of ["A", "B"] as const) {
            const expectedStates = studentStates[String(studentID)];
            const resStageStates = resStates[stage];
            expect(Array.isArray(resStageStates)).toBe(true);
            expect(resStageStates.length).toBe(1);
            for (const state of resStageStates) {
              expect(state).toMatchObject({...expectedStates[stage].state});
            }
          }
        });
    }

    await cleanup();
  });

  it("Should return all the stage states for a given class + story", async () => {
    const { story, cls, stageState1A, stageState1B, stageState2A, stageState2B, cleanup } = await setupStageAndStudentStates();

    const states = {
      "A": [stageState1A, stageState2A],
      "B": [stageState1B, stageState2B],
    };

    await authorize(request(testApp).get(`/stage-states/${story.name}?class_id=${cls.id}`))
      .expect(200)
      .expect("Content-Type", /json/)
      .then(res => {
        const resStates = res.body;

        for (const stage of ["A", "B"] as const) {
          const expectedStates = states[stage];
          const resStageStates = resStates[stage];
          expect(Array.isArray(resStageStates)).toBe(true);
          expect(resStageStates.length).toBe(2);

          for (const [index, state] of resStageStates.entries()) {
            expect(state).toMatchObject({...expectedStates[index].state});
          }

        }
      });

    await cleanup();
  });

  it("Should return the correct stage states for a given student + story + stage", async () => {
    const { story, student1, student2, stageState1A, stageState1B, stageState2A, stageState2B, cleanup } = await setupStageAndStudentStates();

    const studentStageStates: [Student, string, StageState][] = [
      [student1, "A", stageState1A],
      [student1, "B", stageState1B],
      [student2, "A", stageState2A],
      [student2, "B", stageState2B],
    ];

    for (const [student, stage, state] of studentStageStates) {

      await authorize(request(testApp).get(`/stage-states/${story.name}?student_id=${student.id}&stage_name=${stage}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then(res => {
          const resStates = res.body;
          expect(Array.isArray(resStates)).toBe(true);
          expect(resStates.length).toBe(1);

          const resState = resStates[0];
          expect(resState).toMatchObject({...state.state});
        });
    }

    await cleanup();
  });

  it("Should return the correct stage states for a given class + story + stage", async () => {
    const { story, cls, stageState1A, stageState1B, stageState2A, stageState2B, cleanup } = await setupStageAndStudentStates();

    const classStagesStates: [Class, string, StageState[]][] = [
      [cls, "A", [stageState1A, stageState2A]],
      [cls, "B", [stageState1B, stageState2B]],
    ];

    for (const [student, stage, states] of classStagesStates) {

      await authorize(request(testApp).get(`/stage-states/${story.name}?class_id=${student.id}&stage_name=${stage}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .then(res => {
          const resStates = res.body;
          expect(Array.isArray(resStates)).toBe(true);
          expect(resStates.length).toBe(2);

          for (const [index, state] of resStates.entries()) {
            expect(state).toMatchObject({...states[index].state});
          }
        });
    }

    await cleanup();
  });

  it("Should return the correct stage state for a given student + story + stage", async () => {
    const { story, student1, student2, stageState1A, stageState1B, stageState2A, stageState2B, cleanup } = await setupStageAndStudentStates();

    const studentStageStates: [Student, string, StageState][] = [
      [student1, "A", stageState1A],
      [student1, "B", stageState1B],
      [student2, "A", stageState2A],
      [student2, "B", stageState2B],
    ];

    for (const [student, stage, state] of studentStageStates) {

      await authorize(request(testApp).get(`/stage-state/${student.id}/${story.name}/${stage}`))
        .expect(200)
        .expect("Content-Type", /json/)
        .expect({
          student_id: student.id,
          story_name: story.name,
          stage_name: stage,
          state: state.state,
        });
    }

    await cleanup();
  });

  it("Should not find a stage state for an invalid student + story + stage", async () => {
    const { story, student1, cleanup } = await setupStageAndStudentStates();

    const data = {
      studentID: student1.id,
      storyName: story.name,
      stage: "A",
    };
    const invalid = {
      studentID: -1,
      storyName: v4(),
      stage: "C",
    } as typeof data;

    for (const [key, value] of Object.entries(invalid)) {

      const dataToUse = { ...data, [key]: value };

      await authorize(request(testApp).get(`/stage-state/${dataToUse.studentID}/${dataToUse.storyName}/${dataToUse.stage}`))
        .expect(404)
        .expect("Content-Type", /json/)
        .expect({
          student_id: dataToUse.studentID,
          story_name: dataToUse.storyName,
          stage_name: dataToUse.stage,
          state: null,
        });
    }

    await cleanup();
  });

  it("Should correctly update the stage state for a given student + story + stage", async () => {
    const { story, student1, stageState1B, cleanup } = await setupStageAndStudentStates();

    const newState = stageState1B.state;
    await authorize(request(testApp).put(`/stage-state/${student1.id}/${story.name}/A`))
      .send(newState)
      .expect(200)
      .expect("Content-Type", /json/)
      .expect({
        student_id: student1.id,
        story_name: story.name,
        stage_name: "A",
        state: newState,
      });

    await cleanup();
  });

  it("Should delete the stage state for a given student + story + stage", async () => {
    const { story, student1, cleanup } = await setupStageAndStudentStates();

    for (const stage of ["A", "B"]) {
      await authorize(request(testApp).delete(`/stage-state/${student1.id}/${story.name}/${stage}`))
        .expect(200);

      const count = await StageState.count({
        where: {
          student_id: student1.id,
          stage_name: stage,
        }
      });

      expect(count).toBe(0);
    }

    await cleanup();
  });
});

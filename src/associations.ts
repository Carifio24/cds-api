import { Student } from "./models/student";
import { Class } from "./models/class";
import { Story } from "./models/story";
import { StudentsClasses } from "./models/student_class";
import { ClassStories } from "./models/story_class";
import { StoryState } from "./models/story_state";
import { IgnoreStudent } from "./models/ignore_student";

export function setUpAssociations() {

  Student.belongsToMany(Class, {
    through: StudentsClasses,
    sourceKey: "id",
    targetKey: "id",
    foreignKey: "student_id",
    otherKey: "class_id",
    onUpdate: "CASCADE",
    onDelete: "CASCADE"
  });
  Class.belongsToMany(Student, {
    through: StudentsClasses,
    sourceKey: "id",
    targetKey: "id",
    foreignKey: "class_id",
    otherKey: "student_id",
    onUpdate: "CASCADE",
    onDelete: "CASCADE"
  });

  Story.belongsToMany(Class, {
    through: ClassStories,
    sourceKey: "name",
    targetKey: "id",
    foreignKey: "story_name",
    otherKey: "class_id",
    onUpdate: "CASCADE",
    onDelete: "CASCADE"
  });

  Story.belongsToMany(Student, {
    through: StoryState,
    sourceKey: "name",
    targetKey: "id",
    foreignKey: "story_name",
    otherKey: "student_id",
    onUpdate: "CASCADE",
    onDelete: "CASCADE"
  });

  Student.hasMany(StoryState, {
    foreignKey: "student_id"
  });
  StoryState.belongsTo(Student, {
    as: "student",
    targetKey: "id",
    foreignKey: "student_id"
  });

  Story.hasMany(StoryState, {
    foreignKey: "story_name"
  });
  StoryState.belongsTo(Story, {
    as: "story",
    targetKey: "name",
    foreignKey: "story_name"
  });

  Student.hasMany(IgnoreStudent, {
    foreignKey: "student_id"
  });
  IgnoreStudent.belongsTo(Student, {
    as: "student",
    targetKey: "id",
    foreignKey: "student_id"
  });

  Story.hasMany(IgnoreStudent, {
    foreignKey: "story_name"
  });
  IgnoreStudent.belongsTo(Story, {
    as: "story",
    targetKey: "name",
    foreignKey: "story_name"
  });
  
  Story.hasMany(ClassStories, {
    foreignKey: "story_name"
  });
  ClassStories.belongsTo(Story, {
    as: "story",
    targetKey: "name",
    foreignKey: "story_name"
  });


  Class.hasMany(ClassStories, {
    foreignKey: "class_id"
  });
  ClassStories.belongsTo(Class, {
    as: "class",
    targetKey: "id",
    foreignKey: "class_id"
  });

  Student.hasMany(StudentsClasses, {
    foreignKey: "student_id",
  });
  StudentsClasses.belongsTo(Student, {
    as: "student",
    targetKey: "id",
    foreignKey: "student_id",
  });

  Class.hasMany(StudentsClasses, {
    foreignKey: "class_id"
  });
  StudentsClasses.belongsTo(Class, {
    as: "class",
    targetKey: "id",
    foreignKey: "class_id"
  });

}

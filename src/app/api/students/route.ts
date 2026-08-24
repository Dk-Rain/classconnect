import { NextResponse } from "next/server";
import { getNeo4jDriver, toNative } from "@/lib/neo4j";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("id");

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    if (studentId) {
      // Multi-hop Cypher query for a specific student
      const result = await session.run(
        `
        MATCH (s:Student { id: $studentId })
        OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Class)
        OPTIONAL MATCH (s)-[takes:TAKES]->(sub:Subject)
        OPTIONAL MATCH (t:Teacher)-[:TEACHES]->(sub)
        RETURN s.id AS id,
               s.name AS name,
               s.age AS age,
               s.gender AS gender,
               s.email AS email,
               c.name AS className,
               c.level AS classLevel,
               c.room AS classRoom,
               collect(DISTINCT {
                 subjectCode: sub.code,
                 subjectName: sub.name,
                 credits: sub.credits,
                 category: sub.category,
                 grade: takes.grade,
                 semester: takes.semester,
                 teacherName: t.name,
                 teacherId: t.id,
                 teacherDept: t.department
               }) AS subjectsAndTeachers
        `,
        { studentId }
      );

      if (result.records.length === 0) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const record = result.records[0];
      const nativeSubjectsAndTeachers = toNative(record.get("subjectsAndTeachers")) || [];

      const student = {
        id: record.get("id"),
        name: record.get("name"),
        age: toNative(record.get("age")),
        gender: record.get("gender"),
        email: record.get("email"),
        class: record.get("className")
          ? {
              name: record.get("className"),
              level: record.get("classLevel"),
              room: record.get("classRoom"),
            }
          : null,
        courses: nativeSubjectsAndTeachers.filter((item: any) => item && item.subjectCode !== null),
      };

      return NextResponse.json(toNative(student));
    }

    // Get all students with their class and subject count
    const result = await session.run(`
      MATCH (s:Student)
      OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Class)
      OPTIONAL MATCH (s)-[:TAKES]->(sub:Subject)
      OPTIONAL MATCH (t:Teacher)-[:TEACHES]->(sub)
      RETURN s.id AS id,
             s.name AS name,
             s.age AS age,
             s.gender AS gender,
             s.email AS email,
             c.name AS className,
             count(DISTINCT sub) AS subjectCount,
             count(DISTINCT t) AS teacherCount
      ORDER BY s.id ASC
    `);

    const students = result.records.map((r) => ({
      id: r.get("id"),
      name: r.get("name"),
      age: toNative(r.get("age")),
      gender: r.get("gender"),
      email: r.get("email"),
      className: r.get("className") || "Unassigned",
      subjectCount: toNative(r.get("subjectCount")),
      teacherCount: toNative(r.get("teacherCount")),
    }));

    return NextResponse.json(toNative(students));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch students" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

import { NextResponse } from "next/server";
import { getNeo4jDriver, toNative } from "@/lib/neo4j";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get("name");

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    if (className) {
      const result = await session.run(
        `
        MATCH (c:Class { name: $className })
        OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
        OPTIONAL MATCH (sub:Subject)-[:OFFERED_IN]->(c)
        OPTIONAL MATCH (t:Teacher)-[:TEACHES]->(sub)
        RETURN c.name AS name,
               c.level AS level,
               c.room AS room,
               c.capacity AS capacity,
               collect(DISTINCT { id: s.id, name: s.name, gender: s.gender, age: s.age }) AS students,
               collect(DISTINCT { code: sub.code, name: sub.name, credits: sub.credits, teacher: t.name }) AS subjects
        `,
        { className }
      );

      if (result.records.length === 0) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }

      const record = result.records[0];
      const nativeStudents = toNative(record.get("students")) || [];
      const nativeSubjects = toNative(record.get("subjects")) || [];

      const classData = {
        name: record.get("name"),
        level: record.get("level"),
        room: record.get("room"),
        capacity: toNative(record.get("capacity")),
        students: nativeStudents.filter((s: any) => s && s.id !== null),
        subjects: nativeSubjects.filter((sub: any) => sub && sub.code !== null),
      };

      return NextResponse.json(toNative(classData));
    }

    const result = await session.run(`
      MATCH (c:Class)
      OPTIONAL MATCH (s:Student)-[:ENROLLED_IN]->(c)
      OPTIONAL MATCH (sub:Subject)-[:OFFERED_IN]->(c)
      RETURN c.name AS name,
             c.level AS level,
             c.room AS room,
             c.capacity AS capacity,
             count(DISTINCT s) AS studentCount,
             count(DISTINCT sub) AS subjectCount
      ORDER BY c.name ASC
    `);

    const classes = result.records.map((r) => ({
      name: r.get("name"),
      level: r.get("level"),
      room: r.get("room"),
      capacity: toNative(r.get("capacity")),
      studentCount: toNative(r.get("studentCount")),
      subjectCount: toNative(r.get("subjectCount")),
    }));

    return NextResponse.json(toNative(classes));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch classes" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

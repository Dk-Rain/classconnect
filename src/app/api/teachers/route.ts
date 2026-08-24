import { NextResponse } from "next/server";
import { getNeo4jDriver, toNative } from "@/lib/neo4j";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("id");

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    if (teacherId) {
      const result = await session.run(
        `
        MATCH (t:Teacher { id: $teacherId })
        OPTIONAL MATCH (t)-[:TEACHES]->(sub:Subject)
        OPTIONAL MATCH (s:Student)-[:TAKES]->(sub)
        OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Class)
        RETURN t.id AS id,
               t.name AS name,
               t.department AS department,
               t.email AS email,
               collect(DISTINCT {
                 code: sub.code,
                 name: sub.name,
                 credits: sub.credits
               }) AS subjects,
               collect(DISTINCT {
                 id: s.id,
                 name: s.name,
                 className: c.name,
                 subject: sub.name
               }) AS students
        `,
        { teacherId }
      );

      if (result.records.length === 0) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }

      const record = result.records[0];
      const nativeSubjects = toNative(record.get("subjects")) || [];
      const nativeStudents = toNative(record.get("students")) || [];

      const teacher = {
        id: record.get("id"),
        name: record.get("name"),
        department: record.get("department"),
        email: record.get("email"),
        subjects: nativeSubjects.filter((s: any) => s && s.code !== null),
        students: nativeStudents.filter((s: any) => s && s.id !== null),
      };

      return NextResponse.json(toNative(teacher));
    }

    const result = await session.run(`
      MATCH (t:Teacher)
      OPTIONAL MATCH (t)-[:TEACHES]->(sub:Subject)
      OPTIONAL MATCH (s:Student)-[:TAKES]->(sub)
      RETURN t.id AS id,
             t.name AS name,
             t.department AS department,
             t.email AS email,
             collect(DISTINCT sub.name) AS subjects,
             count(DISTINCT s) AS studentCount
      ORDER BY t.id ASC
    `);

    const teachers = result.records.map((r) => ({
      id: r.get("id"),
      name: r.get("name"),
      department: r.get("department"),
      email: r.get("email"),
      subjects: toNative(r.get("subjects")),
      studentCount: toNative(r.get("studentCount")),
    }));

    return NextResponse.json(toNative(teachers));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch teachers" },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

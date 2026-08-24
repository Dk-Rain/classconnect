import { NextResponse } from "next/server";
import { getNeo4jDriver } from "@/lib/neo4j";

export async function POST() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // 1. Clear existing school data to ensure idempotent seeding
    await session.run(`
      MATCH (n)
      WHERE n:Student OR n:Teacher OR n:Class OR n:Subject
      DETACH DELETE n
    `);

    // 2. Create Classes
    await session.run(`
      CREATE (ss1a:Class { name: 'SS1A', level: 'Senior Secondary 1', room: 'Room 101', capacity: 35 }),
             (ss1b:Class { name: 'SS1B', level: 'Senior Secondary 1', room: 'Room 102', capacity: 35 }),
             (ss2a:Class { name: 'SS2A', level: 'Senior Secondary 2', room: 'Room 201', capacity: 30 })
    `);

    // 3. Create Subjects
    await session.run(`
      CREATE (mth:Subject { code: 'MTH101', name: 'Mathematics', credits: 4, category: 'Sciences' }),
             (phy:Subject { code: 'PHY101', name: 'Physics', credits: 3, category: 'Sciences' }),
             (eng:Subject { code: 'ENG101', name: 'English Language', credits: 4, category: 'Humanities' }),
             (chm:Subject { code: 'CHM101', name: 'Chemistry', credits: 3, category: 'Sciences' }),
             (bio:Subject { code: 'BIO101', name: 'Biology', credits: 3, category: 'Sciences' }),
             (lit:Subject { code: 'LIT101', name: 'Literature in English', credits: 3, category: 'Humanities' })
    `);

    // 4. Create Teachers
    await session.run(`
      CREATE (t1:Teacher { id: 'T001', name: 'Mr. James Adebayo', email: 'james.adebayo@school.edu', department: 'Mathematics & Physics' }),
             (t2:Teacher { id: 'T002', name: 'Mrs. Sarah Adewale', email: 'sarah.adewale@school.edu', department: 'English & Literature' }),
             (t3:Teacher { id: 'T003', name: 'Dr. Emeka Okonkwo', email: 'emeka.okonkwo@school.edu', department: 'Biological Sciences' }),
             (t4:Teacher { id: 'T004', name: 'Ms. Fatima Bello', email: 'fatima.bello@school.edu', department: 'Chemical Sciences' })
    `);

    // 5. Create Students
    await session.run(`
      CREATE (s1:Student { id: 'ST001', name: 'John Doe', age: 16, gender: 'Male', email: 'john.doe@student.edu' }),
             (s2:Student { id: 'ST002', name: 'Jane Smith', age: 15, gender: 'Female', email: 'jane.smith@student.edu' }),
             (s3:Student { id: 'ST003', name: 'Alex Johnson', age: 16, gender: 'Non-binary', email: 'alex.j@student.edu' }),
             (s4:Student { id: 'ST004', name: 'Emily Davis', age: 17, gender: 'Female', email: 'emily.d@student.edu' }),
             (s5:Student { id: 'ST005', name: 'Michael Brown', age: 15, gender: 'Male', email: 'michael.b@student.edu' }),
             (s6:Student { id: 'ST006', name: 'Amina Yusuf', age: 16, gender: 'Female', email: 'amina.y@student.edu' })
    `);

    // 6. Create Relationships: Teachers TEACHES Subjects
    await session.run(`
      MATCH (t1:Teacher { id: 'T001' }), (mth:Subject { code: 'MTH101' }), (phy:Subject { code: 'PHY101' })
      CREATE (t1)-[:TEACHES]->(mth),
             (t1)-[:TEACHES]->(phy)
    `);

    await session.run(`
      MATCH (t2:Teacher { id: 'T002' }), (eng:Subject { code: 'ENG101' }), (lit:Subject { code: 'LIT101' })
      CREATE (t2)-[:TEACHES]->(eng),
             (t2)-[:TEACHES]->(lit)
    `);

    await session.run(`
      MATCH (t3:Teacher { id: 'T003' }), (bio:Subject { code: 'BIO101' })
      CREATE (t3)-[:TEACHES]->(bio)
    `);

    await session.run(`
      MATCH (t4:Teacher { id: 'T004' }), (chm:Subject { code: 'CHM101' })
      CREATE (t4)-[:TEACHES]->(chm)
    `);

    // 7. Create Relationships: Subjects OFFERED_IN Classes
    await session.run(`
      MATCH (c1:Class { name: 'SS1A' }), (c2:Class { name: 'SS1B' }), (c3:Class { name: 'SS2A' }),
            (mth:Subject { code: 'MTH101' }), (phy:Subject { code: 'PHY101' }), (eng:Subject { code: 'ENG101' }),
            (chm:Subject { code: 'CHM101' }), (bio:Subject { code: 'BIO101' }), (lit:Subject { code: 'LIT101' })
      CREATE (mth)-[:OFFERED_IN]->(c1), (mth)-[:OFFERED_IN]->(c2), (mth)-[:OFFERED_IN]->(c3),
             (eng)-[:OFFERED_IN]->(c1), (eng)-[:OFFERED_IN]->(c2), (eng)-[:OFFERED_IN]->(c3),
             (phy)-[:OFFERED_IN]->(c1), (phy)-[:OFFERED_IN]->(c3),
             (chm)-[:OFFERED_IN]->(c1), (chm)-[:OFFERED_IN]->(c3),
             (bio)-[:OFFERED_IN]->(c2), (bio)-[:OFFERED_IN]->(c3),
             (lit)-[:OFFERED_IN]->(c2)
    `);

    // 8. Create Relationships: Students ENROLLED_IN Classes
    await session.run(`
      MATCH (s1:Student { id: 'ST001' }), (s2:Student { id: 'ST002' }), (s3:Student { id: 'ST003' }),
            (s4:Student { id: 'ST004' }), (s5:Student { id: 'ST005' }), (s6:Student { id: 'ST006' }),
            (c1:Class { name: 'SS1A' }), (c2:Class { name: 'SS1B' }), (c3:Class { name: 'SS2A' })
      CREATE (s1)-[:ENROLLED_IN]->(c1),
             (s2)-[:ENROLLED_IN]->(c1),
             (s3)-[:ENROLLED_IN]->(c2),
             (s4)-[:ENROLLED_IN]->(c2),
             (s5)-[:ENROLLED_IN]->(c3),
             (s6)-[:ENROLLED_IN]->(c3)
    `);

    // 9. Create Relationships: Students TAKES Subjects
    await session.run(`
      MATCH (s1:Student { id: 'ST001' }), (mth:Subject { code: 'MTH101' }), (phy:Subject { code: 'PHY101' }), (eng:Subject { code: 'ENG101' }), (chm:Subject { code: 'CHM101' })
      CREATE (s1)-[:TAKES { grade: 'A', semester: 'Fall' }]->(mth),
             (s1)-[:TAKES { grade: 'B+', semester: 'Fall' }]->(phy),
             (s1)-[:TAKES { grade: 'A-', semester: 'Fall' }]->(eng),
             (s1)-[:TAKES { grade: 'B', semester: 'Fall' }]->(chm)
    `);

    await session.run(`
      MATCH (s2:Student { id: 'ST002' }), (mth:Subject { code: 'MTH101' }), (eng:Subject { code: 'ENG101' }), (chm:Subject { code: 'CHM101' })
      CREATE (s2)-[:TAKES { grade: 'A', semester: 'Fall' }]->(mth),
             (s2)-[:TAKES { grade: 'A', semester: 'Fall' }]->(eng),
             (s2)-[:TAKES { grade: 'A-', semester: 'Fall' }]->(chm)
    `);

    await session.run(`
      MATCH (s3:Student { id: 'ST003' }), (mth:Subject { code: 'MTH101' }), (eng:Subject { code: 'ENG101' }), (bio:Subject { code: 'BIO101' }), (lit:Subject { code: 'LIT101' })
      CREATE (s3)-[:TAKES { grade: 'B', semester: 'Fall' }]->(mth),
             (s3)-[:TAKES { grade: 'A', semester: 'Fall' }]->(eng),
             (s3)-[:TAKES { grade: 'B+', semester: 'Fall' }]->(bio),
             (s3)-[:TAKES { grade: 'A', semester: 'Fall' }]->(lit)
    `);

    await session.run(`
      MATCH (s4:Student { id: 'ST004' }), (eng:Subject { code: 'ENG101' }), (bio:Subject { code: 'BIO101' }), (lit:Subject { code: 'LIT101' })
      CREATE (s4)-[:TAKES { grade: 'A', semester: 'Fall' }]->(eng),
             (s4)-[:TAKES { grade: 'A-', semester: 'Fall' }]->(bio),
             (s4)-[:TAKES { grade: 'A+', semester: 'Fall' }]->(lit)
    `);

    await session.run(`
      MATCH (s5:Student { id: 'ST005' }), (mth:Subject { code: 'MTH101' }), (phy:Subject { code: 'PHY101' }), (chm:Subject { code: 'CHM101' })
      CREATE (s5)-[:TAKES { grade: 'A+', semester: 'Fall' }]->(mth),
             (s5)-[:TAKES { grade: 'A', semester: 'Fall' }]->(phy),
             (s5)-[:TAKES { grade: 'A', semester: 'Fall' }]->(chm)
    `);

    await session.run(`
      MATCH (s6:Student { id: 'ST006' }), (mth:Subject { code: 'MTH101' }), (eng:Subject { code: 'ENG101' }), (bio:Subject { code: 'BIO101' }), (phy:Subject { code: 'PHY101' })
      CREATE (s6)-[:TAKES { grade: 'B+', semester: 'Fall' }]->(mth),
             (s6)-[:TAKES { grade: 'A', semester: 'Fall' }]->(eng),
             (s6)-[:TAKES { grade: 'A', semester: 'Fall' }]->(bio),
             (s6)-[:TAKES { grade: 'B', semester: 'Fall' }]->(phy)
    `);

    // Get count summary
    const summary = await session.run(`
      MATCH (s:Student) WITH count(s) AS studentCount
      MATCH (t:Teacher) WITH studentCount, count(t) AS teacherCount
      MATCH (c:Class) WITH studentCount, teacherCount, count(c) AS classCount
      MATCH (sub:Subject) WITH studentCount, teacherCount, classCount, count(sub) AS subjectCount
      MATCH ()-[r]->() WITH studentCount, teacherCount, classCount, subjectCount, count(r) AS relCount
      RETURN studentCount, teacherCount, classCount, subjectCount, relCount
    `);

    const stats = summary.records[0] ? summary.records[0].toObject() : {};

    return NextResponse.json({
      success: true,
      message: "School graph database seeded successfully!",
      stats: {
        students: Number(stats.studentCount || 0),
        teachers: Number(stats.teacherCount || 0),
        classes: Number(stats.classCount || 0),
        subjects: Number(stats.subjectCount || 0),
        relationships: Number(stats.relCount || 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to seed database",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

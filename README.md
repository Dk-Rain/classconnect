# 🎓 ClassConnect – School Data Explorer

**ClassConnect** is a modern School Relationship Intelligence web application powered by **Next.js** and **CognoDB / Neo4j** graph database. It explores the natural interconnected relationships between students, classes, subjects, and teachers using multi-hop **Cypher** queries.

---

## 🌟 Key Features

- **Multi-Hop Traversal Explorer**: Select any student to visually trace and inspect complex multi-hop graph pathways: `Student ➔ [TAKES] ➔ Subject ➔ [TAUGHT_BY] ➔ Teacher` and `Student ➔ [ENROLLED_IN] ➔ Class`.
- **Interactive Cypher Console**: Test, write, and execute Cypher queries in real-time with latency profiling and clean tabular output.
- **Teacher & Outreach Intelligence**: Measure teacher impact and student reach across subject departments.
- **Class Rosters & Capacities**: Track class enrollments and course allocations.
- **One-Click Graph Seeding**: Populate or reset graph nodes and typed relationships with sample academic records in seconds.
- **Clean, Modern UI**: Designed with a high-contrast theme, responsive layout, and interactive node badges.

---

## 📊 Graph Data Model

The application models a high school academic ecosystem:

```text
                    ┌────────────────────────┐
                    │      (:Teacher)        │
                    │ id, name, dept, email  │
                    └───────────┬────────────┘
                                │
                             TEACHES
                                │
                                ▼
┌────────────────────────┐      ┌────────────────────────┐
│      (:Student)        │─────▶│      (:Subject)        │
│ id, name, age, gender  │ TAKES│ code, name, credits    │
└───────────┬────────────┘      └───────────┬────────────┘
            │                               │
       ENROLLED_IN                      OFFERED_IN
            │                               │
            ▼                               ▼
         ┌─────────────────────────────────────┐
         │               (:Class)              │
         │     name, level, room, capacity     │
         └─────────────────────────────────────┘
```

### 🏷️ Node Labels & Properties
| Label | Description | Example Properties |
| :--- | :--- | :--- |
| `:Student` | Registered student entity | `id: 'ST001'`, `name: 'John Doe'`, `age: 16`, `gender: 'Male'` |
| `:Teacher` | Faculty member | `id: 'T001'`, `name: 'Mr. James Adebayo'`, `department: 'Mathematics'` |
| `:Class` | Academic grade & homeroom | `name: 'SS1A'`, `level: 'Senior Secondary 1'`, `capacity: 35` |
| `:Subject` | Course offered by school | `code: 'MTH101'`, `name: 'Mathematics'`, `credits: 4` |

### 🔗 Relationship Types
| Relationship | Flow | Description & Properties |
| :--- | :--- | :--- |
| `[:ENROLLED_IN]` | `(Student) ➔ (Class)` | Designates the student's assigned homeroom class |
| `[:TAKES]` | `(Student) ➔ (Subject)` | Course enrollment with `{ grade: 'A', semester: 'Fall' }` |
| `[:TEACHES]` | `(Teacher) ➔ (Subject)` | Teacher subject instruction assignment |
| `[:OFFERED_IN]` | `(Subject) ➔ (Class)` | Subjects available in a particular class curriculum |

---

## ⚡ Multi-Hop Cypher Traversal Queries

### 1. Student ➔ Subject ➔ Teacher
Find all teachers connected to a specific student through the courses they take:
```cypher
MATCH (s:Student { id: 'ST001' })-[takes:TAKES]->(sub:Subject)<-[:TEACHES]-(t:Teacher)
RETURN s.name AS Student, sub.name AS Subject, takes.grade AS Grade, t.name AS Teacher, t.department AS Department
```

### 2. Peer Subject Overlap
Find students enrolled in the same class taking the same subject:
```cypher
MATCH (s1:Student)-[:ENROLLED_IN]->(c:Class)<-[:ENROLLED_IN]-(s2:Student)
MATCH (s1)-[:TAKES]->(sub:Subject)<-[:TAKES]-(s2)
WHERE s1.id < s2.id
RETURN c.name AS Class, sub.name AS SharedSubject, s1.name AS Student1, s2.name AS Student2
```

### 3. Class Teacher Reach
Map teachers to classes through the subjects they teach:
```cypher
MATCH (t:Teacher)-[:TEACHES]->(sub:Subject)-[:OFFERED_IN]->(c:Class)
RETURN t.name AS Teacher, sub.name AS Subject, collect(c.name) AS OfferedInClasses
ORDER BY t.name ASC
```

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database Driver**: Official [neo4j-driver](https://www.npmjs.com/package/neo4j-driver) over Bolt protocol (`bolt+s://` / `neo4j+s://`)
- **Graph Database**: [CognoDB](https://cognodb.cloud) / Neo4j

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd classconnect
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
COGNODB_URI=bolt+s://your-instance-id.databases.cognodb.cloud
COGNODB_USERNAME=cognodb
COGNODB_PASSWORD=your_database_password
```

> **Note**: For local Neo4j instances, you can also use `bolt://localhost:7687` with your local credentials.

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Seed the Database
Click the **"Seed / Reset Graph"** button in the top navigation bar to automatically populate the graph database with sample students, teachers, classes, and relationships.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/db/health` | Verifies database connectivity and server information |
| `POST` | `/api/db/seed` | Clears and reseeds sample school graph data and relationships |
| `GET` | `/api/students` | Returns all students or details for a student via `?id=ST001` |
| `GET` | `/api/teachers` | Returns teachers with subjects taught and student reach counts |
| `GET` | `/api/classes` | Returns class rosters and offered subjects |
| `POST` | `/api/query` | Executes arbitrary Cypher queries dynamically |

---

## 📜 License
MIT License

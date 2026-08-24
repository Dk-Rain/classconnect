"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap,
  Users,
  BookOpen,
  School,
  Terminal,
  Play,
  RefreshCw,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Search,
} from "lucide-react";

interface DBStatus {
  success: boolean;
  message: string;
  serverInfo?: { address: string; version?: string };
}

interface StudentSummary {
  id: string;
  name: string;
  age: number | any;
  gender: string;
  email: string;
  className: string;
  subjectCount: number | any;
  teacherCount: number | any;
}

interface StudentDetail {
  id: string;
  name: string;
  age: number | any;
  gender: string;
  email: string;
  class: { name: string; level: string; room: string } | null;
  courses: Array<{
    subjectCode: string;
    subjectName: string;
    credits: number | any;
    category: string;
    grade?: string;
    semester?: string;
    teacherName?: string;
    teacherId?: string;
    teacherDept?: string;
  }>;
}

interface TeacherSummary {
  id: string;
  name: string;
  department: string;
  email: string;
  subjects: string[];
  studentCount: number | any;
}

interface ClassSummary {
  name: string;
  level: string;
  room: string;
  capacity: number | any;
  studentCount: number | any;
  subjectCount: number | any;
}

function safeValue(val: any): string | number {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && "low" in val && "high" in val) return Number(val.low);
  if (typeof val === "object") return JSON.stringify(val);
  return val;
}

export default function ClassConnectApp() {
  const [activeTab, setActiveTab] = useState<"students" | "teachers" | "classes" | "cypher" | "model">("students");
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Data states
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Cypher Explorer state
  const [customQuery, setCustomQuery] = useState(
    `MATCH (s:Student)-[takes:TAKES]->(sub:Subject)<-[:TEACHES]-(t:Teacher)\nRETURN s.name AS Student, sub.name AS Subject, takes.grade AS Grade, t.name AS Teacher\nLIMIT 10`
  );
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const presetQueries = [
    {
      title: "Multi-Hop: Student ➔ Subject ➔ Teacher",
      description: "Find teachers connected to students through subjects they take",
      query: `MATCH (s:Student)-[takes:TAKES]->(sub:Subject)<-[:TEACHES]-(t:Teacher)\nRETURN s.name AS Student, sub.name AS Subject, takes.grade AS Grade, t.name AS Teacher, t.department AS Department\nORDER BY s.name ASC`,
    },
    {
      title: "Class Rosters & Enrolled Students",
      description: "List all classes with student members and count",
      query: `MATCH (c:Class)<-[:ENROLLED_IN]-(s:Student)\nRETURN c.name AS Class, c.level AS Level, collect(s.name) AS Students, count(s) AS StudentCount\nORDER BY c.name ASC`,
    },
    {
      title: "Teacher Subject & Class Outreach",
      description: "Map teachers to subjects and classes where those subjects are offered",
      query: `MATCH (t:Teacher)-[:TEACHES]->(sub:Subject)-[:OFFERED_IN]->(c:Class)\nRETURN t.name AS Teacher, sub.name AS Subject, collect(c.name) AS OfferedInClasses\nORDER BY t.name ASC`,
    },
    {
      title: "Peer Subject Overlap",
      description: "Find students enrolled in the same class taking the same subject",
      query: `MATCH (s1:Student)-[:ENROLLED_IN]->(c:Class)<-[:ENROLLED_IN]-(s2:Student)\nMATCH (s1)-[:TAKES]->(sub:Subject)<-[:TAKES]-(s2)\nWHERE s1.id < s2.id\nRETURN c.name AS Class, sub.name AS SharedSubject, s1.name AS Student1, s2.name AS Student2`,
    },
  ];

  // Fetch DB Health
  const checkHealth = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/db/health");
      const data = await res.json();
      setDbStatus(data);
    } catch {
      setDbStatus({ success: false, message: "Could not reach local server." });
    } finally {
      setLoadingStatus(false);
    }
  };

  // Seed Database
  const handleSeed = async () => {
    try {
      setSeeding(true);
      setSeedMessage(null);
      const res = await fetch("/api/db/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedMessage(`Graph database initialized: ${data.stats.students} Students, ${data.stats.teachers} Teachers, ${data.stats.classes} Classes, ${data.stats.subjects} Subjects (${data.stats.relationships} Relationships).`);
        await loadAllData();
      } else {
        setSeedMessage(`Seed error: ${data.message || data.error}`);
      }
    } catch (err: any) {
      setSeedMessage(`Seed failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  // Load all data
  const loadAllData = async () => {
    try {
      const [resStudents, resTeachers, resClasses] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/teachers"),
        fetch("/api/classes"),
      ]);

      if (resStudents.ok) {
        const studentData = await resStudents.json();
        setStudents(studentData);
        if (studentData.length > 0 && !selectedStudent) {
          loadStudentDetail(studentData[0].id);
        }
      }
      if (resTeachers.ok) setTeachers(await resTeachers.json());
      if (resClasses.ok) setClasses(await resClasses.json());
    } catch (e) {
      console.error("Failed to load initial data", e);
    }
  };

  const loadStudentDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/students?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStudent(data);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const executeCypher = async (queryToRun?: string) => {
    const q = queryToRun || customQuery;
    try {
      setQueryLoading(true);
      setQueryError(null);
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (data.success) {
        setQueryResult(data);
      } else {
        setQueryError(data.error || "Query failed");
        setQueryResult(null);
      }
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setQueryLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    loadAllData();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  ClassConnect
                </h1>
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Graph Explorer
                </span>
              </div>
              <p className="text-xs text-slate-500">School Relationship Intelligence Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* DB Status Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                dbStatus?.success
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus?.success ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <Database className="w-3.5 h-3.5" />
              <span>
                {loadingStatus
                  ? "Checking CognoDB..."
                  : dbStatus?.success
                  ? "CognoDB Connected"
                  : "DB Disconnected"}
              </span>
            </div>

            {/* Seed / Re-populate DB Button */}
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
              <span>{seeding ? "Populating Graph..." : "Seed / Reset Graph"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Feedback Alert if Seeded */}
        {seedMessage && (
          <div className="p-4 rounded-xl bg-white border border-indigo-200 text-sm flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-indigo-900">Graph Seed Result: </span>
              <span className="text-slate-700">{seedMessage}</span>
            </div>
            <button
              onClick={() => setSeedMessage(null)}
              className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Database Connection Diagnostic Card if disconnected */}
        {!loadingStatus && !dbStatus?.success && (
          <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-red-900">Database Connection Required</h3>
              <p className="text-xs text-red-700 leading-relaxed">
                Could not connect to CognoDB / Neo4j. Please verify your credentials in{" "}
                <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-900 font-mono">
                  .env.local
                </code>
                : <span className="font-mono text-[11px]">{dbStatus?.message}</span>
              </p>
              <button
                onClick={checkHealth}
                className="mt-2 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-md transition cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Students</p>
              <p className="text-2xl font-bold text-slate-900">{safeValue(students.length || 0)}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total Teachers</p>
              <p className="text-2xl font-bold text-slate-900">{safeValue(teachers.length || 0)}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <School className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Active Classes</p>
              <p className="text-2xl font-bold text-slate-900">{safeValue(classes.length || 0)}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Graph Relations</p>
              <p className="text-2xl font-bold text-slate-900">4 Types</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "students"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Students & Traversal</span>
          </button>

          <button
            onClick={() => setActiveTab("teachers")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "teachers"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Teachers & Reach</span>
          </button>

          <button
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "classes"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <School className="w-4 h-4" />
            <span>Classes & Rosters</span>
          </button>

          <button
            onClick={() => setActiveTab("cypher")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "cypher"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Cypher Console</span>
          </button>

          <button
            onClick={() => setActiveTab("model")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "model"
                ? "bg-indigo-50 text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Graph Schema Model</span>
          </button>
        </div>

        {/* Tab 1: Students & Multi-Hop Traversal */}
        {activeTab === "students" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Student List Sidebar */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name, ID, or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No students found.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click &apos;Seed / Reset Graph&apos; above to populate sample records.
                    </p>
                  </div>
                ) : (
                  filteredStudents.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => loadStudentDetail(st.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedStudent?.id === st.id
                          ? "bg-indigo-50/70 border-indigo-300 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                            {st.id}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900">{st.name}</h4>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {st.className}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>Age: {safeValue(st.age)} • {st.gender}</span>
                        <span>{safeValue(st.subjectCount)} Subjects • {safeValue(st.teacherCount)} Teachers</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Student Multi-Hop Detail Pane */}
            <div className="lg:col-span-7">
              {loadingDetail ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Loading student graph relationships...</p>
                </div>
              ) : selectedStudent ? (
                <div className="space-y-4">
                  {/* Student Header Card */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-lg">
                            {selectedStudent.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900">{selectedStudent.name}</h3>
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {selectedStudent.id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{selectedStudent.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Class Relationship Badge */}
                      {selectedStudent.class && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                            ENROLLED_IN
                          </span>
                          <div className="mt-0.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-semibold text-xs">
                            {selectedStudent.class.name} ({selectedStudent.class.level})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-Hop Traversal Visualization */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-sm font-semibold text-slate-900">
                          Multi-Hop Graph Traversal: Student ➔ Subject ➔ Teacher
                        </h4>
                      </div>
                      <span className="text-xs text-slate-500">
                        {selectedStudent.courses.length} Connected Paths
                      </span>
                    </div>

                    {/* Path Chain Cards */}
                    <div className="space-y-3">
                      {selectedStudent.courses.map((course, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition-all space-y-3"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {/* Node 1: Student */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>{selectedStudent.name}</span>
                            </div>

                            {/* Edge 1: TAKES */}
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                              <ArrowRight className="w-3 h-3 text-indigo-600" />
                              <span className="px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                                TAKES {course.grade ? `(${course.grade})` : ""}
                              </span>
                              <ArrowRight className="w-3 h-3 text-indigo-600" />
                            </div>

                            {/* Node 2: Subject */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{course.subjectName}</span>
                              <span className="text-[10px] text-amber-700 font-semibold">({course.subjectCode})</span>
                            </div>

                            {/* Edge 2: TAUGHT_BY */}
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                              <ArrowRight className="w-3 h-3 text-purple-600" />
                              <span className="px-1.5 py-0.5 rounded bg-white text-purple-700 border border-purple-200 text-[10px] font-semibold">
                                TAUGHT_BY
                              </span>
                              <ArrowRight className="w-3 h-3 text-purple-600" />
                            </div>

                            {/* Node 3: Teacher */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-medium">
                              <Users className="w-3.5 h-3.5" />
                              <span>{course.teacherName || "Unassigned"}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/80">
                            <span>Credits: {safeValue(course.credits)} • Category: {course.category}</span>
                            <span>Dept: {course.teacherDept || "General"}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cypher Explanation Code Block */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Underlying Cypher Traversal Query
                      </div>
                      <pre className="text-indigo-300 overflow-x-auto">
{`MATCH (s:Student { id: '${selectedStudent.id}' })
OPTIONAL MATCH (s)-[takes:TAKES]->(sub:Subject)
OPTIONAL MATCH (t:Teacher)-[:TEACHES]->(sub)
RETURN s.name, sub.name, takes.grade, t.name`}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm text-slate-500">Select a student to view graph traversal.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Teachers & Reach */}
        {activeTab === "teachers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teachers.map((t) => (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition-all space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{t.name}</h3>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                        {t.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{t.department}</p>
                    <p className="text-xs text-slate-400">{t.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-indigo-600">{safeValue(t.studentCount)}</span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Students Taught</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-600">Subjects Taught (TEACHES):</span>
                  <div className="flex flex-wrap gap-1.5">
                    {t.subjects.map((sub, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-slate-100 text-xs text-slate-700 border border-slate-200"
                      >
                        {typeof sub === "object" ? JSON.stringify(sub) : String(sub)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Classes & Rosters */}
        {activeTab === "classes" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {classes.map((c) => (
              <div
                key={c.name}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xl">{c.name}</h3>
                    <p className="text-xs text-slate-600">{c.level}</p>
                    <p className="text-xs text-slate-400">Location: {c.room}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                    Cap: {safeValue(c.capacity)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Enrolled Students</p>
                    <p className="text-lg font-bold text-slate-900">{safeValue(c.studentCount)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Offered Subjects</p>
                    <p className="text-lg font-bold text-slate-900">{safeValue(c.subjectCount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Interactive Cypher Console */}
        {activeTab === "cypher" && (
          <div className="space-y-6">
            {/* Presets */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Preset Cypher Multi-Hop Queries
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presetQueries.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCustomQuery(preset.query);
                      executeCypher(preset.query);
                    }}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-left space-y-1 group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-700 group-hover:text-indigo-900">
                        {preset.title}
                      </span>
                      <Play className="w-3 h-3 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-slate-500">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Query Editor Box */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-slate-900">Cypher Query Editor</span>
                </div>
                <button
                  onClick={() => executeCypher()}
                  disabled={queryLoading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Play className={`w-3 h-3 ${queryLoading ? "animate-spin" : ""}`} />
                  <span>{queryLoading ? "Running..." : "Execute Cypher"}</span>
                </button>
              </div>

              <textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                rows={5}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter Cypher query..."
              />
            </div>

            {/* Query Error */}
            {queryError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-mono shadow-xs">
                {queryError}
              </div>
            )}

            {/* Results Table */}
            {queryResult && (
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Returned <strong>{safeValue(queryResult.count)}</strong> records in{" "}
                    <strong>{safeValue(queryResult.executionTimeMs)}ms</strong>
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        {queryResult.columns.map((col: string) => (
                          <th key={col} className="px-4 py-3 font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {queryResult.records.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80">
                          {queryResult.columns.map((col: string) => (
                            <td key={col} className="px-4 py-2.5 text-slate-700">
                              {typeof row[col] === "object"
                                ? JSON.stringify(row[col])
                                : String(row[col] ?? "null")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Graph Schema Model */}
        {activeTab === "model" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">ClassConnect Graph Data Model</h3>
              <p className="text-xs text-slate-500 mt-1">
                Formal node labels, properties, and relationship types established in CognoDB / Neo4j.
              </p>
            </div>

            {/* Visual Model Diagram */}
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto">
                <pre className="text-indigo-300">
{`                    ┌────────────────────────┐
                    │      (Teacher)         │
                    │ id, name, dept, email  │
                    └───────────┬────────────┘
                                │
                             TEACHES
                                │
                                ▼
┌────────────────────────┐      ┌────────────────────────┐
│      (Student)         │─────▶│      (Subject)         │
│ id, name, age, gender  │ TAKES│ code, name, credits    │
└───────────┬────────────┘      └───────────┬────────────┘
            │                               │
       ENROLLED_IN                      OFFERED_IN
            │                               │
            ▼                               ▼
         ┌─────────────────────────────────────┐
         │               (Class)               │
         │     name, level, room, capacity     │
         └─────────────────────────────────────┘`}
                </pre>
              </div>
            </div>

            {/* Labels & Relationships Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Node Labels & Schema</h4>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li><strong className="text-slate-900">:Student</strong> — <span className="font-mono text-indigo-700">{`{ id, name, age, gender, email }`}</span></li>
                  <li><strong className="text-slate-900">:Teacher</strong> — <span className="font-mono text-indigo-700">{`{ id, name, department, email }`}</span></li>
                  <li><strong className="text-slate-900">:Class</strong> — <span className="font-mono text-indigo-700">{`{ name, level, room, capacity }`}</span></li>
                  <li><strong className="text-slate-900">:Subject</strong> — <span className="font-mono text-indigo-700">{`{ code, name, credits, category }`}</span></li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Relationship Types</h4>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li><strong className="text-indigo-700 font-semibold">[:ENROLLED_IN]</strong> — Student ➔ Class</li>
                  <li><strong className="text-indigo-700 font-semibold">[:TAKES]</strong> — Student ➔ Subject <span className="font-mono text-slate-500">{`{ grade, semester }`}</span></li>
                  <li><strong className="text-indigo-700 font-semibold">[:TEACHES]</strong> — Teacher ➔ Subject</li>
                  <li><strong className="text-indigo-700 font-semibold">[:OFFERED_IN]</strong> — Subject ➔ Class</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

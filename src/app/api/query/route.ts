import { NextResponse } from "next/server";
import { getNeo4jDriver, toNative } from "@/lib/neo4j";

export async function POST(request: Request) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { query, params = {} } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await session.run(query, params);
    const executionTimeMs = Date.now() - startTime;

    const records = result.records.map((record) => {
      const obj: Record<string, any> = {};
      (record.keys as string[]).forEach((key) => {
        const val = record.get(key);
        obj[String(key)] = toNative(val);
      });
      return obj;
    });

    return NextResponse.json({
      success: true,
      columns: result.records.length > 0 ? (result.records[0].keys as string[]) : [],
      records,
      count: records.length,
      executionTimeMs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to execute Cypher query",
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

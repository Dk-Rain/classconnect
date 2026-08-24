import neo4j, { Driver, Session, isInt } from "neo4j-driver";

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri = process.env.COGNODB_URI || process.env.NEO4J_URI;
    const username = process.env.COGNODB_USERNAME || process.env.NEO4J_USERNAME || "cognodb";
    const password = process.env.COGNODB_PASSWORD || process.env.NEO4J_PASSWORD;

    if (!uri || !password) {
      throw new Error(
        "CognoDB / Neo4j environment variables are missing. Please set COGNODB_URI, COGNODB_USERNAME, and COGNODB_PASSWORD in .env.local"
      );
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  return driver;
}

/**
 * Recursively converts Neo4j data types (like Integer with {low, high}) to standard JS primitives/objects
 */
export function toNative(val: any): any {
  if (val === null || val === undefined) {
    return val;
  }

  if (isInt(val) || (typeof val === "object" && typeof val.low === "number" && typeof val.high === "number")) {
    return typeof val.toNumber === "function" ? val.toNumber() : val.low;
  }

  if (Array.isArray(val)) {
    return val.map(toNative);
  }

  if (typeof val === "object") {
    // If it's a Neo4j Node or Relationship
    if (val.properties) {
      return {
        ...toNative(val.properties),
        _labels: val.labels || undefined,
        _type: val.type || undefined,
      };
    }

    const res: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      res[key] = toNative(val[key]);
    }
    return res;
  }

  return val;
}

export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const driverInstance = getNeo4jDriver();
  const session: Session = driverInstance.session();

  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => toNative(record.toObject()) as T);
  } finally {
    await session.close();
  }
}

export async function verifyConnection(): Promise<{ success: boolean; message: string; serverInfo?: any }> {
  try {
    const driverInstance = getNeo4jDriver();
    const serverInfo = await driverInstance.getServerInfo();
    return {
      success: true,
      message: `Connected successfully to CognoDB / Neo4j server at ${serverInfo.address}`,
      serverInfo: toNative(serverInfo),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to connect to database.",
    };
  }
}

import { NextResponse } from "next/server";
import { verifyConnection } from "@/lib/neo4j";

export async function GET() {
  const status = await verifyConnection();
  if (status.success) {
    return NextResponse.json(status, { status: 200 });
  } else {
    return NextResponse.json(status, { status: 500 });
  }
}

import { NextResponse } from "next/server";

// External price API removed.
// All prices are set manually by admin in Firestore prices/live.
export async function GET() {
  return NextResponse.json({ message: "Prices are set by admin only." }, { status: 404 });
}

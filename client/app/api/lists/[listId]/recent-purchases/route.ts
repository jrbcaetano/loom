import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Receipt import has been removed. Use Family Settings to import Shopping List CSV files instead."
    },
    { status: 410 }
  );
}

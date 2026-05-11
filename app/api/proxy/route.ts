import { NextRequest, NextResponse } from "next/server";

const FIREBASE_TARGETS: Record<string, string> = {
  "identitytoolkit": "https://identitytoolkit.googleapis.com",
  "securetoken":     "https://securetoken.googleapis.com",
  "firestore":       "https://firestore.googleapis.com",
};

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target");
  const path   = searchParams.get("path");

  if (!target || !path || !FIREBASE_TARGETS[target]) {
    return NextResponse.json({ error: "Invalid proxy target" }, { status: 400 });
  }

  const body = await req.text();
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
  };
  if (req.headers.get("authorization")) {
    headers["Authorization"] = req.headers.get("authorization")!;
  }

  try {
    const upstream = await fetch(`${FIREBASE_TARGETS[target]}${path}`, {
      method: "POST",
      headers,
      body,
    });
    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target");
  const path   = searchParams.get("path");

  if (!target || !path || !FIREBASE_TARGETS[target]) {
    return NextResponse.json({ error: "Invalid proxy target" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  if (req.headers.get("authorization")) {
    headers["Authorization"] = req.headers.get("authorization")!;
  }

  try {
    const upstream = await fetch(`${FIREBASE_TARGETS[target]}${path}`, {
      method: "GET",
      headers,
    });
    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
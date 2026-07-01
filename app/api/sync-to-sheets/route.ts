import { NextResponse } from "next/server";
 
function formatTime(ts: any): string {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  return d.toLocaleString("en-PH");
}
 
export async function POST(req: Request) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "GOOGLE_SHEETS_WEBHOOK_URL not set" }, { status: 500 });
  }
 
  try {
    const { registrations } = await req.json();
 
    const rows = (registrations as any[]).map((r) => [
      r.id?.slice(0, 8)?.toUpperCase() ?? "",
      r.fullName ?? "",
      r.idNumber ?? "",
      r.program ?? "",
      r.yearLevel ?? "",
      r.studentType ?? "",
      r.block ?? "",
      r.status ?? "",
      r.professors?.map((p: any) => `${p.professor} (${p.subject} · ${p.block})`).join("; ") ?? "",
      formatTime(r.createdAt),
      formatTime(r.checkedInAt),
    ]);
 
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
 
    if (!res.ok) throw new Error(`Sheets webhook returned ${res.status}`);
    return NextResponse.json({ success: true, synced: rows.length });
  } catch (err: any) {
    console.error("[sync-to-sheets]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
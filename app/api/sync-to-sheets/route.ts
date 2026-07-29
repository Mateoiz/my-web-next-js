import { NextResponse } from "next/server";

function formatTime(ts: any): string {
  if (!ts) return "";
  const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH");
}

export async function POST(req: Request) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "GOOGLE_SHEETS_WEBHOOK_URL not set" }, { status: 500 });
  }

  try {
    const { registrations } = await req.json();

    if (!Array.isArray(registrations) || registrations.length === 0) {
      return NextResponse.json({ error: "No registrations provided" }, { status: 400 });
    }

    const headers = [
      "Reference Code", "Full Name", "ID Number", "Program",
      "Year Level", "Student Type", "Block", "Status",
      "Registered At",
      "Aller-Genius In", "Aller-Genius Out",
      "PhotoBio In", "PhotoBio Out",
      "Emergency In", "Emergency Out",
      "Nutrition In", "Nutrition Out",
      "Professors"
    ];

    const rows = (registrations as any[]).map((r) => {
      const att = r.seminarAttendance || {};

      return [
        r.id?.slice(0, 8)?.toUpperCase() ?? "",
        r.fullName ?? "",
        r.idNumber ?? "",
        r.program ?? "",
        r.yearLevel ?? "",
        r.studentType ?? "",
        r.block ?? "",
        (r.status ?? "").toUpperCase(),
        formatTime(r.createdAt),

        // Aller-Genius
        formatTime(att["lao-c-aller-genius"]?.checkedInAt),
        formatTime(att["lao-c-aller-genius"]?.checkedOutAt),

        // Photobiomodulation
        formatTime(att["lao-k-photobiomodulation"]?.checkedInAt),
        formatTime(att["lao-k-photobiomodulation"]?.checkedOutAt),

        // Emergency
        formatTime(att["sy-emergency"]?.checkedInAt),
        formatTime(att["sy-emergency"]?.checkedOutAt),

        // Nutrition
        formatTime(att["austria-nutrition-surgery"]?.checkedInAt),
        formatTime(att["austria-nutrition-surgery"]?.checkedOutAt),

        r.professors?.map((p: any) => `${p.professor} (${p.subject} · ${p.block})`).join(" | ") ?? "",
      ];
    });

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers, rows }),
    });

    if (!res.ok) throw new Error(`Sheets webhook returned ${res.status}`);
    return NextResponse.json({ success: true, synced: rows.length });
  } catch (err: any) {
    console.error("[sync-to-sheets]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
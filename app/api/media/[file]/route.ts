import { NextResponse } from "next/server";
import { localReadUploadedImage } from "@/lib/local-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  const hit = await localReadUploadedImage(file);
  if (!hit) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(hit.data), {
    status: 200,
    headers: {
      "Content-Type": hit.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

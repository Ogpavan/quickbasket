import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.WORDPRESS_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return NextResponse.json({ error: "WORDPRESS_URL is not set." }, { status: 500 });
  }

  const url = new URL("/wp-json/store/v1/stores", baseUrl);
  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();

  if (!response.ok) {
    return new NextResponse(bodyText || "Upstream request failed.", {
      status: response.status,
      headers: { "content-type": contentType || "text/plain" }
    });
  }

  if (contentType.includes("application/json")) {
    try {
      return NextResponse.json(JSON.parse(bodyText), { status: 200 });
    } catch {
      return new NextResponse(bodyText, {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  }

  return new NextResponse(bodyText, {
    status: 200,
    headers: { "content-type": contentType || "text/plain" }
  });
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat or lng." }, { status: 400 });
  }

  const baseUrl = process.env.WORDPRESS_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return NextResponse.json({ error: "WORDPRESS_URL is not set." }, { status: 500 });
  }

  const url = new URL("/wp-json/store/v1/nearest", baseUrl);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lng", lng);

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

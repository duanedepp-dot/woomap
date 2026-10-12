const CACHE_TTL_SECONDS = 60 * 60 * 24;
const CACHE_PREFIX = "geocode:v1:";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  const query = (url.searchParams.get("q") || "").trim().replace(/\\s+/g, " ");
  if (query.length < 2 || query.length > 200) {
    return Response.json({ error: "Enter an address between 2 and 200 characters." }, { status: 400 });
  }

  const cacheKey = CACHE_PREFIX + query.toLocaleLowerCase();
  try {
    const cached = await env.TERRALIVE_CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-TerraLive-Cache": "HIT",
        },
      });
    }
  } catch (error) {
    console.error("TerraLive KV read failed:", error);
  }

  const upstream = new URL("https://nominatim.openstreetmap.org/search");
  upstream.searchParams.set("q", query);
  upstream.searchParams.set("format", "jsonv2");
  upstream.searchParams.set("limit", "5");

  try {
    const response = await fetch(upstream, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TerraLive/1.0 (address search; https://terralive.pages.dev)",
      },
    });
    if (!response.ok) {
      return Response.json({ error: "Address search is temporarily unavailable." }, { status: 502 });
    }

    const results = await response.json();
    const body = JSON.stringify(results);
    try {
      await env.TERRALIVE_CACHE.put(cacheKey, body, { expirationTtl: CACHE_TTL_SECONDS });
    } catch (error) {
      console.error("TerraLive KV write failed:", error);
    }

    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-TerraLive-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("TerraLive geocoding failed:", error);
    return Response.json({ error: "Could not search addresses right now." }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUBLIC: geocode an address. US addresses use the authoritative, free US Census
// Geocoder; everything else uses OpenStreetMap Nominatim. No API key needed.
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const address = String(body.address || "").trim().slice(0, 300);
  const country = String(body.country || "").trim();
  if (!address) return Response.json({ error: "Enter an address." }, { status: 400 });

  const isUS = /^(us|usa|u\.s\.|united states)$/i.test(country);

  // US Census Geocoder only when the address is explicitly US (most collection
  // is international, so default to the global geocoder below).
  if (isUS) {
    try {
      const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const d: any = await r.json();
      const m = d?.result?.addressMatches?.[0];
      if (m) {
        const comp = m.addressComponents || {};
        return Response.json({ lat: m.coordinates.y, lng: m.coordinates.x, admin1: comp.state || "", locality: comp.city || "", country: "US", source: "census", matched: m.matchedAddress || address });
      }
    } catch { /* fall through */ }
  }

  // Nominatim for everything else (and US fallback).
  try {
    const q = country ? `${address}, ${country}` : address;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`;
    const r = await fetch(url, { headers: { "User-Agent": "Superadditive-BusinessCensus/1.0 (research)" }, signal: AbortSignal.timeout(8000) });
    const d: any = await r.json();
    const m = Array.isArray(d) ? d[0] : null;
    if (m) {
      const a = m.address || {};
      return Response.json({
        lat: Number(m.lat), lng: Number(m.lon),
        admin1: a.state || a.region || a.province || "",
        locality: a.city || a.town || a.village || a.municipality || "",
        country: (a.country_code || "").toUpperCase(),
        source: "nominatim", matched: m.display_name || address,
      });
    }
  } catch { /* fall through */ }

  return Response.json({ error: "Couldn't locate that address. You can still continue.", lat: null, lng: null }, { status: 200 });
}

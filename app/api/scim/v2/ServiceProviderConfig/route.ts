import { orgFromBearer, scimError } from "@/lib/scim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SCIM discovery: tells the IdP which features we support. Okta/Entra fetch this
// during connector setup. Bearer-authenticated like the rest of the SCIM surface.
export async function GET(request: Request) {
  const org = await orgFromBearer(request);
  if (!org) return scimError(401, "Invalid or missing SCIM bearer token.");
  const base = new URL(request.url).origin;
  return Response.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: `${base}/docs/scim`,
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [{ type: "oauthbearertoken", name: "OAuth Bearer Token", description: "Authentication via the org's SCIM bearer token.", primary: true }],
    meta: { resourceType: "ServiceProviderConfig", location: `${base}/api/scim/v2/ServiceProviderConfig` },
  }, { headers: { "Content-Type": "application/scim+json" } });
}

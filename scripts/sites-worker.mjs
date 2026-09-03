const WHATSAPP_USER_AGENT = /whatsapp/i;
const SOCIAL_LOGO_URL = "https://whenintelligenceisfree.com/assets/social-logo.png";
const SOCIAL_LOGO_ALT = "When Intelligence Is Free lighthouse logo";

function replaceMetaContent(html, attribute, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(<meta\\s+${attribute}="${escapedName}"\\s+content=")[^"]*("\\s*>)`, "i");
  return html.replace(pattern, `$1${content}$2`);
}

function addVaryUserAgent(headers) {
  const vary = headers.get("Vary");
  if (!vary) headers.set("Vary", "User-Agent");
  else if (!vary.split(",").some((value) => value.trim().toLowerCase() === "user-agent")) {
    headers.set("Vary", `${vary}, User-Agent`);
  }
}

export function isWhatsAppPreviewRequest(request) {
  return WHATSAPP_USER_AGENT.test(request.headers.get("User-Agent") || "");
}

export function rewriteSocialPreviewForWhatsApp(html) {
  const replacements = [
    ["property", "og:image", SOCIAL_LOGO_URL],
    ["property", "og:image:secure_url", SOCIAL_LOGO_URL],
    ["property", "og:image:width", "1200"],
    ["property", "og:image:height", "630"],
    ["property", "og:image:alt", SOCIAL_LOGO_ALT],
    ["name", "twitter:image", SOCIAL_LOGO_URL],
    ["name", "twitter:image:alt", SOCIAL_LOGO_ALT]
  ];
  return replacements.reduce(
    (output, [attribute, name, content]) => replaceMetaContent(output, attribute, name, content),
    html
  );
}

export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response("Static asset binding unavailable.", { status: 500 });
    }
    const response = await env.ASSETS.fetch(request);
    if (!response.headers.get("Content-Type")?.toLowerCase().includes("text/html")) return response;

    const headers = new Headers(response.headers);
    addVaryUserAgent(headers);
    if (!isWhatsAppPreviewRequest(request) || !response.ok || request.method === "HEAD") {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    const html = rewriteSocialPreviewForWhatsApp(await response.text());
    headers.delete("Content-Length");
    headers.delete("ETag");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};

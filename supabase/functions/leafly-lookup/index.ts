import { corsHeaders } from "../_shared/cors.ts"

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { strainName } = await req.json()

    if (!strainName?.trim()) {
      return json({ error: "strainName is required" }, 400)
    }

    const slug = slugify(strainName.trim())
    const url = `https://www.leafly.com/strains/${slug}`

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (res.status === 404) {
      return json({ error: "Strain not found on Leafly" }, 404)
    }
    if (!res.ok) {
      return json({ error: "Leafly request failed" }, 502)
    }

    const html = await res.text()

    // ── Try structured __NEXT_DATA__ first ──────────────────────────────
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
    )

    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        // Leafly stores strain data under several possible paths
        const strain =
          nextData?.props?.pageProps?.strain ??
          nextData?.props?.pageProps?.strainData?.strain

        if (strain) {
          return json({
            name: strain.name ?? strainName,
            strain_type: normalizeType(strain.category),
            thc: strain.thcPercent?.value ?? strain.thcPercent ?? null,
            cbd: strain.cbdPercent?.value ?? strain.cbdPercent ?? null,
            effects: pickNames(strain.feelings ?? strain.topEffects).slice(0, 5),
            flavors: pickNames(strain.flavors ?? strain.topFlavors).slice(0, 5),
            image_url: strain.imageUrl ?? strain.nugImage ?? null,
            leafly_url: url,
          })
        }
      } catch {
        // fall through to HTML regex parsing
      }
    }

    // ── Fallback: regex parse the rendered HTML ──────────────────────────
    // Strain type from category breadcrumb/link
    const categoryMatch = html.match(
      /strains\/lists\/category\/(hybrid|indica|sativa)/i,
    )

    // THC / CBD from stat chips (e.g. "THC 21%" or ">THC</span>21%")
    const thcMatch = html.match(/THC[^0-9]*(\d+(?:\.\d+)?)\s*%/i)
    const cbdMatch = html.match(/CBD[^0-9]*(\d+(?:\.\d+)?)\s*%/i)

    // Effects: anchor links under /effect/
    const effectLinks = [
      ...html.matchAll(/href="[^"]*\/(?:effect)\/([a-z0-9-]+)"/gi),
    ]
    const effects = [...new Set(effectLinks.map((m) => titleCase(m[1].replace(/-/g, " "))))].slice(0, 5)

    // Flavors: anchor links under /flavor/
    const flavorLinks = [
      ...html.matchAll(/href="[^"]*\/(?:flavor)\/([a-z0-9-]+)"/gi),
    ]
    const flavors = [...new Set(flavorLinks.map((m) => titleCase(m[1].replace(/-/g, " "))))].slice(0, 5)

    // Image: Leafly CDN flower images
    const imageMatch = html.match(
      /https:\/\/images\.leafly\.com\/flower-images\/[^"'\s)>]+/,
    )

    return json({
      name: strainName,
      strain_type: normalizeType(categoryMatch?.[1]),
      thc: thcMatch ? parseFloat(thcMatch[1]) : null,
      cbd: cbdMatch ? parseFloat(cbdMatch[1]) : null,
      effects,
      flavors,
      image_url: imageMatch ? imageMatch[0].split("?")[0] : null,
      leafly_url: url,
    })
  } catch (err) {
    console.error("leafly-lookup error:", err)
    return json({ error: "Failed to fetch strain data" }, 500)
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalizeType(
  category: string | undefined | null,
): "indica" | "sativa" | "hybrid" {
  const c = (category ?? "").toLowerCase()
  if (c.includes("indica")) return "indica"
  if (c.includes("sativa")) return "sativa"
  return "hybrid"
}

// Accepts arrays of { name: string } objects or plain strings
function pickNames(arr: unknown[]): string[] {
  if (!Array.isArray(arr)) return []
  return arr.map((item) => {
    if (typeof item === "string") return titleCase(item)
    if (typeof item === "object" && item !== null && "name" in item) {
      return titleCase(String((item as { name: unknown }).name))
    }
    return ""
  }).filter(Boolean)
}

function titleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

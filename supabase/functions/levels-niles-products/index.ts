import { corsHeaders } from "../_shared/cors.ts"

type SourceProduct = {
  name: string
  strain_type: "indica" | "sativa" | "hybrid"
  thc: number | null
  cbd: number | null
  image_url: string | null
  source_url: string | null
  description: string | null
}

const LEVELS_NILES_URLS = [
  "https://shop.levelscannabis.com/stores/levels-cannabis-niles/menu",
  "https://www.levelscannabis.com/stores/niles-mi/menu",
  "https://www.levelscannabis.com/locations/niles",
]

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({})) as {
      query?: string
      limit?: number
    }

    const query = (body.query ?? "").trim().toLowerCase()
    const limit = Math.min(Math.max(body.limit ?? 20, 1), 50)

    const products = await fetchLevelsProducts()
    const filtered = query
      ? products.filter((p) => p.name.toLowerCase().includes(query))
      : products

    const ranked = filtered.sort((a, b) => {
      if (!query) return a.name.localeCompare(b.name)
      return scoreMatch(b.name, query) - scoreMatch(a.name, query)
    })

    return json({
      products: ranked.slice(0, limit),
      total: ranked.length,
      query,
    })
  } catch (error) {
    console.error("levels-niles-products error:", error)
    return json({ error: "Failed to load Levels Niles products" }, 500)
  }
})

async function fetchLevelsProducts(): Promise<SourceProduct[]> {
  for (const url of LEVELS_NILES_URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      })
      if (!res.ok) continue

      const html = await res.text()
      const fromLdJson = parseJsonLdProducts(html)
      const fromPageData = parseEmbeddedPageData(html)
      const merged = dedupeByName([...fromLdJson, ...fromPageData])

      if (merged.length > 0) {
        return merged.map((item) => ({
          ...item,
          source_url: item.source_url ?? url,
        }))
      }
    } catch {
      // Try the next candidate URL.
    }
  }

  return []
}

function parseJsonLdProducts(html: string): SourceProduct[] {
  const products: SourceProduct[] = []
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const match of scripts) {
    const payload = match[1]?.trim()
    if (!payload) continue

    try {
      const parsed = JSON.parse(payload)
      const nodes = flattenNodes(parsed)

      for (const node of nodes) {
        const maybe = toSourceProduct(node)
        if (maybe) products.push(maybe)
      }
    } catch {
      // Ignore invalid JSON chunks.
    }
  }

  return products
}

function parseEmbeddedPageData(html: string): SourceProduct[] {
  const out: SourceProduct[] = []

  const nextData = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  )
  if (nextData?.[1]) {
    try {
      const parsed = JSON.parse(nextData[1])
      const nodes = flattenNodes(parsed)
      for (const node of nodes) {
        const maybe = toSourceProduct(node)
        if (maybe) out.push(maybe)
      }
    } catch {
      // Ignore.
    }
  }

  return out
}

function toSourceProduct(node: Record<string, unknown>): SourceProduct | null {
  const name = stringValue(node.name)
  if (!name) return null

  const typeTag =
    [
      stringValue(node.category),
      stringValue(node.type),
      stringValue(node.product_type),
      stringValue(node.kind),
      stringValue(node.description),
      stringValue(node.subtitle),
    ]
      .filter(Boolean)
      .join(" ") || name

  const description = stringValue(node.description)
  const textBlob = [name, description, JSON.stringify(node)].filter(Boolean).join(" ")

  const image = normalizeImage(node.image)
  const sourceUrl =
    stringValue(node.url) ??
    stringValue((node as { product_url?: unknown }).product_url) ??
    null

  return {
    name: cleanName(name),
    strain_type: inferType(typeTag),
    thc: extractPercent(textBlob, "THC"),
    cbd: extractPercent(textBlob, "CBD"),
    image_url: image,
    source_url: sourceUrl,
    description: description ?? null,
  }
}

function flattenNodes(value: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const stack: unknown[] = [value]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item)
      continue
    }

    if (typeof current === "object") {
      const obj = current as Record<string, unknown>
      out.push(obj)
      for (const v of Object.values(obj)) stack.push(v)
    }
  }

  return out
}

function scoreMatch(name: string, query: string) {
  const lower = name.toLowerCase()
  if (lower === query) return 1000
  if (lower.startsWith(query)) return 500
  if (lower.includes(query)) return 100
  return 0
}

function dedupeByName(items: SourceProduct[]) {
  const byName = new Map<string, SourceProduct>()
  for (const item of items) {
    const key = item.name.toLowerCase().trim()
    if (!key) continue
    if (!byName.has(key)) {
      byName.set(key, item)
      continue
    }

    const existing = byName.get(key)!
    const existingScore = completeness(existing)
    const nextScore = completeness(item)
    if (nextScore > existingScore) byName.set(key, item)
  }
  return [...byName.values()]
}

function completeness(item: SourceProduct) {
  let score = 0
  if (item.image_url) score += 1
  if (item.thc != null) score += 1
  if (item.cbd != null) score += 1
  if (item.description) score += 1
  if (item.source_url) score += 1
  return score
}

function cleanName(name: string) {
  return name.replace(/\s+/g, " ").trim()
}

function inferType(value: string): "indica" | "sativa" | "hybrid" {
  const text = value.toLowerCase()
  if (text.includes("indica")) return "indica"
  if (text.includes("sativa")) return "sativa"
  return "hybrid"
}

function extractPercent(text: string, token: "THC" | "CBD") {
  const match = text.match(new RegExp(`${token}[^0-9]*(\\d+(?:\\.\\d+)?)\\s*%`, "i"))
  return match ? Number(match[1]) : null
}

function normalizeImage(value: unknown) {
  if (typeof value === "string") return value
  if (Array.isArray(value) && typeof value[0] === "string") return value[0]
  if (typeof value === "object" && value && "url" in value) {
    const url = (value as { url?: unknown }).url
    return typeof url === "string" ? url : null
  }
  return null
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

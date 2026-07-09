"use client"

import { useState } from "react"
import { Link2, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { SourceType, StrainType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const empty = {
  name: "",
  strain_type: "hybrid" as StrainType,
  thc: "",
  cbd: "",
  effects: "",
  flavors: "",
  notes: "",
  source_url: "",
  source_type: "other" as SourceType,
  image_url: "",
}

export function AddStrainDialog({
  activeFriendId,
  onAdded,
  trigger,
}: {
  activeFriendId: string | null
  onAdded: () => void
  trigger: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function lookupLeafly() {
    if (!form.name.trim()) return
    setLookingUp(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke("leafly-lookup", {
        body: { strainName: form.name.trim() },
      })
      if (error || !data || data.error) {
        toast.error(data?.error ?? "Couldn't find that strain on Leafly")
        return
      }
      setForm((f) => ({
        ...f,
        strain_type: data.strain_type ?? f.strain_type,
        thc: data.thc != null ? String(data.thc) : f.thc,
        cbd: data.cbd != null ? String(data.cbd) : f.cbd,
        effects: data.effects?.length ? data.effects.join(", ") : f.effects,
        flavors: data.flavors?.length ? data.flavors.join(", ") : f.flavors,
        image_url: data.image_url ?? f.image_url,
        source_url:
          f.source_url ||
          `https://www.leafly.com/strains/${slugify(form.name.trim())}`,
        source_type: f.source_type === "other" ? "leafly" : f.source_type,
      }))
      toast.success("Autofilled from Leafly!")
    } catch {
      toast.error("Couldn't look up that strain")
    } finally {
      setLookingUp(false)
    }
  }

  async function fetchPreview() {
    if (!form.source_url.trim()) return
    setFetching(true)
    try {
      const parsed = new URL(form.source_url.trim())
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        toast.error("Please use a valid http(s) link")
        return
      }

      const source = inferSource(parsed.hostname)
      const inferredName = inferNameFromUrl(parsed)

      setForm((f) => ({
        ...f,
        name: f.name || inferredName || f.name,
        source_type: source,
      }))
      toast.success("Link added. Source detected for this strain.")
    } catch {
      toast.error("Couldn't parse that link")
    } finally {
      setFetching(false)
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Give the strain a name")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("strains").insert({
      name: form.name.trim(),
      strain_type: form.strain_type,
      thc: form.thc ? Number(form.thc) : null,
      cbd: form.cbd ? Number(form.cbd) : null,
      effects: splitList(form.effects),
      flavors: splitList(form.flavors),
      notes: form.notes.trim() || null,
      source_url: form.source_url.trim() || null,
      source_type: form.source_type,
      image_url: form.image_url.trim() || null,
      added_by: activeFriendId,
    })
    setSaving(false)
    if (error) {
      toast.error("Couldn't save the strain")
      return
    }
    toast.success(`Added ${form.name.trim()}`)
    setForm(empty)
    setOpen(false)
    onAdded()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setForm(empty)
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Add a strain</DialogTitle>
          <DialogDescription>
            Paste a Leafly or Levels link to autofill, or enter the details
            yourself.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Link preview */}
          <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
            <Label htmlFor="source_url" className="text-xs font-medium">
              Leafly / Levels link (optional)
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="source_url"
                  className="pl-8"
                  placeholder="https://www.leafly.com/strains/..."
                  value={form.source_url}
                  onChange={(e) => set("source_url", e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={fetchPreview}
                disabled={fetching || !form.source_url.trim()}
              >
                {fetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Autofill</span>
              </Button>
            </div>
            {form.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.image_url || "/placeholder.svg"}
                alt="Strain preview"
                className="mt-1 h-28 w-full rounded-md object-cover"
                crossOrigin="anonymous"
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                className="flex-1"
                placeholder="Blue Dream"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={lookupLeafly}
                disabled={lookingUp || !form.name.trim()}
                title="Look up on Leafly"
              >
                {lookingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Leafly</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select
                value={form.strain_type}
                onValueChange={(v) =>
                  set("strain_type", (v as StrainType) ?? "hybrid")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indica">Indica</SelectItem>
                  <SelectItem value="sativa">Sativa</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="thc">THC %</Label>
              <Input
                id="thc"
                inputMode="decimal"
                placeholder="22"
                value={form.thc}
                onChange={(e) => set("thc", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cbd">CBD %</Label>
              <Input
                id="cbd"
                inputMode="decimal"
                placeholder="0.5"
                value={form.cbd}
                onChange={(e) => set("cbd", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="effects">Effects</Label>
            <Input
              id="effects"
              placeholder="Relaxed, Happy, Euphoric"
              value={form.effects}
              onChange={(e) => set("effects", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate with commas</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="flavors">Flavors</Label>
            <Input
              id="flavors"
              placeholder="Berry, Pine, Citrus"
              value={form.flavors}
              onChange={(e) => set("flavors", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate with commas</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Where you got it, how it hit, anything worth remembering..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Add strain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function splitList(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function inferSource(hostname: string): SourceType {
  const host = hostname.toLowerCase()
  if (host.includes("leafly")) return "leafly"
  if (host.includes("level")) return "levels"
  return "other"
}

function inferNameFromUrl(url: URL) {
  const segment = url.pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
  if (!segment) return ""

  const cleaned = decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b(strain|strains|products|product)\b/gi, "")
    .trim()

  return toTitleCase(cleaned)
}

function toTitleCase(value: string) {
  if (!value) return ""
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

"use client"

import { useMemo, useState } from "react"
import {
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Star,
  ExternalLink,
  Trash2,
  Leaf,
  PencilLine,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type {
  Friend,
  RatingStatus,
  StrainPersonalization,
  StrainType,
  StrainWithRatings,
} from "@/lib/types"
import { FRIEND_COLOR_STYLES, initials } from "@/lib/friend-colors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const TYPE_STYLES: Record<string, string> = {
  indica: "bg-violet-100 text-violet-800 border-violet-200",
  sativa: "bg-orange-100 text-orange-800 border-orange-200",
  hybrid: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

const STATUS_META: Record<
  RatingStatus,
  { label: string; icon: typeof ThumbsUp; className: string; active: string }
> = {
  liked: {
    label: "Like",
    icon: ThumbsUp,
    className: "text-emerald-700",
    active: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600",
  },
  disliked: {
    label: "Nope",
    icon: ThumbsDown,
    className: "text-rose-700",
    active: "bg-rose-600 text-white border-rose-600 hover:bg-rose-600",
  },
  want_to_try: {
    label: "Try",
    icon: Sparkles,
    className: "text-sky-700",
    active: "bg-sky-600 text-white border-sky-600 hover:bg-sky-600",
  },
}

export function StrainCard({
  strain,
  friends,
  activeFriendId,
  onChanged,
}: {
  strain: StrainWithRatings
  friends: Friend[]
  activeFriendId: string | null
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [personalSaving, setPersonalSaving] = useState(false)
  const [personalForm, setPersonalForm] = useState({
    personal_notes: "",
    strain_type_override: "",
    effects_override: "",
    flavors_override: "",
  })
  const friendById = new Map(friends.map((f) => [f.id, f]))
  const addedBy = strain.added_by ? friendById.get(strain.added_by) : undefined

  const myRating = strain.ratings.find((r) => r.friend_id === activeFriendId)
  const personalizations = strain.personalizations ?? []
  const myPersonalization = personalizations.find(
    (p) => p.friend_id === activeFriendId,
  )

  const display = useMemo(() => {
    const source = myPersonalization
    return {
      strain_type: source?.strain_type_override ?? strain.strain_type,
      effects: source?.effects_override ?? strain.effects,
      flavors: source?.flavors_override ?? strain.flavors,
      personal_notes: source?.personal_notes ?? null,
      shared_notes: strain.notes,
    }
  }, [myPersonalization, strain])

  const grouped: Record<RatingStatus, Friend[]> = {
    liked: [],
    disliked: [],
    want_to_try: [],
  }
  for (const r of strain.ratings) {
    const f = friendById.get(r.friend_id)
    if (f && r.status) grouped[r.status].push(f)
  }
  const favorites = strain.ratings
    .filter((r) => r.favorite)
    .map((r) => friendById.get(r.friend_id))
    .filter(Boolean) as Friend[]

  async function upsertRating(
    patch: { status?: RatingStatus | null; favorite?: boolean; score?: number | null },
  ) {
    if (!activeFriendId) {
      toast.error("Pick who you are first")
      return
    }
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from("strain_ratings").upsert(
      {
        strain_id: strain.id,
        friend_id: activeFriendId,
        status: patch.status !== undefined ? patch.status : (myRating?.status ?? null),
        favorite:
          patch.favorite !== undefined ? patch.favorite : (myRating?.favorite ?? false),
        score: patch.score !== undefined ? patch.score : (myRating?.score ?? null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "strain_id,friend_id" },
    )
    setBusy(false)
    if (error) {
      toast.error("Couldn't save your pick")
      return
    }
    onChanged()
  }

  async function toggleStatus(status: RatingStatus) {
    await upsertRating({ status: myRating?.status === status ? null : status })
  }

  async function deleteStrain() {
    const supabase = createClient()
    const { error } = await supabase.from("strains").delete().eq("id", strain.id)
    if (error) {
      toast.error("Couldn't delete")
      return
    }
    toast.success("Strain removed")
    onChanged()
  }

  function openPersonalEditor() {
    const p = myPersonalization
    setPersonalForm({
      personal_notes: p?.personal_notes ?? "",
      strain_type_override: p?.strain_type_override ?? "",
      effects_override: p?.effects_override?.join(", ") ?? "",
      flavors_override: p?.flavors_override?.join(", ") ?? "",
    })
    setEditOpen(true)
  }

  async function savePersonalization() {
    if (!activeFriendId) {
      toast.error("Pick who you are first")
      return
    }

    setPersonalSaving(true)
    const supabase = createClient()
    const payload: Partial<StrainPersonalization> = {
      strain_id: strain.id,
      friend_id: activeFriendId,
      personal_notes: emptyToNull(personalForm.personal_notes),
      strain_type_override: parseTypeOverride(personalForm.strain_type_override),
      effects_override: splitListOrNull(personalForm.effects_override),
      flavors_override: splitListOrNull(personalForm.flavors_override),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from("strain_personalizations")
      .upsert(payload, { onConflict: "strain_id,friend_id" })

    setPersonalSaving(false)
    if (error) {
      toast.error("Couldn't save your personal details")
      return
    }
    toast.success("Saved your personal strain details")
    setEditOpen(false)
    onChanged()
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {strain.image_url ? (
        <div className="relative h-36 w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={strain.image_url || "/placeholder.svg"}
            alt={strain.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            crossOrigin="anonymous"
          />
        </div>
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
          <Leaf className="h-10 w-10 text-emerald-300" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-semibold leading-tight">
              {strain.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("capitalize", TYPE_STYLES[display.strain_type])}
              >
                {display.strain_type}
              </Badge>
              {myRating?.score != null && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {myRating.score}/10
                </span>
              )}
            </div>
          </div>
          {favorites.length > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-amber-700">
                {favorites.length}
              </span>
            </div>
          )}
        </div>

        {(display.effects.length > 0 || display.flavors.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {display.effects.map((e) => (
              <span
                key={`e-${e}`}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
              >
                {e}
              </span>
            ))}
            {display.flavors.map((f) => (
              <span
                key={`f-${f}`}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {display.personal_notes && (
          <p className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2 text-sm leading-relaxed text-foreground">
            <span className="mr-1 font-medium">Your note:</span>
            {display.personal_notes}
          </p>
        )}

        {display.shared_notes && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {display.shared_notes}
          </p>
        )}

        {/* Who thinks what */}
        {(grouped.liked.length > 0 ||
          grouped.disliked.length > 0 ||
          grouped.want_to_try.length > 0) && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-2.5">
            {(Object.keys(grouped) as RatingStatus[])
              .filter((s) => grouped[s].length > 0)
              .map((s) => {
                const Meta = STATUS_META[s]
                return (
                  <div key={s} className="flex items-center gap-2">
                    <Meta.icon className={cn("h-3.5 w-3.5 shrink-0", Meta.className)} />
                    <div className="flex flex-wrap gap-1">
                      {grouped[s].map((f) => (
                        <FriendPill key={f.id} friend={f} />
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-1">
          {/* Active friend controls */}
          <div className="flex items-center gap-1.5">
            {(Object.keys(STATUS_META) as RatingStatus[]).map((s) => {
              const Meta = STATUS_META[s]
              const isActive = myRating?.status === s
              return (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  disabled={busy || !activeFriendId}
                  onClick={() => toggleStatus(s)}
                  className={cn("h-8 flex-1 px-2", isActive && Meta.active)}
                >
                  <Meta.icon className="h-3.5 w-3.5" />
                  <span className="ml-1 text-xs">{Meta.label}</span>
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              disabled={busy || !activeFriendId}
              onClick={() => upsertRating({ favorite: !myRating?.favorite })}
              aria-label="Toggle favorite"
              className={cn(
                "h-8 w-8 shrink-0",
                myRating?.favorite &&
                  "border-amber-400 bg-amber-50 hover:bg-amber-50",
              )}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  myRating?.favorite
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground",
                )}
              />
            </Button>

            <Dialog
              open={editOpen}
              onOpenChange={(open) => {
                setEditOpen(open)
              }}
            >
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!activeFriendId}
                    onClick={openPersonalEditor}
                    aria-label="Edit my personal strain details"
                    className="h-8 w-8 shrink-0"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif">Your personal details</DialogTitle>
                  <DialogDescription>
                    These edits are saved just for you and do not change crew-shared strain details.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`personal-note-${strain.id}`}>My comment</Label>
                    <Textarea
                      id={`personal-note-${strain.id}`}
                      rows={3}
                      placeholder="How this strain tasted or felt for you"
                      value={personalForm.personal_notes}
                      onChange={(e) =>
                        setPersonalForm((prev) => ({
                          ...prev,
                          personal_notes: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Type override</Label>
                    <Select
                      value={personalForm.strain_type_override || "shared"}
                      onValueChange={(v) =>
                        setPersonalForm((prev) => ({
                          ...prev,
                          strain_type_override: v === "shared" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger className="sm:w-48">
                        <SelectValue placeholder="Use shared" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shared">Use shared</SelectItem>
                        <SelectItem value="indica">Indica</SelectItem>
                        <SelectItem value="sativa">Sativa</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`personal-effects-${strain.id}`}>
                      Effects override
                    </Label>
                    <Input
                      id={`personal-effects-${strain.id}`}
                      placeholder="Use shared, or enter comma-separated effects"
                      value={personalForm.effects_override}
                      onChange={(e) =>
                        setPersonalForm((prev) => ({
                          ...prev,
                          effects_override: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`personal-flavors-${strain.id}`}>
                      Flavors override
                    </Label>
                    <Input
                      id={`personal-flavors-${strain.id}`}
                      placeholder="Use shared, or enter comma-separated flavors"
                      value={personalForm.flavors_override}
                      onChange={(e) =>
                        setPersonalForm((prev) => ({
                          ...prev,
                          flavors_override: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={savePersonalization} disabled={personalSaving}>
                    {personalSaving ? "Saving..." : "Save my details"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {activeFriendId && (
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-xs text-muted-foreground">Score:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const isActive = myRating?.score === n
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={busy}
                      onClick={() => upsertRating({ score: isActive ? null : n })}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded text-xs font-medium transition",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      )}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">
              {addedBy ? `Added by ${addedBy.name}` : "Added"}
            </span>
            <div className="flex items-center gap-1">
              <a
                href={`https://levelsmi.com/shop/niles?search=${encodeURIComponent(strain.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:text-foreground"
                aria-label={`Search ${strain.name} on Levels Niles`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Levels
              </a>
              <a
                href={`https://www.leafly.com/strains/${slugify(strain.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:text-foreground"
                aria-label={`View ${strain.name} on Leafly`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Leafly
              </a>
              <button
                type="button"
                onClick={deleteStrain}
                className="rounded-md p-1 hover:text-destructive"
                aria-label={`Delete ${strain.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function splitListOrNull(value: string) {
  const list = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  return list.length > 0 ? list : null
}

function parseTypeOverride(value: string): StrainType | null {
  if (value === "indica" || value === "sativa" || value === "hybrid") {
    return value
  }
  return null
}

function emptyToNull(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function FriendPill({ friend }: { friend: Friend }) {
  const style = FRIEND_COLOR_STYLES[friend.color]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-medium",
        style.soft,
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white",
          style.dot,
        )}
      >
        {initials(friend.name)}
      </span>
      {friend.name}
    </span>
  )
}

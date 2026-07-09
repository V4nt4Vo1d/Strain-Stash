"use client"

import { useState } from "react"
import {
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Star,
  ExternalLink,
  Trash2,
  Leaf,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type {
  Friend,
  RatingStatus,
  StrainWithRatings,
} from "@/lib/types"
import { FRIEND_COLOR_STYLES, initials } from "@/lib/friend-colors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
  const friendById = new Map(friends.map((f) => [f.id, f]))
  const addedBy = strain.added_by ? friendById.get(strain.added_by) : undefined

  const myRating = strain.ratings.find((r) => r.friend_id === activeFriendId)

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
    patch: { status?: RatingStatus | null; favorite?: boolean },
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
                className={cn("capitalize", TYPE_STYLES[strain.strain_type])}
              >
                {strain.strain_type}
              </Badge>
              {strain.thc != null && (
                <span className="text-xs text-muted-foreground">
                  THC {strain.thc}%
                </span>
              )}
              {strain.cbd != null && (
                <span className="text-xs text-muted-foreground">
                  CBD {strain.cbd}%
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

        {(strain.effects.length > 0 || strain.flavors.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {strain.effects.map((e) => (
              <span
                key={`e-${e}`}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
              >
                {e}
              </span>
            ))}
            {strain.flavors.map((f) => (
              <span
                key={`f-${f}`}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {strain.notes && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {strain.notes}
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
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">
              {addedBy ? `Added by ${addedBy.name}` : "Added"}
            </span>
            <div className="flex items-center gap-1">
              {strain.source_url && (
                <a
                  href={strain.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 capitalize hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {strain.source_type !== "other" ? strain.source_type : "Link"}
                </a>
              )}
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

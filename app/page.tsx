"use client"

import { useMemo, useState } from "react"
import { Leaf, Plus, Search, Users, Loader2 } from "lucide-react"
import { useFriends, useStrains } from "@/lib/hooks"
import { useActiveFriend } from "@/lib/use-active-friend"
import type { RatingStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FriendSwitcher } from "@/components/friend-switcher"
import { FriendsDialog } from "@/components/friends-dialog"
import { AddStrainDialog } from "@/components/add-strain-dialog"
import { StrainCard } from "@/components/strain-card"

type ViewFilter =
  | "all"
  | "my_liked"
  | "my_disliked"
  | "my_want"
  | "my_favorites"

export default function Page() {
  const { friends, mutate: mutateFriends } = useFriends()
  const { strains, isLoading, mutate: mutateStrains } = useStrains()
  const { activeFriendId, setActive, ready } = useActiveFriend()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [friendFilter, setFriendFilter] = useState<string>("all")
  const [view, setView] = useState<ViewFilter>("all")

  const activeFriend = friends.find((f) => f.id === activeFriendId) ?? null

  const stats = useMemo(() => {
    const mine = (status: RatingStatus) =>
      strains.filter((s) =>
        s.ratings.some(
          (r) => r.friend_id === activeFriendId && r.status === status,
        ),
      ).length
    const favs = strains.filter((s) =>
      s.ratings.some((r) => r.friend_id === activeFriendId && r.favorite),
    ).length
    return {
      total: strains.length,
      liked: mine("liked"),
      want: mine("want_to_try"),
      favorites: favs,
    }
  }, [strains, activeFriendId])

  const filtered = useMemo(() => {
    return strains.filter((s) => {
      if (typeFilter !== "all" && s.strain_type !== typeFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = [s.name, s.notes, ...s.effects, ...s.flavors]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(q)) return false
      }

      if (friendFilter !== "all") {
        const r = s.ratings.find((r) => r.friend_id === friendFilter)
        if (!r || (!r.status && !r.favorite)) return false
      }

      if (view !== "all" && activeFriendId) {
        const r = s.ratings.find((r) => r.friend_id === activeFriendId)
        if (view === "my_liked" && r?.status !== "liked") return false
        if (view === "my_disliked" && r?.status !== "disliked") return false
        if (view === "my_want" && r?.status !== "want_to_try") return false
        if (view === "my_favorites" && !r?.favorite) return false
      }

      return true
    })
  }, [strains, typeFilter, search, friendFilter, view, activeFriendId])

  const views: { key: ViewFilter; label: string }[] = [
    { key: "all", label: "All strains" },
    { key: "my_liked", label: "I liked" },
    { key: "my_want", label: "Want to try" },
    { key: "my_favorites", label: "My favorites" },
    { key: "my_disliked", label: "Not for me" },
  ]

  const refreshAll = () => {
    mutateStrains()
    mutateFriends()
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="font-serif text-lg font-semibold">Strain Stash</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Our shared strain list
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FriendSwitcher
              friends={friends}
              activeFriendId={activeFriendId}
              onSelect={setActive}
            />
            <FriendsDialog
              friends={friends}
              onChanged={mutateFriends}
              activeFriendId={activeFriendId}
              trigger={
                <Button variant="outline" size="icon" aria-label="Manage crew">
                  <Users className="h-4 w-4" />
                </Button>
              }
            />
            <AddStrainDialog
              activeFriendId={activeFriendId}
              onAdded={mutateStrains}
              trigger={
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add strain</span>
                </Button>
              }
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Onboarding */}
        {ready && friends.length === 0 && (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-primary/30 bg-accent/50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold">
                Welcome to the stash
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add you and your friends to get started, then start logging
                strains.
              </p>
            </div>
            <FriendsDialog
              friends={friends}
              onChanged={mutateFriends}
              activeFriendId={activeFriendId}
              trigger={
                <Button className="gap-1">
                  <Users className="h-4 w-4" />
                  Add the crew
                </Button>
              }
            />
          </div>
        )}
        {ready && friends.length > 0 && !activeFriendId && (
          <div className="mb-6 flex flex-col items-start gap-2 rounded-xl border border-primary/30 bg-accent/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Pick who you are so your likes and favorites get saved to you.
            </p>
            <FriendSwitcher
              friends={friends}
              activeFriendId={activeFriendId}
              onSelect={setActive}
            />
          </div>
        )}

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Strains logged" value={stats.total} />
          <StatTile
            label={activeFriend ? `${activeFriend.name} likes` : "You liked"}
            value={stats.liked}
            tint="text-emerald-700"
          />
          <StatTile label="Want to try" value={stats.want} tint="text-sky-700" />
          <StatTile
            label="Favorites"
            value={stats.favorites}
            tint="text-amber-600"
          />
        </section>

        {/* Filters */}
        <section className="mb-5 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search names, effects, flavors..."
                className="pl-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v ?? "all")}
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="indica">Indica</SelectItem>
                <SelectItem value="sativa">Sativa</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={friendFilter}
              onValueChange={(v) => setFriendFilter(v ?? "all")}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Anyone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Anyone&apos;s picks</SelectItem>
                {friends.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {views.map((v) => {
              const disabled = v.key !== "all" && !activeFriendId
              return (
                <button
                  key={v.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setView(v.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition",
                    view === v.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading strains...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasStrains={strains.length > 0}
            activeFriendId={activeFriendId}
            onAdded={mutateStrains}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <StrainCard
                key={s.id}
                strain={s}
                friends={friends}
                activeFriendId={activeFriendId}
                onChanged={refreshAll}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
        Strain Stash — kept just between the crew. Please consume responsibly.
      </footer>
    </div>
  )
}

function StatTile({
  label,
  value,
  tint,
}: {
  label: string
  value: number
  tint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className={cn("font-serif text-3xl font-semibold", tint)}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function EmptyState({
  hasStrains,
  activeFriendId,
  onAdded,
}: {
  hasStrains: boolean
  activeFriendId: string | null
  onAdded: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
        <Leaf className="h-7 w-7 text-emerald-400" />
      </span>
      <div>
        <p className="font-serif text-lg font-semibold">
          {hasStrains ? "Nothing matches those filters" : "No strains yet"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasStrains
            ? "Try clearing your search or filters."
            : "Add the first strain your crew has tried or wants to try."}
        </p>
      </div>
      {!hasStrains && (
        <AddStrainDialog
          activeFriendId={activeFriendId}
          onAdded={onAdded}
          trigger={
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              Add a strain
            </Button>
          }
        />
      )}
    </div>
  )
}

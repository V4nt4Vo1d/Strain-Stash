"use client"

import { useState } from "react"
import { Plus, Trash2, Check } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { FRIEND_COLORS, type Friend, type FriendColor } from "@/lib/types"
import { FRIEND_COLOR_STYLES, initials } from "@/lib/friend-colors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function FriendsDialog({
  friends,
  onChanged,
  activeFriendId,
  trigger,
}: {
  friends: Friend[]
  onChanged: () => void
  activeFriendId: string | null
  trigger: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState<FriendColor>("emerald")
  const [saving, setSaving] = useState(false)

  const usedColors = new Set(friends.map((f) => f.color))

  async function addFriend() {
    if (!name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("friends")
      .insert({ name: name.trim(), color })
    setSaving(false)
    if (error) {
      toast.error("Couldn't add friend")
      return
    }
    toast.success(`${name.trim()} joined the crew`)
    setName("")
    // pick next unused color
    const next = FRIEND_COLORS.find((c) => !usedColors.has(c) && c !== color)
    if (next) setColor(next)
    onChanged()
  }

  async function removeFriend(f: Friend) {
    const supabase = createClient()
    const { error } = await supabase.from("friends").delete().eq("id", f.id)
    if (error) {
      toast.error("Couldn't remove friend")
      return
    }
    toast.success(`Removed ${f.name}`)
    onChanged()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">The crew</DialogTitle>
          <DialogDescription>
            Add everyone who&apos;s tracking strains with you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {friends.length === 0 ? (
            <p className="rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
              No one here yet. Add your first friend below.
            </p>
          ) : (
            friends.map((f) => {
              const style = FRIEND_COLOR_STYLES[f.color]
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
                      style.dot,
                    )}
                  >
                    {initials(f.name)}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {f.name}
                    {activeFriendId === f.id && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (that&apos;s you)
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeFriend(f)}
                    aria-label={`Remove ${f.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friend's name"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) addFriend()
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            {FRIEND_COLORS.map((c) => {
              const style = FRIEND_COLOR_STYLES[c]
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition",
                    style.dot,
                    color === c ? style.ring : "ring-transparent",
                  )}
                  aria-label={`Color ${c}`}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              )
            })}
          </div>
          <Button onClick={addFriend} disabled={saving || !name.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Add friend
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

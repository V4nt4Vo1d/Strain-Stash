"use client"

import { ChevronDown, UserRound } from "lucide-react"
import type { Friend } from "@/lib/types"
import { FRIEND_COLOR_STYLES, initials } from "@/lib/friend-colors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function FriendSwitcher({
  friends,
  activeFriendId,
  onSelect,
}: {
  friends: Friend[]
  activeFriendId: string | null
  onSelect: (id: string) => void
}) {
  const active = friends.find((f) => f.id === activeFriendId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="gap-2">
            {active ? (
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                  FRIEND_COLOR_STYLES[active.color].dot,
                )}
              >
                {initials(active.name)}
              </span>
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            <span className="max-w-24 truncate">
              {active ? active.name : "Who are you?"}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>You&apos;re browsing as</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {friends.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Add a friend first
            </div>
          ) : (
            friends.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() => onSelect(f.id)}
                className="gap-2"
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                    FRIEND_COLOR_STYLES[f.color].dot,
                  )}
                >
                  {initials(f.name)}
                </span>
                <span className="flex-1 truncate">{f.name}</span>
                {activeFriendId === f.id && (
                  <span className="text-xs text-muted-foreground">active</span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

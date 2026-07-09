"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Friend, StrainWithRatings } from "@/lib/types"

export function useFriends() {
  const { data, error, isLoading, mutate } = useSWR<Friend[]>(
    "friends",
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("friends")
        .select("*")
        .order("created_at", { ascending: true })
      if (error) throw error
      return (data ?? []) as Friend[]
    },
  )
  return { friends: data ?? [], error, isLoading, mutate }
}

export function useStrains() {
  const { data, error, isLoading, mutate } = useSWR<StrainWithRatings[]>(
    "strains",
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("strains")
        .select("*, ratings:strain_ratings(*), personalizations:strain_personalizations(*)")
        .order("created_at", { ascending: false })
      if (error) throw error

      return (data ?? []).map((row) => ({
        ...row,
        personalizations: row.personalizations ?? [],
      })) as StrainWithRatings[]
    },
  )
  return { strains: data ?? [], error, isLoading, mutate }
}

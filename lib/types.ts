export type StrainType = "indica" | "sativa" | "hybrid"
export type SourceType = "leafly" | "levels" | "other"
export type RatingStatus = "liked" | "disliked" | "want_to_try"

export const FRIEND_COLORS = [
  "emerald",
  "amber",
  "sky",
  "rose",
  "violet",
  "orange",
  "teal",
  "lime",
] as const
export type FriendColor = (typeof FRIEND_COLORS)[number]

export interface Friend {
  id: string
  name: string
  color: FriendColor
  created_at: string
}

export interface Strain {
  id: string
  name: string
  strain_type: StrainType
  thc: number | null
  cbd: number | null
  effects: string[]
  flavors: string[]
  notes: string | null
  source_url: string | null
  source_type: SourceType
  image_url: string | null
  added_by: string | null
  created_at: string
}

export interface StrainRating {
  id: string
  strain_id: string
  friend_id: string
  status: RatingStatus | null
  favorite: boolean
  updated_at: string
}

export interface StrainPersonalization {
  id: string
  strain_id: string
  friend_id: string
  personal_notes: string | null
  strain_type_override: StrainType | null
  thc_override: number | null
  cbd_override: number | null
  effects_override: string[] | null
  flavors_override: string[] | null
  updated_at: string
}

export interface StrainWithRatings extends Strain {
  ratings: StrainRating[]
  personalizations: StrainPersonalization[]
}

export const STATUS_LABELS: Record<RatingStatus, string> = {
  liked: "Liked",
  disliked: "Disliked",
  want_to_try: "Want to try",
}

export type UUID = string;

export type Category = {
  id: UUID;
  name: string;
  slug: string;
};

export type Tag = {
  id: UUID;
  name: string;
  slug: string;
};

export type Article = {
  id: UUID;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  category?: UUID | null;
  category_name?: string | null;
  author_name?: string | null;
  is_public?: boolean;
  is_featured?: boolean;
  status?: string;
  image?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  tags?: UUID[];
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  view_count?: number;
  read_time_minutes?: number;
  comment_count?: number;
};

export type PlayerStats = {
  id: UUID;
  level: number;
  experience: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
  points_remaining: number;
  updated_at: string;
};

export type PlayerItem = {
  slot_index: number;
  template_id: UUID;
  name: string;
  quantity: number;
};

export type PlayerInventory = {
  id: UUID;
  gold: number;
  slots_used: number;
  max_slots: number;
  items: PlayerItem[];
  updated_at: string;
};

export type LeaderboardEntry = {
  name: string;
  score: number;
};

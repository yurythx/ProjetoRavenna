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
  rank?: number;
  name?: string;
  display_name?: string;
  score: number;
};

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type ItemTemplate = {
  id: UUID;
  name: string;
  description: string;
  item_type: string;
  rarity: ItemRarity;
  base_damage: number;
  base_defense: number;
  base_health: number;
  base_mana: number;
  icon_path: string;
  stack_size: number;
  is_droppable: boolean;
  is_tradable: boolean;
  price: number;
  level_required: number;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type QuestObjective = {
  key: string;
  description: string;
  target_count: number;
};

export type QuestRewards = {
  xp?: number;
  gold?: number;
  items?: { item_template_id: UUID; quantity: number }[];
};

export type QuestTemplate = {
  id: UUID;
  name: string;
  description: string;
  quest_type: "main" | "side" | "daily" | "repeatable";
  quest_type_display: string;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  level_required: number;
  is_repeatable: boolean;
};

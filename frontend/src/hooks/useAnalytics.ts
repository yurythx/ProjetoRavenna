export function useTrackView(slug: string) {
  return { mutate: (_payload?: any) => {} };
}

export function useArticleStats(slug: string, _enabled?: boolean) {
  return {
    data: {
      view_count: 0,
      unique_views: 0,
      reading_time: 0,
      engagement_rate: 0,
      likes_count: 0,
      comments_count: 0,
      like_count: 0,
      comment_count: 0,
    },
  };
}

import { useState } from 'react';
export function FavoriteButton({
  articleId,
  initialFavorited,
  onChanged,
  size,
}: {
  articleId: any;
  initialFavorited: boolean;
  onChanged?: (favorited: boolean) => void;
  size?: string;
}) {
  const [fav, setFav] = useState(initialFavorited);
  const toggle = () => {
    const next = !fav;
    setFav(next);
    if (onChanged) onChanged(next);
  };
  const cls = size === 'sm' ? 'btn btn-outline text-xs' : 'btn btn-outline';
  return <button className={cls} onClick={toggle}>Favorite</button>;
}

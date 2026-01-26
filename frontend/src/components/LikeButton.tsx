import { useState } from 'react';
export function LikeButton({
  articleId,
  initialLiked,
  initialCount,
  onChanged,
  size,
  showCount,
}: {
  articleId: any;
  initialLiked: boolean;
  initialCount: number;
  onChanged?: (liked: boolean, count: number) => void;
  size?: string;
  showCount?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const toggle = () => {
    const nextLiked = !liked;
    const nextCount = nextLiked ? count + 1 : Math.max(0, count - 1);
    setLiked(nextLiked);
    setCount(nextCount);
    if (onChanged) onChanged(nextLiked, nextCount);
  };
  const cls = size === 'sm' ? 'btn btn-outline text-xs' : 'btn btn-outline';
  return <button className={cls} onClick={toggle}>{showCount ? `${count} ` : ''}Like</button>;
}

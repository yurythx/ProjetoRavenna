'use client';
export function CaptchaWidget({ onToken }: { onToken?: (t: string) => void }) {
  return <div className="h-12 bg-muted rounded" onClick={() => onToken && onToken('token')} />;
}

'use client';
import { useEffect, useRef } from 'react';

export function CaptchaWidget({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const provider = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || 'hcaptcha';
    const sitekey = process.env.NEXT_PUBLIC_CAPTCHA_SITEKEY || '';
    function injectScript(src: string) {
      if (document.querySelector(`script[src="${src}"]`)) return;
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      document.body.appendChild(s);
    }
    if (provider === 'hcaptcha') {
      (window as any).hcaptchaCallback = (token: string) => onToken(token);
      injectScript('https://hcaptcha.com/1/api.js');
      if (ref.current) {
        ref.current.className = 'h-captcha';
        ref.current.setAttribute('data-sitekey', sitekey);
        ref.current.setAttribute('data-callback', 'hcaptchaCallback');
      }
    } else if (provider === 'recaptcha') {
      (window as any).recaptchaCallback = () => {
        const token = (window as any).grecaptcha?.getResponse();
        if (token) onToken(token);
      };
      injectScript('https://www.google.com/recaptcha/api.js');
      if (ref.current) {
        ref.current.className = 'g-recaptcha';
        ref.current.setAttribute('data-sitekey', sitekey);
        ref.current.setAttribute('data-callback', 'recaptchaCallback');
      }
    }
  }, [onToken]);
  return (
    <div className="mt-2" style={{ minHeight: 78 }}>
      <div ref={ref} />
    </div>
  );
}

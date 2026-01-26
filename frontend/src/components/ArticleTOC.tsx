'use client';
export function ArticleTOC({ items }: { items: Array<{ id: string; title?: string; text?: string }> }) {
  return <ul>{items.map(i => <li key={i.id}>{i.title || i.text || ''}</li>)}</ul>;
}

export function MobileTOC({ items, isOpen, onClose }: { items: Array<{ id: string; title?: string; text?: string }>; isOpen?: boolean; onClose?: () => void }) {
  return (
    <div>
      {isOpen && (
        <div>
          <button onClick={onClose}>Fechar</button>
          <ul>{items.map(i => <li key={i.id}>{i.title || i.text || ''}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

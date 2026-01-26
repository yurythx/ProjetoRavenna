export function ChartCard({ children, title }: { children?: React.ReactNode; title: string }) {
  return (
    <div className="border rounded p-4">
      <div className="mb-2 font-semibold">{title}</div>
      {children}
    </div>
  );
}

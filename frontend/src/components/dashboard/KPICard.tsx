export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  bgColor,
}: {
  title: string;
  value: number | string;
  change?: number;
  icon?: any;
  iconColor?: string;
  bgColor?: string;
}) {
  return (
    <div className="border border-border rounded p-4 bg-card" style={{ backgroundColor: bgColor }}>
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {typeof change !== 'undefined' && (
        <div className="text-xs text-muted-foreground">{change}%</div>
      )}
      {Icon && <Icon color={iconColor} />}
    </div>
  );
}

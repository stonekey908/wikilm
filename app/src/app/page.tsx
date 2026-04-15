export default function DashboardPage() {
  return (
    <div className="p-8 max-w-[960px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-[650] text-[var(--text-1)] tracking-tight leading-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Project overview and quick actions
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Sources", value: "0" },
          { label: "Wiki Pages", value: "0" },
          { label: "Entities", value: "0" },
          { label: "Concepts", value: "0" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="text-[11px] font-semibold text-[var(--text-4)] uppercase tracking-wider">
              {stat.label}
            </div>
            <div className="text-2xl font-[650] text-[var(--text-1)] mt-1 font-mono">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

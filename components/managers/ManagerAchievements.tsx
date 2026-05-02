import type { Achievement } from "@/lib/achievements";

export function ManagerAchievements({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter(a => a.earned);
  const unearned = achievements.filter(a => !a.earned);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Earned ({earned.length}/{achievements.length})
        </h3>
        {earned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No achievements yet. Keep playing!</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {earned.map(a => (
              <div key={a.id} className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 p-3">
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Locked ({unearned.length})
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {unearned.map(a => (
            <div key={a.id} className="flex items-start gap-3 rounded border bg-muted/20 p-3 opacity-50">
              <span className="text-2xl">{a.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

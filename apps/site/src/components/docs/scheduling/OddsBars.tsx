interface Row {
  label: string;
  /** Odds relative to the reference row, which draws at full ink. */
  odds: number;
  value: string;
}

/**
 * Relative odds as bars on one scale. Ink at graded length, never a colour: the bar is a
 * quantity, not a state or an action.
 */
export function OddsBars({ rows, caption }: { rows: Row[]; caption: string }) {
  const max = Math.max(...rows.map((r) => r.odds));
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th
              scope="row"
              className="w-24 py-1.5 pe-3 text-start font-normal text-ink tabular-nums"
            >
              {r.label}
            </th>
            <td className="py-1.5" aria-hidden="true">
              <div className="h-2 rounded-full bg-plate-nested">
                <div
                  className="h-2 rounded-full bg-ink"
                  style={{
                    width: `${Math.max(0.6, (r.odds / max) * 100).toFixed(2)}%`,
                    opacity: r.odds === 1 ? 1 : 0.55,
                  }}
                />
              </div>
            </td>
            <td className="w-16 py-1.5 ps-3 text-end tabular-nums text-ink-secondary">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

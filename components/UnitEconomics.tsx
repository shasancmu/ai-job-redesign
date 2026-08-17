"use client";

// Live unit-economics calculator. The AI seeds the inputs from the interview;
// the user tweaks them and the derived economics update instantly.
export type Calc = Record<string, number | undefined>;
type Input = { key: string; label: string; prefix?: string; suffix?: string };

export function computeUE(c: Calc) {
  const n = (k: string) => Number(c?.[k]) || 0;
  const price = n("price"), vc = n("varCost"), opm = n("ordersPerMonth"), rm = n("retentionMonths"), cac = n("cac"), fixed = n("fixedMonthly");
  const cm = price - vc; // contribution margin per sale
  const cmPct = price > 0 ? (cm / price) * 100 : 0;
  const monthly = cm * opm; // contribution per customer per month
  const ltv = monthly * rm;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const payback = monthly > 0 ? cac / monthly : NaN;
  const beCustomers = monthly > 0 ? Math.ceil(fixed / monthly) : NaN;
  return { cm, cmPct, monthly, ltv, ltvCac, payback, beCustomers };
}

export function ltvCacColor(r: number) {
  return r >= 3 ? "#3F7A52" : r >= 1.5 ? "#CE8F2C" : "#B4532E";
}

const money = (n: number) => (isFinite(n) ? "$" + Math.round(n).toLocaleString() : "—");

export default function UnitEconomics({
  inputs,
  value,
  onChange,
  readOnly = false,
}: {
  inputs: Input[];
  value: Calc;
  onChange?: (c: Calc) => void;
  readOnly?: boolean;
}) {
  const c = value || {};
  const r = computeUE(c);
  const set = (k: string, v: string) => onChange?.({ ...c, [k]: v === "" ? undefined : Number(v) });

  return (
    <div>
      {readOnly ? (
        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {inputs.map((f) => (
            <div key={f.key} className="flex justify-between border-b border-line/60 py-1">
              <span className="text-slate-500">{f.label}</span>
              <span className="font-medium text-ink">
                {c[f.key] != null ? `${f.prefix || ""}${c[f.key]}${f.suffix ? " " + f.suffix : ""}` : "—"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {inputs.map((f) => (
            <label key={f.key} className="text-sm">
              <span className="text-slate-600">{f.label}</span>
              <div className="mt-1 flex items-center gap-1.5">
                {f.prefix && <span className="text-slate-400">{f.prefix}</span>}
                <input
                  type="number"
                  className="field"
                  value={c[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
                {f.suffix && <span className="whitespace-nowrap text-slate-400">{f.suffix}</span>}
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Contribution margin" value={`${money(r.cm)} · ${Math.round(r.cmPct)}%`} />
        <Stat label="Lifetime value (LTV)" value={money(r.ltv)} />
        <Stat label="LTV : CAC" value={r.ltvCac ? r.ltvCac.toFixed(1) + "×" : "—"} color={r.ltvCac ? ltvCacColor(r.ltvCac) : undefined} />
        <Stat label="CAC payback" value={isFinite(r.payback) ? r.payback.toFixed(1) + " mo" : "—"} />
        <Stat label="Break-even" value={isFinite(r.beCustomers) ? r.beCustomers.toLocaleString() + " cust/mo" : "—"} />
        <Stat label="Monthly margin / cust." value={money(r.monthly)} />
      </div>
      {!readOnly && r.ltvCac > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Rule of thumb: LTV:CAC ≥ 3× and payback under ~12 months. {r.ltvCac < 3 ? "This is below the bar — the economics need work." : "These economics clear the bar."}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-mist p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-bold" style={{ color: color || "#14283A" }}>{value}</div>
    </div>
  );
}

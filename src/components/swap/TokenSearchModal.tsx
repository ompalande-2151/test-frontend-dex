import { useMemo, useState } from "react";
import { TOKENS } from "../../config/contracts";

// Tiny fuzzy match: every query char appears in order in the candidate.
function fuzzy(query: string, target: string) {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return q.length === 0;
}

export default function TokenSearchModal({
  onClose,
  onSelect
}: {
  onClose: () => void;
  onSelect: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => TOKENS.filter((t) => fuzzy(query, t.symbol) || fuzzy(query, t.name)),
    [query]
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-2xl p-4 w-80">
        <input
          id="token-search"
          name="tokenSearch"
          autoFocus
          autoComplete="off"
          className="w-full bg-zinc-800 rounded-lg px-3 py-2 mb-3 outline-none"
          placeholder="Search name or symbol"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul>
          {results.map((t) => (
            <li
              key={t.symbol}
              className="py-2 cursor-pointer"
              onClick={() => {
                onSelect(t.symbol);
                onClose();
              }}
            >
              <strong>{t.symbol}</strong> <span className="text-zinc-400">{t.name}</span>
              {!t.address && <span className="ml-2 text-xs text-amber-400">needs address</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

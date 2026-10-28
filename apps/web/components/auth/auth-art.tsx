// apps/web/components/auth/auth-art.tsx
// Decorative Kanban illustration. Hex colors are fixed on purpose: this panel is always dark.
const columns = [
  { x: 0, cards: [{ h: 64 }, { h: 80, active: true }, { h: 64 }] },
  { x: 185, cards: [{ h: 80 }, { h: 64 }] },
  { x: 370, cards: [{ h: 64 }] },
];

export function AuthArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 480" className={className} aria-hidden="true">
      {columns.map((col) => {
        let y = 84; // y position of the next card in this column
        return (
          <g key={col.x}>
            <rect
              x={col.x}
              y={40}
              width={150}
              height={400}
              rx={10}
              fill="#1F1F23"
              stroke="#3F3F46"
            />
            <rect
              x={col.x + 14}
              y={56}
              width={50}
              height={8}
              rx={4}
              fill="#71717A"
            />
            {col.cards.map((c, i) => {
              const top = y;
              y += c.h + 12;
              return (
                <g key={i}>
                  <rect
                    x={col.x + 12}
                    y={top}
                    width={126}
                    height={c.h}
                    rx={8}
                    fill="#27272A"
                    stroke={c.active ? "#FAFAFA" : "#3F3F46"}
                  />
                  <rect
                    x={col.x + 24}
                    y={top + 14}
                    width={80}
                    height={7}
                    rx={3.5}
                    fill="#A1A1AA"
                  />
                  <rect
                    x={col.x + 24}
                    y={top + 28}
                    width={56}
                    height={6}
                    rx={3}
                    fill="#52525B"
                  />
                  {c.h > 60 && (
                    <rect
                      x={col.x + 24}
                      y={top + c.h - 22}
                      width={28}
                      height={10}
                      rx={5}
                      fill="#3F3F46"
                    />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

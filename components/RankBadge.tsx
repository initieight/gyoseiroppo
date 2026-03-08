export type Rank = 'S' | 'A' | 'B' | 'C';

export function getRank(count: number): Rank {
  if (count >= 3) return 'S';
  if (count === 2) return 'A';
  if (count === 1) return 'B';
  return 'C';
}

const BADGE_CLASS: Record<Rank, string> = {
  S: 'bg-red-500 text-white',
  A: 'bg-orange-400 text-white',
  B: 'bg-yellow-300 text-gray-900',
  C: 'bg-gray-200 text-gray-600',
};

export default function RankBadge({ rank }: { rank: Rank }) {
  return (
    <span
      className={`shrink-0 w-7 h-7 flex items-center justify-center text-xs font-bold rounded-full ${BADGE_CLASS[rank]}`}
    >
      {rank}
    </span>
  );
}

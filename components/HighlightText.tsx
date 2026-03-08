type Highlight = {
  phrase: string;
  tag: string;
  once: boolean;
};

type Props = {
  text: string;
  highlights: Highlight[];
};

export default function HighlightText({ text, highlights }: Props) {
  if (!highlights.length) return <span>{text}</span>;

  // 長いフレーズを優先して部分一致衝突を防ぐ
  const sorted = [...highlights].sort((a, b) => b.phrase.length - a.phrase.length);

  type Range = { start: number; end: number; tag: string };
  const ranges: Range[] = [];
  const usedChars = new Set<number>();

  for (const { phrase, tag, once } of sorted) {
    let from = 0;
    while (from <= text.length - phrase.length) {
      const idx = text.indexOf(phrase, from);
      if (idx === -1) break;

      // 既にハイライト済みの文字と重複しないか確認
      let overlaps = false;
      for (let i = idx; i < idx + phrase.length; i++) {
        if (usedChars.has(i)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        ranges.push({ start: idx, end: idx + phrase.length, tag });
        for (let i = idx; i < idx + phrase.length; i++) usedChars.add(i);
        if (once) break;
        from = idx + phrase.length;
      } else {
        from = idx + 1;
      }
    }
  }

  ranges.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (const { start, end, tag } of ranges) {
    if (pos < start) nodes.push(<span key={`t${pos}`}>{text.slice(pos, start)}</span>);
    nodes.push(
      <mark
        key={`m${start}`}
        className="bg-yellow-200 text-yellow-900 px-0.5 rounded"
        data-tag={tag}
      >
        {text.slice(start, end)}
      </mark>
    );
    pos = end;
  }
  if (pos < text.length) nodes.push(<span key={`t${pos}`}>{text.slice(pos)}</span>);

  return <span>{nodes}</span>;
}

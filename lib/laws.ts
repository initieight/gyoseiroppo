import { promises as fs } from 'fs';
import path from 'path';

// ── 法律マスタ（サイト全体で唯一の定義。ここに追加すれば全ページに反映される）──
export const LAWS = [
  { id: 'constitution',       name: '憲法',           shortDesc: '統治機構・人権の基本法' },
  { id: 'admin_procedure',    name: '行政手続法',     shortDesc: '申請・不利益処分・行政指導・届出の手続' },
  { id: 'admin_appeal',       name: '行政不服審査法', shortDesc: '審査請求・再調査の請求・再審査請求' },
  { id: 'admin_litigation',   name: '行政事件訴訟法', shortDesc: '取消訴訟・無効等確認訴訟・当事者訴訟' },
  { id: 'state_liability',    name: '国家賠償法',     shortDesc: '公権力の行使・営造物責任' },
  { id: 'admin_enforcement',  name: '行政代執行法',   shortDesc: '代執行の要件と手続' },
  { id: 'national_admin_org', name: '国家行政組織法', shortDesc: '省・庁・委員会の組織と権限' },
  { id: 'local_autonomy',     name: '地方自治法',     shortDesc: '普通地方公共団体の組織・事務・住民の権利' },
  { id: 'civil_code',         name: '民法',           shortDesc: '総則・物権・債権・親族・相続' },
  { id: 'commercial_code',    name: '商法',           shortDesc: '商行為・商人・運送・海商' },
  { id: 'company_act',        name: '会社法',         shortDesc: '設立・株式・機関・計算・組織再編' },
] as const;

export type LawId = (typeof LAWS)[number]['id'];

const LAW_BY_ID = new Map(LAWS.map(l => [l.id as string, l]));

export function isLawId(id: string): id is LawId {
  return LAW_BY_ID.has(id);
}

export function lawName(id: string): string {
  return LAW_BY_ID.get(id)?.name ?? id;
}

export function lawMeta(id: string) {
  return LAW_BY_ID.get(id);
}

// ── 型 ────────────────────────────────────────────────────────
export interface Segment {
  type: 'req' | 'eff' | 'plain';
  text: string;
}

export interface LawArticle {
  title: string;
  caption?: string;
  text: string;
  segments?: Segment[];
  note?: string;
}

export interface LawData {
  lawId: string;
  articles: Record<string, LawArticle>;
}

export interface HighlightArticle {
  /** この条文が根拠になった問題数 */
  count: number;
  years: string[];
  phrases?: string[];
  questions?: string[];
  /** 正解肢の根拠になった問題数（民法のみ。選択肢単位で集計しているため出せる） */
  correctCount?: number;
  /** 問われた選択肢の数。1問で複数肢に使われることがある（民法のみ） */
  choices?: number;
  /** 論点ラベル。事実性が未検証のため現在は表示していない（民法のみ） */
  issues?: string[];
}

export interface HighlightData {
  lawId: string;
  range?: string[];
  articles: Record<string, HighlightArticle>;
}

// ── サーバ側ローダ（プロセス内キャッシュ付き）────────────────
const cache = new Map<string, unknown>();

/**
 * 読み込みに失敗したら例外を投げる。
 *
 * 以前は失敗時に空データを返していたが、それだとビルドは通るのに
 * 中身が空のページやサイトマップが出荷されてしまう。
 * 落ちてくれたほうが早く気づける。
 */
async function readJson<T>(relPath: string): Promise<T> {
  const cached = cache.get(relPath);
  if (cached !== undefined) return cached as T;
  const full = path.join(process.cwd(), relPath);
  let buf: string;
  try {
    buf = await fs.readFile(full, 'utf-8');
  } catch (e) {
    throw new Error(
      [
        `データファイルを読めません: ${relPath}`,
        'ビルド時ではなく実行時に読もうとしていないか確認してください',
        '（Vercel のサーバーレス関数には public/ が同梱されません）。',
        `原因: ${(e as Error).message}`,
      ].join(' '),
    );
  }
  const parsed = JSON.parse(buf) as T;
  cache.set(relPath, parsed);
  return parsed;
}

export function getLawData(lawId: string): Promise<LawData> {
  return readJson<LawData>(`public/laws/${lawId}.json`);
}

export function getHighlightData(lawId: string): Promise<HighlightData> {
  return readJson<HighlightData>(`public/highlights/r2_r7_${lawId}.json`);
}

// ── 条番号ユーティリティ ──────────────────────────────────────
/** "36の2" → 36.002 のような昇順ソートキー。"771:787"（削除条文の範囲）にも対応 */
export function articleSortKey(key: string): number {
  const m = key.match(/^(\d+)(?:の(\d+))?/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 1000 : 0);
}

/** 条番号の昇順に並んだキー配列 */
export function sortedArticleKeys(data: LawData): string[] {
  return Object.keys(data.articles).sort((a, b) => {
    const d = articleSortKey(a) - articleSortKey(b);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

/** 「削除」だけの条文（インデックス対象外にする） */
export function isDeletedArticle(art: LawArticle): boolean {
  return (art.text ?? '').replace(/\s/g, '') === '削除';
}

/** URL に載せる条番号（":" は %3A にせず素で使えるが、統一のため encodeURIComponent） */
export function articleHref(lawId: string, key: string): string {
  return `/law/${lawId}/${encodeURIComponent(key)}`;
}

export const SITE_URL = 'https://gyoseiroppo.com';
export const SITE_NAME = '行政六法';
export const EXAM_RANGE = 'R2〜R7';

/**
 * 条文キー → 検索されやすい算用数字ラベル。
 * "177" → "第177条" / "3の2" → "第3条の2" / 範囲キー("32:500") は null
 */
export function articleLabel(key: string): string | null {
  if (!/^\d+(の\d+)*$/.test(key)) return null;
  const [head, ...rest] = key.split('の');
  return `第${head}条${rest.map(r => `の${r}`).join('')}`;
}

// ── 出題データの集計単位 ─────────────────────────────────────
/**
 * 出題データの集計単位。法令によって count の意味が違う。
 *
 *  'question'    : 1問＝1カウント。条文と問題が1対1で対応している（民法以外の10法令）
 *  'topic-block' : 1問が論点ブロック内の複数条文に加算されている（民法のみ）
 *                  1問あたり平均7.4条・最大36条に展開されており、
 *                  「出題回数」としては読めない。データの作り直しが必要。
 *                  それまでの暫定措置として、表示の文言を分けている。
 */
export type CountBasis = 'question' | 'choice';

/**
 *  'question' : 問題単位で条文を割り当てている（民法以外の10法令）
 *  'choice'   : 選択肢単位で条文を割り当て、問題単位に集約している（民法）
 *               1問が最大5肢あるため、1問で複数条文にカウントが入るのは正常。
 */
/** 選択肢単位で根拠条文を割り当てた法令。順次増やしていく */
const CHOICE_BASED = new Set([
  'civil_code', 'local_autonomy', 'admin_litigation', 'admin_procedure',
  'admin_enforcement', 'state_liability', 'admin_appeal',
]);

export function countBasis(lawId: string): CountBasis {
  return CHOICE_BASED.has(lawId) ? 'choice' : 'question';
}

/** 一覧・ランキングで使う短いラベル */
export function countLabel(lawId: string, n: number): string {
  return countBasis(lawId) === 'choice' ? `${n}問` : `${n}回`;
}

/** 条文ページで使う一文 */
export function countSentence(lawId: string, n: number): string {
  return countBasis(lawId) === 'choice'
    ? `行政書士試験 ${EXAM_RANGE} の過去問${n}問で根拠条文になっています`
    : `行政書士試験 ${EXAM_RANGE} で出題${n}回`;
}

// ── 他資格試験の出題実績（民法のみ）────────────────────────
/**
 * 司法試験・予備試験・司法書士・宅建の出題実績。
 * 行政書士の実績とは合算せず、別の数字として扱う。重みが違うため。
 *
 * ※ 行政書士分は独立判定まで通しているが、この他資格分は通していない。
 *   表示するときは未検証であることを明示すること。
 */
export const OTHER_EXAMS = [
  { id: 'shiho',  name: '司法試験',   short: '司法' },
  { id: 'yobi',   name: '予備試験',   short: '予備' },
  { id: 'shoshi', name: '司法書士',   short: '書士' },
  { id: 'takken', name: '宅建',       short: '宅建' },
] as const;

export type OtherExamId = (typeof OTHER_EXAMS)[number]['id'];

export interface OtherExamEntry {
  count: number;
  years: string[];
  questions: string[];
}

export interface OtherExamArticle {
  total: number;
  byExam: Partial<Record<OtherExamId, OtherExamEntry>>;
}

export interface OtherExamData {
  lawId: string;
  exams: string[];
  articles: Record<string, OtherExamArticle>;
}

const EMPTY_OTHER: OtherExamData = { lawId: '', exams: [], articles: {} };

/** 他資格データを持つ法令かどうか */
export function hasOtherExamData(lawId: string): boolean {
  return lawId === 'civil_code';
}

export async function getOtherExamData(lawId: string): Promise<OtherExamData> {
  if (!hasOtherExamData(lawId)) return EMPTY_OTHER;
  return readJson<OtherExamData>(`public/highlights/other_exams_${lawId}.json`);
}

export function otherExamName(id: string): string {
  return OTHER_EXAMS.find(e => e.id === id)?.name ?? id;
}

// ── 同じ問題で一緒に問われた条文 ──────────────────────────
/**
 * 1つの問題に複数の条文が根拠として割り当てられているとき、
 * それらを共起として数えたもの。法的な判断はしていない。
 * 「関連条文」ではなく「一緒に問われた条文」として扱うこと。
 */
export interface RelatedArticle {
  article: string;
  count: number;
}

export interface RelatedData {
  lawId: string;
  articles: Record<string, RelatedArticle[]>;
}

const EMPTY_RELATED: RelatedData = { lawId: '', articles: {} };

export function hasRelatedData(lawId: string): boolean {
  return lawId === 'civil_code';
}

export async function getRelatedData(lawId: string): Promise<RelatedData> {
  if (!hasRelatedData(lawId)) return EMPTY_RELATED;
  return readJson<RelatedData>(`public/highlights/related_${lawId}.json`);
}

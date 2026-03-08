#!/usr/bin/env python3
"""
新規5法の highlights JSON に phrases を追加するスクリプト。

方式: 条文テキスト中のサブストリング（≥MIN_LEN文字）が
      過去問ページのテキストに出現するものを自動抽出し phrases に追加。
      加えて 国家行政組織法 のように条文が引用されているケースも対応。

実行: python -X utf8 data/gen_new_laws_phrases.py
"""

import json, os, re, shutil

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
ROOT        = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
LAWS_DIR    = os.path.join(ROOT, "public", "laws")
HL_DIR      = os.path.join(ROOT, "public", "highlights")
EXAM_FILE   = os.path.join(SCRIPT_DIR, "all_exam_pages.json")

MIN_LEN = 15   # phrases の最小文字数
MAX_PHRASES = 10  # 1条文あたり最大フレーズ数

# 条文（formal）→ 試験文（informal）の正規化マッピング
# 正規化後の文字列でマッチを探し、元テキストの対応位置を返す
FORMAL_TO_INFORMAL = [
    ('又は',   'または'),
    ('若しくは', 'もしくは'),
    ('及び',   'および'),
    ('並びに',  'ならびに'),
    ('但し',   'ただし'),
]

# ─── 試験問題ページ特定 ────────────────────────────────────────────────────
# (year, question_number) → 問題テキストを含むページを特定するキーワード
Q_KEYWORDS: dict[tuple, list[str]] = {
    # 商法
    ("r2", "Q36"): ["問題36", "問36"],
    ("r3", "Q36"): ["問題36", "問36"],
    ("r4", "Q36"): ["問題36", "問36"],
    ("r5", "Q36"): ["問題36", "問36"],
    ("r6", "Q36"): ["問題36", "問36"],
    ("r7", "Q36"): ["問題36", "問36"],
    # 会社法
    ("r2", "Q37"): ["問題37", "問37"],
    ("r2", "Q38"): ["問題38", "問38"],
    ("r2", "Q39"): ["問題39", "問39"],
    ("r2", "Q40"): ["問題40", "問40"],
    ("r3", "Q37"): ["問題37", "問37"],
    ("r3", "Q38"): ["問題38", "問38"],
    ("r3", "Q39"): ["問題39", "問39"],
    ("r3", "Q40"): ["問題40", "問40"],
    ("r4", "Q37"): ["問題37", "問37"],
    ("r4", "Q38"): ["問題38", "問38"],
    ("r4", "Q39"): ["問題39", "問39"],
    ("r4", "Q40"): ["問題40", "問40"],
    ("r5", "Q37"): ["問題37", "問37"],
    ("r5", "Q38"): ["問題38", "問38"],
    ("r5", "Q39"): ["問題39", "問39"],
    ("r5", "Q40"): ["問題40", "問40"],
    ("r6", "Q37"): ["問題37", "問37"],
    ("r6", "Q38"): ["問題38", "問38"],
    ("r6", "Q39"): ["問題39", "問39"],
    ("r6", "Q40"): ["問題40", "問40"],
    ("r7", "Q37"): ["問題37", "問37"],
    ("r7", "Q38"): ["問題38", "問38"],
    ("r7", "Q39"): ["問題39", "問39"],
    ("r7", "Q40"): ["問題40", "問40"],
    # 地方自治法
    ("r2", "Q10"): ["問題10", "問10"],
    ("r2", "Q22"): ["問題22", "問22"],
    ("r2", "Q23"): ["問題23", "問23"],
    ("r2", "Q24"): ["問題24", "問24"],
    ("r3", "Q22"): ["問題22", "問22"],
    ("r3", "Q24"): ["問題24", "問24"],
    ("r4", "Q09"): ["問題9", "問9"],
    ("r4", "Q22"): ["問題22", "問22"],
    ("r4", "Q23"): ["問題23", "問23"],
    ("r4", "Q24"): ["問題24", "問24"],
    ("r5", "Q22"): ["問題22", "問22"],
    ("r5", "Q23"): ["問題23", "問23"],
    ("r5", "Q24"): ["問題24", "問24"],
    ("r6", "Q22"): ["問題22", "問22"],
    ("r6", "Q23"): ["問題23", "問23"],
    ("r6", "Q24"): ["問題24", "問24"],
    ("r7", "Q22"): ["問題22", "問22"],
    ("r7", "Q23"): ["問題23", "問23"],
    # 行政代執行法
    ("r5", "Q17"): ["問題17", "問17"],
    ("r5", "Q26"): ["問題26", "問26"],
    # 国家行政組織法
    ("r4", "Q25"): ["問題25", "問25"],
}

# ─── 各法の (year, q_id, article_key) マッピング ─────────────────────────
# gen_new_laws_highlights.py から再定義
LAW_QUESTIONS: dict[str, list[tuple]] = {
    "commercial_code": [
        ("r2","Q36","577"),
        ("r3","Q36","501"), ("r3","Q36","502"),
        ("r4","Q36","17"),  ("r4","Q36","18"),  ("r4","Q36","18の2"),
        ("r5","Q36","504"), ("r5","Q36","509"), ("r5","Q36","510"),
        ("r6","Q36","535"), ("r6","Q36","536"), ("r6","Q36","539"),
        ("r7","Q36","529"), ("r7","Q36","530"), ("r7","Q36","531"),
        ("r7","Q36","532"), ("r7","Q36","533"),
    ],
    "company_act": [
        ("r2","Q37","25"),  ("r2","Q37","30"),  ("r2","Q37","33"),
        ("r2","Q37","52"),  ("r2","Q37","103"),
        ("r2","Q38","107"), ("r2","Q38","108"), ("r2","Q38","155"),
        ("r2","Q38","156"),
        ("r2","Q39","124"), ("r2","Q39","310"), ("r2","Q39","312"),
        ("r2","Q40","2"),   ("r2","Q40","108"), ("r2","Q40","113"),
        ("r2","Q40","299"), ("r2","Q40","327"),
        ("r3","Q37","52"),  ("r3","Q37","53"),  ("r3","Q37","55"),
        ("r3","Q38","146"), ("r3","Q38","147"), ("r3","Q38","148"),
        ("r3","Q39","327の2"), ("r3","Q39","335"), ("r3","Q39","400"),
        ("r3","Q40","445"), ("r3","Q40","453"), ("r3","Q40","454"),
        ("r3","Q40","461"),
        ("r4","Q37","37"),  ("r4","Q37","98"),  ("r4","Q37","113"),
        ("r4","Q38","179"), ("r4","Q38","179の3"), ("r4","Q38","179の7"),
        ("r4","Q38","179の8"),
        ("r4","Q39","296"), ("r4","Q39","303"), ("r4","Q39","306"),
        ("r4","Q39","314"),
        ("r4","Q40","326"), ("r4","Q40","329"), ("r4","Q40","333"),
        ("r4","Q40","374"),
        ("r5","Q37","38"),  ("r5","Q37","88"),
        ("r5","Q38","108"),
        ("r5","Q39","423"), ("r5","Q39","424"), ("r5","Q39","428"),
        ("r5","Q40","329"), ("r5","Q40","333"), ("r5","Q40","337"),
        ("r5","Q40","396"), ("r5","Q40","397"),
        ("r6","Q37","105"), ("r6","Q37","308"), ("r6","Q37","341"),
        ("r6","Q37","424"),
        ("r6","Q38","361"), ("r6","Q38","399の2"),
        ("r6","Q39","767"), ("r6","Q39","768"), ("r6","Q39","769"),
        ("r6","Q39","806"),
        ("r6","Q40","831"), ("r6","Q40","834"), ("r6","Q40","839"),
        ("r6","Q40","847"), ("r6","Q40","854"),
        ("r7","Q37","25"),  ("r7","Q37","26"),  ("r7","Q37","36"),
        ("r7","Q37","87"),
        ("r7","Q38","362"), ("r7","Q38","365"), ("r7","Q38","368"),
        ("r7","Q38","369"), ("r7","Q38","376"),
        ("r7","Q39","327"), ("r7","Q39","383"), ("r7","Q39","389"),
        ("r7","Q39","390"), ("r7","Q39","391"),
        ("r7","Q40","128"), ("r7","Q40","133"), ("r7","Q40","214"),
        ("r7","Q40","221"),
    ],
    "local_autonomy": [
        ("r2","Q10","234"),
        ("r2","Q22","10"),
        ("r2","Q23","2"),
        ("r2","Q24","242の2"),
        ("r3","Q22","244"),   ("r3","Q22","244の2"),
        ("r3","Q24","176"),   ("r3","Q24","178"),   ("r3","Q24","179"),
        ("r4","Q09","234"),
        ("r4","Q22","14"),
        ("r4","Q23","242"),   ("r4","Q23","242の2"),
        ("r4","Q24","2"),
        ("r5","Q22","5"),     ("r5","Q22","7"),     ("r5","Q22","8"),
        ("r5","Q23","74"),    ("r5","Q23","76"),
        ("r5","Q24","252の2"), ("r5","Q24","252の2の2"), ("r5","Q24","252の7"),
        ("r6","Q22","2"),
        ("r6","Q23","242"),   ("r6","Q23","242の2"),
        ("r6","Q24","14"),    ("r6","Q24","15"),
        ("r7","Q22","14"),
        ("r7","Q23","176"),   ("r7","Q23","178"),   ("r7","Q23","179"),
        ("r7","Q23","180"),
    ],
    "admin_enforcement": [
        ("r5","Q17","2"), ("r5","Q17","3"),
        ("r5","Q26","1"), ("r5","Q26","2"),
    ],
    "national_admin_org": [
        ("r4","Q25","1"), ("r4","Q25","3"), ("r4","Q25","5"),
    ],
}


def load_exam_pages() -> dict[str, list[dict]]:
    with open(EXAM_FILE, encoding="utf-8") as f:
        return json.load(f)


def get_question_text(exam_pages: dict, year_lower: str, q_id: str) -> str:
    """指定の年度・問題番号に対応するページ群のテキストを結合して返す。"""
    keywords = Q_KEYWORDS.get((year_lower, q_id), [])
    pages = exam_pages.get(year_lower, [])

    # キーワードを含むページを探す
    matched_pages = []
    for p in pages:
        if any(kw in p["text"] for kw in keywords):
            matched_pages.append(p["page"])

    if not matched_pages:
        return ""

    # 最初のマッチページとその次ページも含める（問題が2ページにまたがる場合）
    first_page = matched_pages[0]
    result = []
    for p in pages:
        if p["page"] in (first_page, first_page + 1, first_page + 2):
            result.append(p["text"])

    return "\n".join(result)


def normalize(s: str) -> str:
    """全角→半角スペース、改行→スペースで正規化。"""
    s = s.replace("\u3000", " ").replace("\n", "")
    return s


def normalize_for_match(s: str) -> tuple[str, list[int]]:
    """
    マッチング用に正規化した文字列と、元テキストへの位置マップを返す。
    - 空白・改行を除去（位置はスキップ）
    - 敬語→口語変換（又は→または 等）はすべての変換後文字が変換前の先頭位置を指す
    返値: (normalized_str, pos_map)
      pos_map[i] = normalized[i] が元テキストのどの位置に対応するか
    """
    result: list[str] = []
    pos_map: list[int] = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        # 空白系はスキップ
        if c in (' ', '\n', '\u3000', '\r', '\t'):
            i += 1
            continue
        # formal→informal 変換を試みる
        replaced = False
        for formal, informal in FORMAL_TO_INFORMAL:
            if s[i:i + len(formal)] == formal:
                for ch in informal:
                    result.append(ch)
                    pos_map.append(i)  # 変換後の各文字 → formal の先頭位置
                i += len(formal)
                replaced = True
                break
        if not replaced:
            result.append(c)
            pos_map.append(i)
            i += 1
    return ''.join(result), pos_map


def extract_phrases(article_text: str, exam_text: str, min_len: int = MIN_LEN) -> list[str]:
    """
    article_text のサブストリングで exam_text に出現するものを抽出。

    ① 正規化マッチング（又は→または 等、空白除去）で最長一致をグリーディに探索
    ② 一致区間を元テキスト位置にマップし、元テキストから phrase を切り出す
    """
    art_norm, art_pos_map = normalize_for_match(article_text)
    exam_norm, _          = normalize_for_match(exam_text)
    n = len(art_norm)

    intervals: list[tuple[int, int]] = []  # (start, end) in art_norm
    pos = 0
    while pos <= n - min_len:
        lo, hi, best = min_len, n - pos, 0
        while lo <= hi:
            mid = (lo + hi) // 2
            if art_norm[pos:pos + mid] in exam_norm:
                best = mid
                lo = mid + 1
            else:
                hi = mid - 1

        if best >= min_len:
            intervals.append((pos, pos + best))
            pos += best
        else:
            pos += 1

    if not intervals:
        return []

    # art_norm の区間 [ns, ne) を元テキストの区間に変換して切り出す
    result = []
    for ns, ne in intervals[:MAX_PHRASES]:
        orig_start = art_pos_map[ns]
        # ne-1 が指す元テキスト位置 + その formal 語の長さ分だけ含める
        orig_end_approx = art_pos_map[ne - 1]
        # formal 語の長さを特定（変換前の単語を復元）
        for formal, informal in FORMAL_TO_INFORMAL:
            if article_text[orig_end_approx:orig_end_approx + len(formal)] in \
               [f for f, _ in FORMAL_TO_INFORMAL]:
                orig_end_approx += len(formal)
                break
        else:
            orig_end_approx += 1  # 通常の1文字

        phrase = article_text[orig_start:orig_end_approx].strip()
        if len(phrase) >= min_len:
            result.append(phrase)
    return result


def split_sentences_ja(text: str) -> list[str]:
    """
    日本語法令テキストを文単位に分割する。
    括弧（）の深さを追跡し、括弧の外の「。」でのみ分割する。
    """
    sentences: list[str] = []
    buf: list[str] = []
    depth = 0
    for ch in text:
        if ch in ('（', '('):
            depth += 1
            buf.append(ch)
        elif ch in ('）', ')'):
            depth = max(0, depth - 1)
            buf.append(ch)
        elif ch == '。' and depth == 0:
            buf.append(ch)
            sentences.append(''.join(buf))
            buf = []
        else:
            buf.append(ch)
    if buf:
        rest = ''.join(buf).strip()
        if rest:
            sentences.append(rest)
    return sentences


_LIST_ITEM_RE = re.compile(
    r'^\u3000+'   # 行頭の全角スペース（インデント）
    r'(?:'
    r'[一二三四五六七八九十百千]'   # 漢数字列挙
    r'|[イロハニホヘトチリヌルヲワカヨタレソツネナラム]'  # カタカナ列挙
    r'|（[一二三四五六七八九十イロハ]）'  # （一）（イ）形式
    r')\u3000'
)


def fallback_phrases(article_text: str, min_len: int = MIN_LEN) -> list[str]:
    """
    自動抽出が0件の場合に使うフォールバック。
    \n で行分割し、列挙項目行（　一　/ 　イ　等）をスキップして
    本文段落行のみを返す。元テキストを保持するためフロントエンドのハイライトと整合する。
    """
    phrases = []
    for raw_line in article_text.split('\n'):
        # strip 前の行で列挙項目判定（\u3000インデント除去前に確認）
        if _LIST_ITEM_RE.match(raw_line):
            continue
        line = raw_line.strip()
        if not line or len(line) < min_len:
            continue
        phrases.append(line)
    return phrases[:MAX_PHRASES]


def process_law(law_id: str, exam_pages: dict) -> None:
    # 法律テキストを読み込む
    law_path = os.path.join(LAWS_DIR, f"{law_id}.json")
    with open(law_path, encoding="utf-8") as f:
        law_data = json.load(f)
    articles_data: dict = law_data.get("articles", {})

    # ハイライト JSON を読み込む
    hl_path = os.path.join(HL_DIR, f"r2_r7_{law_id}.json")
    with open(hl_path, encoding="utf-8") as f:
        hl_data = json.load(f)

    # article_key → [(year, q_id), ...] のマッピングを構築
    art_to_questions: dict[str, list[tuple]] = {}
    for year, q_id, art_key in LAW_QUESTIONS.get(law_id, []):
        art_to_questions.setdefault(art_key, []).append((year, q_id))

    total_phrases = 0
    for art_key, art_hl in hl_data.get("articles", {}).items():
        # この条文の全関連試験問題テキストを結合
        combined_exam_text = ""
        for year, q_id in art_to_questions.get(art_key, []):
            q_text = get_question_text(exam_pages, year, q_id)
            combined_exam_text += "\n" + q_text

        if not combined_exam_text.strip():
            continue

        # 条文テキストを取得
        art_info = articles_data.get(art_key, {})
        art_text = art_info.get("text", "")
        if not art_text:
            continue

        # フレーズ抽出（正規化マッチング）
        phrases = extract_phrases(art_text, combined_exam_text)
        # 0件の場合は段落フォールバック
        if not phrases:
            phrases = fallback_phrases(art_text)
        art_hl["phrases"] = phrases
        total_phrases += len(phrases)

    # 書き出し
    with open(hl_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(hl_data, f, ensure_ascii=False, indent=2)

    # data/highlights にもコピー
    data_hl_path = os.path.join(SCRIPT_DIR, "highlights", f"r2_r7_{law_id}.json")
    os.makedirs(os.path.dirname(data_hl_path), exist_ok=True)
    shutil.copy(hl_path, data_hl_path)

    n_arts = sum(1 for v in hl_data["articles"].values() if v.get("phrases"))
    print(f"[OK] {law_id}: {n_arts} 条文に phrases 追加（計 {total_phrases} フレーズ）")
    # サンプル表示
    for k, v in hl_data["articles"].items():
        if v.get("phrases"):
            print(f"  第{k}条: {v['phrases'][:2]}")


def main():
    exam_pages = load_exam_pages()
    for law_id in ["commercial_code", "company_act", "local_autonomy",
                   "admin_enforcement", "national_admin_org"]:
        print(f"\n=== {law_id} ===")
        process_law(law_id, exam_pages)


if __name__ == "__main__":
    main()

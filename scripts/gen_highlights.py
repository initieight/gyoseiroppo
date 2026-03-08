"""
e-Gov 条文 + 過去問テキストのフレーズマッチングで
public/highlights/r2_r7_{lawId}.json を生成するスクリプト

アプローチ:
  問題タイトルに法律名が明記されている問題を特定し、
  その問題文と条文テキストをスライディングウィンドウで照合する。

Usage (プロジェクトルートから):
    python scripts/gen_highlights.py
"""

import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, ".."))
LAWS_DIR    = os.path.join(PROJECT_DIR, "public", "laws")
HL_DIR      = os.path.join(PROJECT_DIR, "public", "highlights")
EXAM_PAGES  = os.path.join(PROJECT_DIR, "data", "all_exam_pages.json")

YEARS = ["r2", "r3", "r4", "r5", "r6", "r7"]
YEAR_LABEL = {y: y.upper() for y in YEARS}

# 各法律を特定するキーワード（問題タイトルまたは問題文に含まれる表現）
LAW_KEYWORDS: dict[str, list[str]] = {
    "constitution":     ["憲法"],
    "admin_appeal":     ["行政不服審査法"],
    "admin_litigation": ["行政事件訴訟法"],
    "state_liability":  ["国家賠償法"],
    # 民法はキーワードが広範なため問題番号範囲で制御（LAW_Q_RANGEを使用）
    "civil_code":       ["民法"],
}

# キーワードの代わりに問題番号範囲で抽出する法律
# ページ先頭の問題番号が [min, max] に収まるページのみ採用
LAW_Q_RANGE: dict[str, tuple[int, int]] = {
    "civil_code": (27, 35),
}

# 問題テキストから条文番号を直接検出するパターン
# {lawId: [regex_pattern, ...]}  group(1) が条文番号（アラビア数字+の連番）
LAW_ARTICLE_PATTERNS: dict[str, list[str]] = {
    "constitution":     [r"憲法(?:第)?(\d+(?:の\d+)?)条"],
    "admin_appeal":     [r"行政不服審査法(?:第)?(\d+(?:の\d+)?)条",
                         r"同法(?:第)?(\d+(?:の\d+)?)条"],
    "admin_litigation": [r"行政事件訴訟法(?:第)?(\d+(?:の\d+)?)条"],
    "state_liability":  [r"国家賠償法(\d+(?:の\d+)?)条",
                         r"国賠法(\d+(?:の\d+)?)条"],
    "civil_code":       [r"民法(?:第)?(\d+(?:の\d+)?)条"],
}

# スライディングウィンドウサイズ
SLIDE_WIN = 12
# 1条文につき最低これ以上のウィンドウがヒットしないと採用しない（誤検出抑制）
MIN_HITS_PER_ARTICLE = 2
# 法律別に閾値を上書きできる
LAW_MIN_HITS: dict[str, int] = {
    "civil_code": 6,  # 民法は条文数が多く誤検出が多いため高めに設定
}


def load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def clean(text: str) -> str:
    """照合用にスペース・記号を除去する。"""
    return re.sub(r"[\s\u3000　\n\r\t。、「」『』（）()【】・＊＊]", "", text)


def extract_by_q_range(pages: list[dict], q_min: int, q_max: int) -> str:
    """問題番号範囲でページを抽出する。"""
    collected: list[str] = []
    for p in pages:
        nums = [int(n) for n in re.findall(r"問題(\d+)", p["text"])]
        if nums and q_min <= nums[0] <= q_max:
            collected.append(p["text"])
    return "\n".join(collected)


def extract_law_pages(pages: list[dict], keywords: list[str]) -> str:
    """
    問題テキストのうち、keywords のいずれかを含むページを結合して返す。
    問題タイトル行（「問題NN 〜」）にキーワードが含まれていなくても、
    本文中に含まれていれば採用する（但し隣接ページの誤爆を防ぐため
    問題の先頭ページのみ基点とする）。
    """
    collected: list[str] = []
    i = 0
    while i < len(pages):
        text = pages[i]["text"]
        if any(kw in text for kw in keywords):
            collected.append(text)
            # 次のページにも同じ問題が続く可能性があるので確認
            if i + 1 < len(pages):
                next_text = pages[i + 1]["text"]
                # 次ページが新しい問題タイトルで別の法律なら止める
                next_nums = re.findall(r"問題(\d+)", next_text)
                cur_nums  = re.findall(r"問題(\d+)", text)
                if (next_nums and cur_nums and
                        int(next_nums[0]) == int(cur_nums[-1]) + 1 and
                        not any(kw in next_text for kw in keywords)):
                    pass  # 次ページは別の問題
                elif any(kw in next_text for kw in keywords):
                    collected.append(next_text)
        i += 1
    return "\n".join(collected)


def sliding_windows(text: str, win: int) -> list[str]:
    """スライディングウィンドウでフレーズを生成する。"""
    c = clean(text)
    return [c[i:i+win] for i in range(0, len(c) - win + 1, 2)]


def find_matching_phrase(article_text: str, q_clean: str, min_hits: int = MIN_HITS_PER_ARTICLE) -> list[str]:
    """
    スライディングウィンドウで article_text のフレーズが q_clean に
    何個含まれるかをカウントし、MIN_HITS_PER_ARTICLE 以上なら
    代表フレーズを返す。
    """
    windows = sliding_windows(article_text, SLIDE_WIN)
    hit_count = sum(1 for w in windows if w in q_clean)

    if hit_count < min_hits:
        return []

    # 代表フレーズ: ヒットした窓を含む文を返す
    phrases: list[str] = []
    for sent in re.split(r"[。\n]", article_text):
        sent = sent.strip()
        if len(sent) < 10:
            continue
        if any(w in q_clean for w in sliding_windows(sent, SLIDE_WIN)):
            phrases.append(sent[:100])
            if len(phrases) >= 2:
                break
    return phrases


def detect_articles_by_number(q_text: str, law_id: str, valid_keys: set[str]) -> set[str]:
    """問題テキストから '法律名X条' の明示パターンで条文番号を抽出する。"""
    found: set[str] = set()
    patterns = LAW_ARTICLE_PATTERNS.get(law_id, [])
    for pat in patterns:
        for m in re.finditer(pat, q_text):
            key = m.group(1)
            if key in valid_keys:
                found.add(key)
    return found


def build_highlights(law_id: str, keywords: list[str], exam_pages: dict) -> dict:
    law_path = os.path.join(LAWS_DIR, f"{law_id}.json")
    if not os.path.exists(law_path):
        print(f"  [SKIP] {law_path} が見つかりません")
        return {}

    law_data = load_json(law_path)
    articles = law_data.get("articles", {})
    valid_keys = set(articles.keys())

    result: dict[str, dict] = {}

    for year_key in YEARS:
        year_label = YEAR_LABEL[year_key]
        pages = exam_pages.get(year_key, [])
        q_range = LAW_Q_RANGE.get(law_id)
        if q_range:
            q_text = extract_by_q_range(pages, q_range[0], q_range[1])
        else:
            q_text = extract_law_pages(pages, keywords)

        if not q_text:
            print(f"    {year_label}: 問題テキストが見つからない（スキップ）")
            continue

        q_clean = clean(q_text)
        year_hits: set[str] = set()
        min_hits = LAW_MIN_HITS.get(law_id, MIN_HITS_PER_ARTICLE)

        # ① 明示的な条文番号検出
        numbered = detect_articles_by_number(q_text, law_id, valid_keys)
        year_hits |= numbered

        # ② フレーズマッチング
        for art_key, art_data in articles.items():
            if art_key in year_hits:
                continue  # 既検出
            art_text = art_data.get("text", "")
            phrases = find_matching_phrase(art_text, q_clean, min_hits)
            if phrases:
                year_hits.add(art_key)

        # 結果に反映
        for art_key in year_hits:
            art_data = articles[art_key]
            art_text = art_data.get("text", "")
            phrases = find_matching_phrase(art_text, q_clean, min_hits)
            if not phrases:
                # 番号検出のみでフレーズなし → 代表フレーズを先頭文から取る
                first_sent = re.split(r"[。\n]", art_text)[0].strip()
                phrases = [first_sent[:100]] if first_sent else []

            if art_key not in result:
                result[art_key] = {"count": 0, "years": [], "phrases": []}
            result[art_key]["count"] += 1
            result[art_key]["years"].append(year_label)
            for ph in phrases:
                if ph not in result[art_key]["phrases"]:
                    result[art_key]["phrases"].append(ph)

        numbered_str = f" (番号検出:{len(numbered)})" if numbered else ""
        print(f"    {year_label}: {len(year_hits)} 条文ヒット{numbered_str}")

    return result


def main():
    os.makedirs(HL_DIR, exist_ok=True)

    print(f"試験ページ読み込み中: {EXAM_PAGES}")
    exam_pages = load_json(EXAM_PAGES)

    for law_id, keywords in LAW_KEYWORDS.items():
        print(f"\n{'─'*60}")
        print(f"▶ {law_id}  (keywords: {keywords})")
        print(f"{'─'*60}")

        articles = build_highlights(law_id, keywords, exam_pages)

        output = {
            "lawId": law_id,
            "range": ["R2", "R7"],
            "articles": articles,
        }

        out_path = os.path.join(HL_DIR, f"r2_r7_{law_id}.json")
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"  → {len(articles)} 条文が1回以上ヒット → {out_path}")

    print(f"\n{'='*60}")
    print("完了")


if __name__ == "__main__":
    main()

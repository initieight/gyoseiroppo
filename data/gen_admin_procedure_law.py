#!/usr/bin/env python3
"""
行政手続法 (H05HO088) の全条文を e-Gov 法令 API から取得し、
public/laws/admin_procedure.json を生成する。

Usage (プロジェクトルートから):
    python data/gen_admin_procedure_law.py

依存: Python 3.8+ 標準ライブラリのみ
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

# ──────────────────────────────────────────────────────────────────
# 設定
# ──────────────────────────────────────────────────────────────────

LAW_ID = "H05HO088"  # 平成5年法律第88号

# e-Gov 法令 API v1 エンドポイント（複数用意して順に試す）
API_URLS = [
    f"https://laws.e-gov.go.jp/api/1/lawdata/{LAW_ID}",
    f"https://elaws.e-gov.go.jp/api/1/lawdata/{LAW_ID}",
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.normpath(
    os.path.join(SCRIPT_DIR, "..", "public", "laws", "admin_procedure.json")
)

# ──────────────────────────────────────────────────────────────────
# テキスト抽出ユーティリティ
# ──────────────────────────────────────────────────────────────────

# 半角数字 → 全角数字変換テーブル（ParagraphNum 対応）
_H2F = str.maketrans("0123456789", "０１２３４５６７８９")


def to_fullwidth(s: str) -> str:
    """半角 ASCII 数字を全角数字に変換する。"""
    return s.translate(_H2F)


def get_elem_text(elem) -> str:
    """
    要素内の全テキストを再帰的に結合して返す。
    Sentence / Column 等のネストを透過的に扱う。
    """
    if elem is None:
        return ""
    parts: list[str] = []
    if elem.text:
        parts.append(elem.text)
    for child in elem:
        parts.append(get_elem_text(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts).strip()


def get_sentence_text(sent_elem) -> str:
    """
    ParagraphSentence / ItemSentence / Subitem*Sentence からテキストを取得する。

    Column 子要素がある場合（二列レイアウト）は全角スペースで結合する。
    例: <Column>次のいずれかに該当するとき</Column><Column>聴聞</Column>
        → "次のいずれかに該当するとき　聴聞"
    """
    if sent_elem is None:
        return ""
    cols = sent_elem.findall("Column")
    if cols:
        return "　".join(get_elem_text(c) for c in cols if get_elem_text(c))
    return get_elem_text(sent_elem)


def format_items(parent_elem) -> list[str]:
    """
    parent_elem 直下の Item 要素を処理してテキスト行リストを返す。
    各 Item 内の Subitem1 / Subitem2 ... も再帰的に処理する。
    インデント: Item=全角1個、Subitem1=全角2個、Subitem2=全角3個 ...
    """
    lines: list[str] = []
    for item in parent_elem.findall("Item"):
        title_el = item.find("ItemTitle")
        title = (title_el.text or "").strip() if title_el is not None else ""
        sent = get_sentence_text(item.find("ItemSentence"))
        # 末尾の余分なスペースを除去してから追加
        lines.append(f"　{title}　{sent}".rstrip())
        # Subitem 再帰処理
        lines.extend(_format_subitems(item, level=1, indent=2))
    return lines


def _format_subitems(parent_elem, level: int, indent: int) -> list[str]:
    """
    Subitem{level} 要素を再帰的に処理する。
    level: 現在のサブ項レベル (1 = イロハ, 2 = さらに深い階層)
    indent: 全角スペースのインデント数
    """
    lines: list[str] = []
    tag       = f"Subitem{level}"
    title_tag = f"Subitem{level}Title"
    sent_tag  = f"Subitem{level}Sentence"
    prefix    = "　" * indent

    for sub in parent_elem.findall(tag):
        title_el = sub.find(title_tag)
        title = (title_el.text or "").strip() if title_el is not None else ""
        sent = get_sentence_text(sub.find(sent_tag))
        lines.append(f"{prefix}{title}　{sent}".rstrip())
        # 次の階層（Subitem2, Subitem3, ...）
        lines.extend(_format_subitems(sub, level + 1, indent + 1))

    return lines


# ──────────────────────────────────────────────────────────────────
# 条文抽出
# ──────────────────────────────────────────────────────────────────

def num_attr_to_key(num_attr: str) -> str:
    """
    Article の Num 属性値を JSON キーに変換する。
    "1"    → "1"
    "36"   → "36"
    "36_2" → "36の2"   （法令XML のサブ条番号形式）
    "36_2_1" → "36の2の1"（さらに深い場合）
    """
    return re.sub(r"_(\d+)", lambda m: f"の{m.group(1)}", num_attr)


def extract_article(article_elem) -> "tuple[str, dict] | None":
    """
    Article 要素を解析して (key, {title, caption, text}) を返す。
    key は "1", "36", "36の2" など。
    """
    num_attr = article_elem.get("Num", "").strip()
    if not num_attr:
        return None

    key = num_attr_to_key(num_attr)

    # タイトル・見出し
    title_el   = article_elem.find("ArticleTitle")
    caption_el = article_elem.find("ArticleCaption")
    title   = (title_el.text   or "").strip() if title_el   is not None else f"第{key}条"
    caption = (caption_el.text or "").strip() if caption_el is not None else ""

    # 全段落を処理してテキストを構築
    text_lines: list[str] = []

    for para in article_elem.findall("Paragraph"):
        num_el   = para.find("ParagraphNum")
        num_text = (num_el.text or "").strip() if num_el is not None else ""

        # 段本文
        sent = get_sentence_text(para.find("ParagraphSentence"))

        if num_text:
            # 2項以降: "２　本文"（全角数字に正規化）
            text_lines.append(f"{to_fullwidth(num_text)}　{sent}")
        else:
            # 1項: 本文のみ
            text_lines.append(sent)

        # 号 (Item) と サブ項目
        text_lines.extend(format_items(para))

    return key, {
        "title":   title,
        "caption": caption,
        "text":    "\n".join(text_lines),
    }


# ──────────────────────────────────────────────────────────────────
# ソートキー
# ──────────────────────────────────────────────────────────────────

def sort_key(k: str) -> float:
    """
    "1", "36", "36の2", "36の2の1" などを数値ソートキーに変換する。
    """
    m = re.match(r"^(\d+)(?:の(\d+)(?:の(\d+))?)?$", k)
    if not m:
        return 9999.0
    base = int(m.group(1))
    sub1 = int(m.group(2)) if m.group(2) else 0
    sub2 = int(m.group(3)) if m.group(3) else 0
    return base + sub1 * 0.1 + sub2 * 0.01


# ──────────────────────────────────────────────────────────────────
# API 取得
# ──────────────────────────────────────────────────────────────────

def fetch_xml(url: str) -> str:
    """指定 URL から XML テキストを取得する。"""
    print(f"  GET {url}")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; gen_law_script/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        # エンコーディングを自動判定（UTF-8 が標準）
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            return raw.decode("shift_jis", errors="replace")


def try_fetch_xml(urls: list[str]) -> str:
    """複数の URL を順に試し、最初に成功したレスポンスを返す。"""
    last_err: "Exception | None" = None
    for url in urls:
        try:
            return fetch_xml(url)
        except Exception as e:
            print(f"  [WARN] {type(e).__name__}: {e}")
            last_err = e
    raise RuntimeError(f"全 URL で取得失敗。最後のエラー: {last_err}")


# ──────────────────────────────────────────────────────────────────
# XML パース
# ──────────────────────────────────────────────────────────────────

def parse_law_xml(xml_text: str) -> "dict[str, dict]":
    """
    e-Gov API レスポンス XML をパースして
    {article_key: {title, caption, text}} を返す。

    対応する構造:
      DataRoot > ApplData > LawFullText > Law > LawBody > MainProvision > ... > Article
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        raise ValueError(f"XML パースエラー: {e}") from e

    # Result コードの確認（0 = 成功）
    result_code_el = root.find(".//Result/Code")
    if result_code_el is not None and result_code_el.text and result_code_el.text.strip() != "0":
        msg_el = root.find(".//Result/Message")
        msg = (msg_el.text or "").strip() if msg_el is not None else ""
        raise ValueError(f"API エラーコード {result_code_el.text}: {msg}")

    # Law 要素を探す
    law_elem = root.find(".//Law")
    if law_elem is None:
        if root.tag == "Law":
            law_elem = root
        else:
            raise ValueError(
                f"Law 要素が見つかりません。ルートタグ: {root.tag}, "
                f"子要素: {[c.tag for c in list(root)[:8]]}"
            )

    # MainProvision 内の全 Article を抽出
    # （SupplProvision の附則条文は除外）
    articles: "dict[str, dict]" = {}
    main_provision = law_elem.find(".//MainProvision")
    if main_provision is None:
        raise ValueError("MainProvision 要素が見つかりません。")

    for article_elem in main_provision.findall(".//Article"):
        result = extract_article(article_elem)
        if result is None:
            continue
        key, data = result
        articles[key] = data

    return articles


# ──────────────────────────────────────────────────────────────────
# メイン
# ──────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("行政手続法 全条文 JSON 生成スクリプト")
    print(f"対象: {LAW_ID}（平成5年法律第88号）")
    print(f"出力: {OUTPUT_PATH}")
    print("=" * 60)

    # ── [1/3] XML 取得 ────────────────────────────────────────────
    print("\n[1/3] e-Gov 法令 API から XML を取得中...")
    try:
        xml_text = try_fetch_xml(API_URLS)
        print("  → 取得成功")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        print("\n■ 手動で取得する場合:")
        print(f"  ブラウザで以下を開いて XML をファイルに保存してください:")
        print(f"  {API_URLS[0]}")
        sys.exit(1)

    # ── [2/3] XML パース ──────────────────────────────────────────
    print("\n[2/3] XML をパース中...")
    try:
        articles = parse_law_xml(xml_text)
    except Exception as e:
        print(f"\n[ERROR] {e}")
        # デバッグ用に XML の先頭を表示
        print("\nXML 先頭 500 文字:")
        print(xml_text[:500])
        sys.exit(1)

    print(f"  → 取得条文数: {len(articles)}")

    # 取得できた条番号を表示
    keys_sorted = sorted(articles.keys(), key=sort_key)
    print(f"  条番号一覧: {keys_sorted}")

    # 第1条〜第36条の取得状況を確認
    expected = set(str(n) for n in range(1, 37))
    present  = set(articles.keys())
    missing  = sorted(expected - present, key=lambda k: int(k))
    extra    = sorted(present - expected - {"36の2", "36の3"}, key=sort_key)

    if missing:
        print(f"  [WARN] 第1〜36条のうち未取得: {missing}")
        print("         （法改正による削除条文か、API の返却漏れの可能性があります）")
    if extra:
        print(f"  [INFO] 範囲外のキー（附則等）: {extra} → JSON に含めます")

    # ── [3/3] JSON 出力 ───────────────────────────────────────────
    print("\n[3/3] JSON を出力中...")

    sorted_articles = dict(sorted(articles.items(), key=lambda x: sort_key(x[0])))

    output = {
        "lawId": "admin_procedure",
        "articles": sorted_articles,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  → 書き出し完了: {len(sorted_articles)} 条文")
    print(f"\n[完了] {OUTPUT_PATH}")

    # ── 後処理の注意事項 ─────────────────────────────────────────
    print("\n" + "=" * 60)
    print("■ 後処理チェックリスト")
    print("=" * 60)

    # キー "36の2" が新 JSON に存在するか確認
    if "36の2" in sorted_articles:
        print("\n[要確認] 第三十六条の二のキーが '36の2' に変わりました。")
        print("  旧 JSON では '36' がこの条文を指していた可能性があります。")

        hl_path = os.path.normpath(
            os.path.join(SCRIPT_DIR, "..", "public", "highlights", "r2_r7_admin_procedure.json")
        )
        if os.path.exists(hl_path):
            with open(hl_path, encoding="utf-8") as f:
                hl_data = json.load(f)
            hl_keys = set(hl_data.get("articles", {}).keys())

            if "36" in hl_keys and "36の2" not in hl_keys:
                print(f"\n  [!] {hl_path}")
                print("      articles.\"36\" のキーを \"36の2\" に変更してください。")
                print("      例 (PowerShell):")
                print("        python data/fix_highlights_key.py")
                print("      または手動で JSON を編集してください。")
            elif "36の2" in hl_keys:
                print("  highlights の '36の2' キーは既に正しい形式です。")
            else:
                print("  highlights に '36' も '36の2' も存在しません（未出題扱い）。")

    print("\n確認 URL:")
    print("  http://localhost:3003/law/admin_procedure     ← 全条文一覧")
    print("  http://localhost:3003/law/admin_procedure/1   ← 第一条")
    print("  http://localhost:3003/law/admin_procedure/36  ← 第三十六条")
    if "36の2" in sorted_articles:
        print("  http://localhost:3003/law/admin_procedure/36%E3%81%AE2  ← 第三十六条の二")


if __name__ == "__main__":
    main()

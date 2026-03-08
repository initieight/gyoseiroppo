#!/usr/bin/env python3
"""
e-Gov 法令 API から6法律の全条文を取得して public/laws/*.json を生成する。

対象:
  constitution       日本国憲法
  civil_code         民法
  admin_procedure    行政手続法
  admin_appeal       行政不服審査法（平成26年法律第68号）
  admin_litigation   行政事件訴訟法
  state_liability    国家賠償法

Usage (プロジェクトルートから):
    python data/gen_all_laws.py

    # 特定の法律だけ生成
    python data/gen_all_laws.py constitution admin_procedure

依存: Python 3.8+ 標準ライブラリのみ（requests 不要）
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

# ──────────────────────────────────────────────────────────────────
# 対象法律の定義
# ──────────────────────────────────────────────────────────────────
# egov_id: e-Gov 法令 API の法令番号文字列
#   フォーマット: {時代}{年2桁}{種別}{番号3桁}
#   時代: M=明治 T=大正 S=昭和 H=平成 R=令和
#   種別: HO=法律 KE=憲法 PO=政令 etc.
#
# fallback_search: egov_id で取得失敗した場合に法令一覧 API で
#   タイトル部分一致検索するキーワード（省略可）

LAWS: list[dict] = [
    {
        "lawId":   "constitution",
        "name":    "日本国憲法",
        "egov_id": "321CONSTITUTION",
    },
    {
        "lawId":   "civil_code",
        "name":    "民法",
        "egov_id": "129AC0000000089",   # 明治29年法律第89号
    },
    {
        "lawId":   "commercial_code",
        "name":    "商法",
        "egov_id": "132AC0000000048",   # 明治32年法律第48号
    },
    {
        "lawId":   "company_act",
        "name":    "会社法",
        "egov_id": "417AC0000000086",   # 平成17年法律第86号
    },
    {
        "lawId":   "admin_procedure",
        "name":    "行政手続法",
        "egov_id": "405AC0000000088",   # 平成5年法律第88号
    },
    {
        "lawId":   "admin_appeal",
        "name":    "行政不服審査法",
        "egov_id": "426AC0000000068",   # 平成26年法律第68号
    },
    {
        "lawId":   "admin_litigation",
        "name":    "行政事件訴訟法",
        "egov_id": "337AC0000000139",   # 昭和37年法律第139号
    },
    {
        "lawId":   "state_liability",
        "name":    "国家賠償法",
        "egov_id": "322AC0000000125",   # 昭和22年法律第125号
    },
    {
        "lawId":   "admin_enforcement",
        "name":    "行政代執行法",
        "egov_id": "323AC0000000043",   # 昭和23年法律第43号
    },
    {
        "lawId":   "national_admin_org",
        "name":    "国家行政組織法",
        "egov_id": "323AC0000000120",   # 昭和23年法律第120号
    },
    {
        "lawId":   "local_autonomy",
        "name":    "地方自治法",
        "egov_id": "322AC0000000067",   # 昭和22年法律第67号
    },
]

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "public", "laws"))

API_BASE     = "https://laws.e-gov.go.jp/api/1"
API_FALLBACK = "https://elaws.e-gov.go.jp/api/1"

# 法律によっては大きいので長めのタイムアウト（民法は数 MB）
TIMEOUT_SEC = 120

# ──────────────────────────────────────────────────────────────────
# テキスト抽出ユーティリティ
# ──────────────────────────────────────────────────────────────────

_H2F = str.maketrans("0123456789", "０１２３４５６７８９")


def to_fw(s: str) -> str:
    """半角 ASCII 数字を全角数字に変換（ParagraphNum 正規化用）。"""
    return s.translate(_H2F)


def get_elem_text(elem) -> str:
    """要素内の全テキストを再帰的に結合して返す。"""
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
    ParagraphSentence / ItemSentence / Subitem*Sentence からテキストを取得。
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
    parent_elem 直下の Item > Subitem1 > Subitem2 ... を
    インデント付きテキスト行リストに変換する。
    インデント: Item=全角1個, Subitem1=全角2個, Subitem2=全角3個 ...
    """
    lines: list[str] = []
    for item in parent_elem.findall("Item"):
        title_el = item.find("ItemTitle")
        title    = (title_el.text or "").strip() if title_el is not None else ""
        sent     = get_sentence_text(item.find("ItemSentence"))
        lines.append(f"　{title}　{sent}".rstrip())
        lines.extend(_fmt_subitems(item, level=1, indent=2))
    return lines


def _fmt_subitems(parent, level: int, indent: int) -> list[str]:
    """Subitem{level} 要素を再帰的に処理。"""
    lines: list[str] = []
    tag       = f"Subitem{level}"
    title_tag = f"Subitem{level}Title"
    sent_tag  = f"Subitem{level}Sentence"
    prefix    = "　" * indent
    for sub in parent.findall(tag):
        title_el = sub.find(title_tag)
        title    = (title_el.text or "").strip() if title_el is not None else ""
        sent     = get_sentence_text(sub.find(sent_tag))
        lines.append(f"{prefix}{title}　{sent}".rstrip())
        lines.extend(_fmt_subitems(sub, level + 1, indent + 1))
    return lines


# ──────────────────────────────────────────────────────────────────
# 条文抽出
# ──────────────────────────────────────────────────────────────────

def num_attr_to_key(num_attr: str) -> str:
    """
    Article の Num 属性値を JSON キーに変換する。
    "1"      → "1"
    "36_2"   → "36の2"   （法令XML のサブ条番号形式）
    "398_19" → "398の19"
    """
    return re.sub(r"_(\d+)", lambda m: f"の{m.group(1)}", num_attr)


def extract_article(article_elem) -> "tuple[str, dict] | None":
    """
    Article 要素を解析して (key, {title, caption, text}) を返す。
    本文が全く取れない Article はスキップ（None を返す）。
    ただし「削除」テキストは保持する。
    """
    num_attr = article_elem.get("Num", "").strip()
    if not num_attr:
        return None

    key = num_attr_to_key(num_attr)

    # タイトル・見出し（ArticleTitle は漢数字表記が入っている）
    title_el   = article_elem.find("ArticleTitle")
    caption_el = article_elem.find("ArticleCaption")
    title   = (title_el.text   or "").strip() if title_el   is not None else f"第{key}条"
    caption = (caption_el.text or "").strip() if caption_el is not None else ""

    # 全段落を処理してテキストを構築
    text_lines: list[str] = []
    for para in article_elem.findall("Paragraph"):
        num_el   = para.find("ParagraphNum")
        num_text = (num_el.text or "").strip() if num_el is not None else ""

        sent = get_sentence_text(para.find("ParagraphSentence"))

        if num_text:
            # 2項以降: "２　本文"（全角数字に正規化）
            text_lines.append(f"{to_fw(num_text)}　{sent}")
        else:
            text_lines.append(sent)

        # 号・サブ項目
        text_lines.extend(format_items(para))

    full_text = "\n".join(text_lines).strip()
    if not full_text and not title:
        return None  # 完全に空の Article はスキップ

    return key, {
        "title":   title,
        "caption": caption,
        "text":    full_text,
    }


# ──────────────────────────────────────────────────────────────────
# ソートキー
# ──────────────────────────────────────────────────────────────────

def sort_key(k: str) -> float:
    """
    "1", "36", "36の2", "398の19" などを数値ソートキーに変換。
    民法の大きなサブ番号（398の19 など）にも対応するため 0.001 スケーリング。
    """
    m = re.match(r"^(\d+)(?:の(\d+)(?:の(\d+))?)?$", k)
    if not m:
        return 9_999_999.0
    base = int(m.group(1))
    sub1 = int(m.group(2)) if m.group(2) else 0
    sub2 = int(m.group(3)) if m.group(3) else 0
    return base + sub1 * 0.001 + sub2 * 0.000001


# ──────────────────────────────────────────────────────────────────
# e-Gov API 取得
# ──────────────────────────────────────────────────────────────────

def _http_get(url: str, timeout: int = TIMEOUT_SEC) -> str:
    """HTTP GET して文字列を返す。失敗時は例外を発生させる。"""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (gen_all_laws/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            return raw.decode("shift_jis", errors="replace")


def fetch_egov_xml(egov_id: str) -> str:
    """
    e-Gov 法令 API から XML を取得する。
    主 URL → フォールバック URL の順に試す。
    """
    urls = [
        f"{API_BASE}/lawdata/{egov_id}",
        f"{API_FALLBACK}/lawdata/{egov_id}",
    ]
    last_err: Exception | None = None
    for url in urls:
        try:
            print(f"    GET {url}")
            return _http_get(url)
        except Exception as e:
            print(f"    [WARN] {type(e).__name__}: {e}")
            last_err = e
    raise RuntimeError(f"全 URL で取得失敗: {last_err}")


def search_egov_id(keyword: str, cat: str = "1") -> "str | None":
    """
    e-Gov 法令一覧 API でキーワード検索して最初にヒットした法令の egov_id を返す。
    cat: "1"=憲法, "2"=法律, "3"=政令 etc.
    """
    url = f"{API_BASE}/lawlists/{cat}"
    try:
        print(f"    法令一覧検索: GET {url} (keyword='{keyword}')")
        xml_text = _http_get(url, timeout=60)
        root = ET.fromstring(xml_text)
        for law_info in root.findall(".//LawInfo"):
            name_el = law_info.find("LawName")
            id_el   = law_info.find("LawId")
            if name_el is None or id_el is None:
                continue
            if keyword in (name_el.text or ""):
                found_id = (id_el.text or "").strip()
                print(f"    → 法令一覧ヒット: '{name_el.text}' id={found_id}")
                return found_id
    except Exception as e:
        print(f"    [WARN] 法令一覧検索失敗: {e}")
    return None


# ──────────────────────────────────────────────────────────────────
# XML パース
# ──────────────────────────────────────────────────────────────────

def parse_articles_from_xml(xml_text: str) -> "dict[str, dict]":
    """
    e-Gov API レスポンス XML をパースして {article_key: {title,caption,text}} を返す。

    対応する XML 構造:
      DataRoot > ApplData > LawFullText > Law > LawBody > MainProvision
    または
      Law > LawBody > MainProvision（直接 Law がルートの場合）
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        raise ValueError(f"XML パースエラー: {e}") from e

    # API エラーコード確認
    code_el = root.find(".//Result/Code")
    if code_el is not None and (code_el.text or "").strip() not in ("0", ""):
        msg_el = root.find(".//Result/Message")
        msg = (msg_el.text or "").strip() if msg_el is not None else ""
        raise ValueError(f"API エラー (Code={code_el.text}): {msg}")

    # Law 要素を探す
    law_elem = root.find(".//Law")
    if law_elem is None:
        if root.tag == "Law":
            law_elem = root
        else:
            raise ValueError(
                f"Law 要素が見つかりません。"
                f"ルートタグ={root.tag}, 子要素={[c.tag for c in list(root)[:6]]}"
            )

    # MainProvision 内の Article のみ対象（附則 SupplProvision は除外）
    main = law_elem.find(".//MainProvision")
    if main is None:
        # MainProvision がない場合（憲法など構造が異なる可能性）は全 Article を探す
        print("    [INFO] MainProvision 要素なし → 全 Article を検索します")
        search_root = law_elem
    else:
        search_root = main

    articles: dict[str, dict] = {}
    for article_elem in search_root.findall(".//Article"):
        result = extract_article(article_elem)
        if result is None:
            continue
        key, data = result
        articles[key] = data

    return articles


# ──────────────────────────────────────────────────────────────────
# 1法律の処理
# ──────────────────────────────────────────────────────────────────

def process_law(law_def: dict) -> bool:
    """
    1法律を取得・パース・JSON出力する。
    成功: True / 失敗: False
    """
    law_id   = law_def["lawId"]
    name     = law_def["name"]
    egov_id  = law_def.get("egov_id", "")
    fallback = law_def.get("fallback_search")
    fb_cat   = law_def.get("law_list_cat", "2")

    print(f"\n{'─'*60}")
    print(f"▶ {name}  (lawId={law_id}, egov_id={egov_id})")
    print(f"{'─'*60}")

    # ── XML 取得 ─────────────────────────────────────────────────
    xml_text: str | None = None
    used_id = egov_id

    # 1) 指定 egov_id で直接取得
    if egov_id:
        try:
            xml_text = fetch_egov_xml(egov_id)
        except Exception as e:
            print(f"  [WARN] egov_id={egov_id} で取得失敗: {e}")

    # 2) 失敗時かつ fallback_search があれば法令一覧から ID を探して再試行
    if xml_text is None and fallback:
        print(f"  → フォールバック検索: '{fallback}' (カテゴリ {fb_cat})")
        found_id = search_egov_id(fallback, fb_cat)
        if found_id and found_id != egov_id:
            used_id = found_id
            try:
                xml_text = fetch_egov_xml(found_id)
            except Exception as e:
                print(f"  [WARN] 検索ヒット ID={found_id} でも取得失敗: {e}")

    if xml_text is None:
        print(f"  [SKIP] {name} の XML 取得に失敗しました。スキップします。")
        return False

    print(f"  → XML 取得完了 ({len(xml_text):,} 文字, id={used_id})")

    # ── パース ──────────────────────────────────────────────────
    try:
        articles = parse_articles_from_xml(xml_text)
    except Exception as e:
        print(f"  [SKIP] {name} のパース失敗: {e}")
        # デバッグ用に先頭を表示
        print(f"  XML 先頭 300 文字:\n{xml_text[:300]}")
        return False

    if not articles:
        print(f"  [SKIP] {name}: 条文が1件も取得できませんでした。")
        return False

    # ── ソート & 統計 ─────────────────────────────────────────
    sorted_articles = dict(sorted(articles.items(), key=lambda x: sort_key(x[0])))
    keys = list(sorted_articles.keys())

    # 条番号の最大値（サブ条を除いた純粋な整数部分）
    max_base = max(
        (int(re.match(r"^(\d+)", k).group(1)) for k in keys if re.match(r"^\d", k)),
        default=0,
    )
    print(f"  articles={len(sorted_articles)}  max_base={max_base}")
    print(f"  条番号サンプル（先頭10）: {keys[:10]}")
    if len(keys) > 10:
        print(f"  条番号サンプル（末尾10）: {keys[-10:]}")

    # ── JSON 出力 ────────────────────────────────────────────────
    output = {
        "lawId":    law_id,
        "articles": sorted_articles,
    }
    out_path = os.path.join(OUTPUT_DIR, f"{law_id}.json")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  [OK] {out_path} ({len(sorted_articles)} 条文)")
    return True


# ──────────────────────────────────────────────────────────────────
# メイン
# ──────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("全法律 JSON 生成スクリプト")
    print(f"出力先: {OUTPUT_DIR}")
    print("=" * 60)

    # コマンドライン引数で対象 lawId を絞り込み
    target_ids: set[str] = set(sys.argv[1:])
    if target_ids:
        laws = [l for l in LAWS if l["lawId"] in target_ids]
        unknown = target_ids - {l["lawId"] for l in LAWS}
        if unknown:
            print(f"[WARN] 未知の lawId: {unknown}")
        print(f"対象を絞り込み: {[l['lawId'] for l in laws]}")
    else:
        laws = LAWS

    if not laws:
        print("[ERROR] 処理対象がありません。")
        sys.exit(1)

    results: dict[str, bool] = {}

    for i, law_def in enumerate(laws):
        results[law_def["lawId"]] = process_law(law_def)
        # サーバー負荷軽減のため待機（最後の法律は不要）
        if i < len(laws) - 1:
            time.sleep(1.0)

    # ── 結果サマリ ───────────────────────────────────────────────
    print(f"\n{'=' * 60}")
    print("結果サマリ")
    print("=" * 60)
    success = [lid for lid, ok in results.items() if ok]
    failed  = [lid for lid, ok in results.items() if not ok]

    for law_def in laws:
        lid  = law_def["lawId"]
        name = law_def["name"]
        mark = "✓" if results[lid] else "✗"
        if results[lid]:
            out_path = os.path.join(OUTPUT_DIR, f"{lid}.json")
            try:
                with open(out_path, encoding="utf-8") as f:
                    data = json.load(f)
                n = len(data.get("articles", {}))
                print(f"  {mark} {name:20s}  ({lid}.json)  {n} 条文")
            except Exception:
                print(f"  {mark} {name:20s}  ({lid}.json)")
        else:
            print(f"  {mark} {name:20s}  → スキップ")

    print()
    if failed:
        print(f"[!] 失敗した法律: {failed}")
        print("    → egov_id を確認するか、e-Gov サイトで手動取得してください。")
        print(f"    e-Gov 法令検索: https://laws.e-gov.go.jp/search/")

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()

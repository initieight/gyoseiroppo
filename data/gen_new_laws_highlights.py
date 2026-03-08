#!/usr/bin/env python3
"""
R2〜R7 行政書士試験過去問から
商法・会社法・地方自治法・行政代執行法・国家行政組織法
の出題ハイライトデータを生成する。

出力:
  data/highlights/r2_r7_{lawId}.json
  data/highlights/ranking_{lawId}.json
  public/highlights/{同上}

各法律の RAW データは (year, question_id, article_key) のリストで定義。
- question_id は重複排除の単位（同一問題で同一条文が複数肢に出ても1カウント）
- (year, question_id, article_key) でユニーク化 → count 集計
"""

import json, os, re, shutil

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_HL_DIR = os.path.join(SCRIPT_DIR, "highlights")
PUB_HL_DIR  = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "public", "highlights"))
os.makedirs(DATA_HL_DIR, exist_ok=True)
os.makedirs(PUB_HL_DIR,  exist_ok=True)

YEARS = ["R2", "R3", "R4", "R5", "R6", "R7"]

# ──────────────────────────────────────────────────────────────────
# 商法 (commercial_code)
# ──────────────────────────────────────────────────────────────────
# tuple: (year, question_id, article_key)
COMMERCIAL = [
    # R2 問36: 高価品の特則
    ("R2", "Q36", "577"),
    # R3 問36: 絶対的商行為・営業的商行為
    ("R3", "Q36", "501"),
    ("R3", "Q36", "502"),
    # R4 問36: 営業譲渡（商号続用者の責任・競業禁止・詐害的譲渡）
    ("R4", "Q36", "17"),
    ("R4", "Q36", "18"),
    ("R4", "Q36", "18の2"),
    # R5 問36: 商行為（代理・平常取引者・物品保管）
    ("R5", "Q36", "504"),
    ("R5", "Q36", "509"),
    ("R5", "Q36", "510"),
    # R6 問36: 匿名組合
    ("R6", "Q36", "535"),
    ("R6", "Q36", "536"),
    ("R6", "Q36", "539"),
    # R7 問36: 交互計算
    ("R7", "Q36", "529"),
    ("R7", "Q36", "530"),
    ("R7", "Q36", "531"),
    ("R7", "Q36", "532"),
    ("R7", "Q36", "533"),
]

# ──────────────────────────────────────────────────────────────────
# 会社法 (company_act)
# ──────────────────────────────────────────────────────────────────
COMPANY = [
    # R2 問37: 設立方法・定款認証・検査役・設立者責任
    ("R2", "Q37", "25"),
    ("R2", "Q37", "30"),
    ("R2", "Q37", "33"),
    ("R2", "Q37", "52"),
    ("R2", "Q37", "103"),
    # R2 問38: 種類株式・自己株式取得
    ("R2", "Q38", "107"),
    ("R2", "Q38", "108"),
    ("R2", "Q38", "155"),
    ("R2", "Q38", "156"),
    # R2 問39: 基準日・議決権行使
    ("R2", "Q39", "124"),
    ("R2", "Q39", "310"),
    ("R2", "Q39", "312"),
    # R2 問40: 公開会社・大会社
    ("R2", "Q40", "2"),
    ("R2", "Q40", "108"),
    ("R2", "Q40", "113"),
    ("R2", "Q40", "299"),
    ("R2", "Q40", "327"),
    # R3 問37: 設立の責任（財産価額不足・出資仮装・損害賠償）
    ("R3", "Q37", "52"),
    ("R3", "Q37", "53"),
    ("R3", "Q37", "55"),
    # R3 問38: 株式質権
    ("R3", "Q38", "146"),
    ("R3", "Q38", "147"),
    ("R3", "Q38", "148"),
    # R3 問39: 社外取締役・社外監査役
    ("R3", "Q39", "327の2"),
    ("R3", "Q39", "335"),
    ("R3", "Q39", "400"),
    # R3 問40: 剰余金の配当
    ("R3", "Q40", "445"),
    ("R3", "Q40", "453"),
    ("R3", "Q40", "454"),
    ("R3", "Q40", "461"),
    # R4 問37: 発行可能株式総数
    ("R4", "Q37", "37"),
    ("R4", "Q37", "98"),
    ("R4", "Q37", "113"),
    # R4 問38: 特別支配株主の株式売渡請求
    ("R4", "Q38", "179"),
    ("R4", "Q38", "179の3"),
    ("R4", "Q38", "179の7"),
    ("R4", "Q38", "179の8"),
    # R4 問39: 公開会社の株主総会
    ("R4", "Q39", "296"),
    ("R4", "Q39", "303"),
    ("R4", "Q39", "306"),
    ("R4", "Q39", "314"),
    # R4 問40: 会計参与
    ("R4", "Q40", "326"),
    ("R4", "Q40", "329"),
    ("R4", "Q40", "333"),
    ("R4", "Q40", "374"),
    # R5 問37: 設立時取締役
    ("R5", "Q37", "38"),
    ("R5", "Q37", "88"),
    # R5 問38: 種類株式
    ("R5", "Q38", "108"),
    # R5 問39: 役員等の責任
    ("R5", "Q39", "423"),
    ("R5", "Q39", "424"),
    ("R5", "Q39", "428"),
    # R5 問40: 会計参与と会計監査人
    ("R5", "Q40", "329"),
    ("R5", "Q40", "333"),
    ("R5", "Q40", "337"),
    ("R5", "Q40", "396"),
    ("R5", "Q40", "397"),
    # R6 問37: 議決権
    ("R6", "Q37", "105"),
    ("R6", "Q37", "308"),
    ("R6", "Q37", "341"),
    ("R6", "Q37", "424"),
    # R6 問38: 監査等委員会設置会社・取締役報酬
    ("R6", "Q38", "361"),
    ("R6", "Q38", "399の2"),
    # R6 問39: 株式交換
    ("R6", "Q39", "767"),
    ("R6", "Q39", "768"),
    ("R6", "Q39", "769"),
    ("R6", "Q39", "806"),
    # R6 問40: 会社訴訟
    ("R6", "Q40", "831"),
    ("R6", "Q40", "834"),
    ("R6", "Q40", "839"),
    ("R6", "Q40", "847"),
    ("R6", "Q40", "854"),
    # R7 問37: 発起人
    ("R7", "Q37", "25"),
    ("R7", "Q37", "26"),
    ("R7", "Q37", "36"),
    ("R7", "Q37", "87"),
    # R7 問38: 取締役会
    ("R7", "Q38", "362"),
    ("R7", "Q38", "365"),
    ("R7", "Q38", "368"),
    ("R7", "Q38", "369"),
    ("R7", "Q38", "376"),
    # R7 問39: 監査役・監査役会
    ("R7", "Q39", "327"),
    ("R7", "Q39", "383"),
    ("R7", "Q39", "389"),
    ("R7", "Q39", "390"),
    ("R7", "Q39", "391"),
    # R7 問40: 株券
    ("R7", "Q40", "128"),
    ("R7", "Q40", "133"),
    ("R7", "Q40", "214"),
    ("R7", "Q40", "221"),
]

# ──────────────────────────────────────────────────────────────────
# 地方自治法 (local_autonomy)
# ──────────────────────────────────────────────────────────────────
LOCAL_AUTONOMY = [
    # R2 問10: 普通地方公共団体の契約
    ("R2", "Q10", "234"),
    # R2 問22: 住民
    ("R2", "Q22", "10"),
    # R2 問23: 自治事務と法定受託事務
    ("R2", "Q23", "2"),
    # R2 問24: 住民訴訟
    ("R2", "Q24", "242の2"),
    # R3 問22: 公の施設
    ("R3", "Q22", "244"),
    ("R3", "Q22", "244の2"),
    # R3 問24: 長と議会の関係
    ("R3", "Q24", "176"),
    ("R3", "Q24", "178"),
    ("R3", "Q24", "179"),
    # R4 問9: 行政契約（地方自治法の契約手続）
    ("R4", "Q09", "234"),
    # R4 問22: 条例と罰則・過料
    ("R4", "Q22", "14"),
    # R4 問23: 住民監査請求・住民訴訟
    ("R4", "Q23", "242"),
    ("R4", "Q23", "242の2"),
    # R4 問24: 都道府県の事務
    ("R4", "Q24", "2"),
    # R5 問22: 普通地方公共団体（区域・境界変更・市の要件）
    ("R5", "Q22", "5"),
    ("R5", "Q22", "7"),
    ("R5", "Q22", "8"),
    # R5 問23: 直接請求
    ("R5", "Q23", "74"),
    ("R5", "Q23", "76"),
    # R5 問24: 事務の共同処理
    ("R5", "Q24", "252の2"),
    ("R5", "Q24", "252の2の2"),
    ("R5", "Q24", "252の7"),
    # R6 問22: 普通地方公共団体の事務
    ("R6", "Q22", "2"),
    # R6 問23: 住民監査請求・住民訴訟
    ("R6", "Q23", "242"),
    ("R6", "Q23", "242の2"),
    # R6 問24: 条例または規則
    ("R6", "Q24", "14"),
    ("R6", "Q24", "15"),
    # R7 問22: 条例の適法性（判例）
    ("R7", "Q22", "14"),
    # R7 問23: 知事と議会
    ("R7", "Q23", "176"),
    ("R7", "Q23", "178"),
    ("R7", "Q23", "179"),
    ("R7", "Q23", "180"),
]

# ──────────────────────────────────────────────────────────────────
# 行政代執行法 (admin_enforcement)
# ──────────────────────────────────────────────────────────────────
ADMIN_ENFORCEMENT = [
    # R5 問17: 代執行手続（戒告・代執行令書通知）の処分性・訴訟
    ("R5", "Q17", "2"),
    ("R5", "Q17", "3"),
    # R5 問26: 地方公共団体への行政代執行法の適用
    ("R5", "Q26", "1"),
    ("R5", "Q26", "2"),
]

# ──────────────────────────────────────────────────────────────────
# 国家行政組織法 (national_admin_org)
# ──────────────────────────────────────────────────────────────────
NATIONAL_ADMIN_ORG = [
    # R4 問25: 条文穴埋め（1条・3条・5条）
    ("R4", "Q25", "1"),
    ("R4", "Q25", "3"),
    ("R4", "Q25", "5"),
]

# ──────────────────────────────────────────────────────────────────
# 集計ユーティリティ
# ──────────────────────────────────────────────────────────────────

def art_sort_key(k: str) -> tuple:
    m = re.match(r"^(\d+)", k)
    base = int(m.group(1)) if m else 9999
    return (base, k)


def build_highlights(law_id: str, rows: list) -> dict:
    """(year, question_id, article_key) のリストから highlights JSON を構築。"""
    seen = set()
    articles: dict = {}
    year_order = {y: i for i, y in enumerate(YEARS)}

    for year, q_id, art_key in rows:
        dedup_key = (year, q_id, art_key)
        if dedup_key in seen:
            continue
        seen.add(dedup_key)

        if art_key not in articles:
            articles[art_key] = {"count": 0, "years": set(), "phrases": []}
        articles[art_key]["count"] += 1
        articles[art_key]["years"].add(year)

    # ソート・後処理
    for v in articles.values():
        v["years"] = sorted(v["years"], key=lambda y: year_order.get(y, 99))

    articles_sorted = dict(sorted(articles.items(), key=lambda x: art_sort_key(x[0])))
    return {"lawId": law_id, "range": ["R2", "R7"], "articles": articles_sorted}


def build_ranking(highlights: dict) -> list:
    ranking = sorted(
        [{"article": art_sort_key(k)[0], "count": v["count"]}
         for k, v in highlights["articles"].items()],
        key=lambda x: (-x["count"], x["article"]),
    )
    for i, r in enumerate(ranking, 1):
        r["rank"] = i
    return [{"rank": r["rank"], "article": r["article"], "count": r["count"]}
            for r in ranking]


# ──────────────────────────────────────────────────────────────────
# メイン
# ──────────────────────────────────────────────────────────────────

LAWS = [
    ("commercial_code",    COMMERCIAL),
    ("company_act",        COMPANY),
    ("local_autonomy",     LOCAL_AUTONOMY),
    ("admin_enforcement",  ADMIN_ENFORCEMENT),
    ("national_admin_org", NATIONAL_ADMIN_ORG),
]

for law_id, rows in LAWS:
    hl  = build_highlights(law_id, rows)
    rk  = build_ranking(hl)

    hl_data = os.path.join(DATA_HL_DIR, f"r2_r7_{law_id}.json")
    rk_data = os.path.join(DATA_HL_DIR, f"ranking_{law_id}.json")
    hl_pub  = os.path.join(PUB_HL_DIR,  f"r2_r7_{law_id}.json")
    rk_pub  = os.path.join(PUB_HL_DIR,  f"ranking_{law_id}.json")

    for path, obj in [(hl_data, hl), (rk_data, rk)]:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)

    shutil.copy(hl_data, hl_pub)
    shutil.copy(rk_data, rk_pub)

    n = len(hl["articles"])
    top5 = list(hl["articles"].items())[:5]
    print(f"[OK] {law_id}: {n} 条文")
    for k, v in sorted(hl["articles"].items(),
                        key=lambda x: -x[1]["count"])[:5]:
        print(f"  第{k}条: count={v['count']} years={v['years']}")
    print()

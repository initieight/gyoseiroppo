import json, os

# -------------------------------------------------------
# R2〜R6 raw items （法的分析に基づきハードコード）
# tuple: (question, choice, isCorrect, article, phrase)
# -------------------------------------------------------
RAW = {
    "R2": [
        ("11","1", False, 2,  "申請により求められた許認可等を拒否する処分その他申請に基づき当該申請をした者を名あて人としてされる処分"),
        ("11","3", True,  2,  "不利益処分をするかどうか又はどのような不利益処分とするかについてその法令の定めに従って判断するために必要とされる基準をいう。"),
        ("12","1", True,  16, "通知を受けた者は、代理人を選任することができる。"),
        ("12","1", True,  31, "弁明の機会の付与について準用する。"),
        ("12","5", False, 31, "弁明の機会の付与について準用する。"),
        ("13","イ", True,  7,  "補正を求め、又は当該申請により求められた許認可等を拒否しなければならない。"),
    ],
    "R3": [
        ("12","1", False, 8,  "申請者に対し、同時に、当該処分の理由を示さなければならない。"),
        ("12","3", True,  14, "当該理由を示さないで処分をすべき差し迫った必要がある場合は、この限りでない。"),
        ("12","3", True,  14, "処分後相当の期間内に、同項の理由を示さなければならない。"),
        ("13","イ", True,  35, "趣旨及び内容並びに責任者を明確に示さなければならない。"),
        ("13","ウ", True,  35, "趣旨及び内容並びに責任者を明確に示さなければならない。"),
    ],
    "R4": [
        ("11","2", False, 7,  "補正を求め、又は当該申請により求められた許認可等を拒否しなければならない。"),
        ("11","3", False, 8,  "申請者に対し、同時に、当該処分の理由を示さなければならない。"),
        ("11","4", False, 9,  "申請者の求めに応じ、当該申請に係る審査の進行状況及び当該申請に対する処分の時期の見通しを示すよう努めなければならない。"),
        ("12","1", False, 2,  "申請により求められた許認可等を拒否する処分その他申請に基づき当該申請をした者を名あて人としてされる処分"),
        ("12","3", True,  13, "当該不利益処分の名あて人となるべき者について、当該各号に定める意見陳述のための手続を執らなければならない。"),
        ("13","1", True,  2,  "行政庁に対し一定の事項の通知をする行為（申請に該当するものを除く。）"),
    ],
    "R5": [
        ("11","2", True,  2,  "名あて人となるべき者の同意の下にすることとされている処分"),
        ("11","4", False, 35, "趣旨及び内容並びに責任者を明確に示さなければならない。"),
        ("13","イ", False, 5,  "審査基準を定めるに当たっては、許認可等の性質に照らしてできる限り具体的なものとしなければならない。"),
        ("13","ウ", True,  12, "処分基準を定め、かつ、これを公にしておくよう努めなければならない。"),
    ],
    "R6": [
        ("11","5", True,  13, "法令上必要とされる資格がなかったこと又は失われるに至ったことが判明した場合に必ずすることとされている不利益処分"),
        ("12","ア", True,  35, "許認可等をする権限又は許認可等に基づく処分をする権限を行使し得る旨を示すときは、その相手方に対して、次に掲げる事項を示さなければならない。"),
        ("12","ウ", True,  36, "当該行政指導の中止その他必要な措置をとることを求めることができる。"),
        ("13","1", True,  5,  "行政上特別の支障があるときを除き、法令により申請の提出先とされている機関の事務所における備付けその他の適当な方法により審査基準を公にしておかなければならない。"),
        ("13","2", False, 12, "処分基準を定め、かつ、これを公にしておくよう努めなければならない。"),
        ("13","4", False, 5,  "備付けその他の適当な方法により審査基準を公にしておかなければならない。"),
        ("13","5", False, 12, "処分基準を定め、かつ、これを公にしておくよう努めなければならない。"),
    ],
}

# -------------------------------------------------------
# 1. R2〜R6 の JSON ファイルを生成
# -------------------------------------------------------
for year, rows in RAW.items():
    obj = {
        "year": year,
        "lawId": "admin_procedure",
        "items": [
            {"question": int(q), "choice": c, "isCorrect": ok,
             "article": art, "phrase": phrase.strip()}
            for q, c, ok, art, phrase in rows
        ],
    }
    path = f"data/{year.lower()}_admin_procedure.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"Created {path} ({len(obj['items'])} items)")

# -------------------------------------------------------
# 2. 全6年を読み込んで集計
# -------------------------------------------------------
all_items = []   # (year, question, choice, article, phrase) deduplicated
seen = set()

years_present = ["R2","R3","R4","R5","R6","R7"]
for year in years_present:
    path = f"data/{year.lower()}_admin_procedure.json"
    with open(path, "rb") as f:
        data = json.loads(f.read().decode("utf-8"))
    for it in data["items"]:
        key = (year, it["question"], str(it["choice"]),
               it["article"], it["phrase"].strip())
        if key not in seen:
            seen.add(key)
            all_items.append({
                "year": year,
                "question": it["question"],
                "choice": str(it["choice"]),
                "article": it["article"],
                "phrase": it["phrase"].strip(),
            })

# -------------------------------------------------------
# 3. articles 集計
# -------------------------------------------------------
articles = {}
for it in all_items:
    art_key = str(it["article"])
    if art_key not in articles:
        articles[art_key] = {"count": 0, "years": set(), "phrases": []}
    articles[art_key]["count"] += 1
    articles[art_key]["years"].add(it["year"])
    p = it["phrase"]
    if p not in articles[art_key]["phrases"]:
        articles[art_key]["phrases"].append(p)

# sort years R2→R7, phrases: longest first, max 10
year_order = {y: i for i, y in enumerate(years_present)}
for art_key, v in articles.items():
    v["years"] = sorted(v["years"], key=lambda y: year_order[y])
    v["phrases"] = sorted(v["phrases"], key=lambda s: -len(s))[:10]

# sort articles by key (numeric where possible)
def art_sort_key(k):
    try: return int(k)
    except: return float("inf")

articles_sorted = dict(sorted(articles.items(), key=lambda x: art_sort_key(x[0])))

# -------------------------------------------------------
# 4. highlights JSON
# -------------------------------------------------------
highlights = {
    "lawId": "admin_procedure",
    "range": ["R2", "R7"],
    "articles": articles_sorted,
}
hl_path = "data/highlights/r2_r7_admin_procedure.json"
with open(hl_path, "w", encoding="utf-8") as f:
    json.dump(highlights, f, ensure_ascii=False, indent=2)
print(f"\nCreated {hl_path}")

# -------------------------------------------------------
# 5. ranking JSON
# -------------------------------------------------------
ranking = sorted(
    [{"article": art_sort_key(k), "count": v["count"]}
     for k, v in articles_sorted.items()],
    key=lambda x: (-x["count"], x["article"])
)
for i, r in enumerate(ranking, 1):
    r["rank"] = i
ranking = [{"rank": r["rank"], "article": r["article"], "count": r["count"]}
           for r in ranking]

rk_path = "data/highlights/ranking_admin_procedure.json"
with open(rk_path, "w", encoding="utf-8") as f:
    json.dump(ranking, f, ensure_ascii=False, indent=2)
print(f"Created {rk_path}")

# -------------------------------------------------------
# 6. public/ にコピー
# -------------------------------------------------------
import shutil
for year in years_present:
    src = f"data/{year.lower()}_admin_procedure.json"
    shutil.copy(src, f"public/{year.lower()}_admin_procedure.json")
shutil.copy(hl_path, "public/highlights/r2_r7_admin_procedure.json")
shutil.copy(rk_path, "public/highlights/ranking_admin_procedure.json")
print("\nCopied all to public/")

# -------------------------------------------------------
# 7. サマリー表示
# -------------------------------------------------------
print("\n=== highlights summary ===")
for k, v in articles_sorted.items():
    print(f"  第{k}条: count={v['count']} years={v['years']}")
print("\n=== ranking ===")
for r in ranking:
    print(f"  rank{r['rank']}: 第{r['article']}条 count={r['count']}")

import json

# Load law.json
with open('data/law.json', 'rb') as f:
    law = json.loads(f.read().decode('utf-8'))

# Build article text map
art_text = {}
for item in law['items']:
    art_text[item['article']] = item['text']

# Article number to Japanese name mapping (only articles present in law.json)
art_num_to_ja = {
    '2': '第二条', '5': '第五条', '7': '第七条', '8': '第八条',
    '9': '第九条', '12': '第十二条', '13': '第十三条', '14': '第十四条',
    '15': '第十五条', '16': '第十六条', '24': '第二十四条',
    '25': '第二十五条', '30': '第三十条', '31': '第三十一条',
    '35': '第三十五条', '36の2': '第三十六条の二',
}


def ph(article_num, keyword):
    """Extract the sentence from law.json containing keyword. Returns [] if not found."""
    ja_name = art_num_to_ja.get(article_num, '')
    text = art_text.get(ja_name, '')
    if not text or not keyword:
        return []
    idx = text.find(keyword)
    if idx == -1:
        return []
    # Find sentence start (after last newline or period before keyword)
    nl = text.rfind('\n', 0, idx)
    dot = text.rfind('。', 0, idx)
    start = max(nl, dot) + 1
    # Find sentence end
    end = text.find('。', idx)
    end = end + 1 if end != -1 else len(text)
    fragment = text[start:end].strip()
    return [fragment[:120]]


def c(choice, correct, articles, phrases):
    """Helper to build a choice dict."""
    return {"choice": choice, "correct": correct, "articles": articles, "phrases": phrases}


data = [
    # ===== R2 =====
    {
        "year": "R2",
        "law": "行政手続法",
        "questions": [
            {
                "question": 11,
                "choices": [
                    c(1, False, ["2"], []),
                    c(2, False, ["2"], []),
                    c(3, True,  ["2"], ph("2", "処分基準")),
                    c(4, False, ["2"], []),
                    c(5, False, ["2"], []),
                ],
            },
            {
                "question": 12,
                "choices": [
                    c(1, True,  ["16", "31"], ph("16", "代理人を選任することができる")),
                    c(2, False, ["13"], []),
                    c(3, False, ["30"], []),
                    c(4, False, ["13"], []),
                    c(5, False, ["31", "18"], ph("31", "第十五条第三項及び第十六条の規定は")),
                ],
            },
            {
                "question": 13,
                "choices": [
                    c("ア", False, ["7"], []),
                    c("イ", True,  ["7"], ph("7", "補正を求め")),
                    c("ウ", False, ["13"], []),
                    c("エ", True,  [], []),
                    c("オ", False, [], []),
                ],
            },
        ],
    },
    # ===== R3 =====
    {
        "year": "R3",
        "law": "行政手続法",
        "questions": [
            {
                "question": 11,
                "choices": [
                    c(1, True,  [], []),
                    c(2, False, [], []),
                    c(3, False, [], []),
                    c(4, False, [], []),
                    c(5, False, [], []),
                ],
            },
            {
                "question": 12,
                "choices": [
                    c(1, False, ["8"], ph("8", "申請者に対し、同時に")),
                    c(2, False, ["8"], ph("8", "申請者に対し、同時に")),
                    c(3, True,  ["14"], ph("14", "処分後相当の期間内に")),
                    c(4, False, ["8"], []),
                    c(5, False, ["8"], []),
                ],
            },
            {
                "question": 13,
                "choices": [
                    c("ア", False, [], []),
                    c("イ", True,  ["35"], ph("35", "趣旨及び内容並びに責任者を明確に示さなければならない")),
                    c("ウ", True,  [], []),
                    c("エ", False, [], []),
                ],
            },
        ],
    },
    # ===== R4 =====
    {
        "year": "R4",
        "law": "行政手続法",
        "questions": [
            {
                "question": 11,
                "choices": [
                    c(1, True,  [], []),
                    c(2, False, ["7"], ph("7", "補正を求め")),
                    c(3, False, ["8"], ph("8", "申請者に対し、同時に")),
                    c(4, False, ["9"], ph("9", "申請者の求めに応じ")),
                    c(5, False, [], []),
                ],
            },
            {
                "question": 12,
                "choices": [
                    c(1, False, ["2", "13"], []),
                    c(2, False, ["13"], ph("13", "意見陳述のための手続を執らなければならない")),
                    c(3, True,  ["13", "30"], []),
                    c(4, False, [], []),
                    c(5, False, [], []),
                ],
            },
            {
                "question": 13,
                "choices": [
                    c(1, True,  ["2"], ph("2", "申請に該当するものを除く")),
                    c(2, False, ["2"], []),
                    c(3, False, ["2"], []),
                    c(4, False, [], []),
                    c(5, False, [], []),
                ],
            },
        ],
    },
    # ===== R5 =====
    {
        "year": "R5",
        "law": "行政手続法",
        "questions": [
            {
                "question": 11,
                "choices": [
                    c(1, False, ["2"], []),
                    c(2, True,  ["2"], ph("2", "名あて人となるべき者の同意の下にすることとされている処分")),
                    c(3, False, ["2"], ph("2", "特定の者に一定の作為又は不作為を求める")),
                    c(4, False, ["35"], ph("35", "趣旨及び内容並びに責任者を明確に示さなければならない")),
                    c(5, False, [], []),
                ],
            },
            {
                "question": 12,
                "choices": [
                    c(1, True,  ["24"], ph("24", "調書を作成し")),
                    c(2, True,  [], []),
                    c(3, True,  [], []),
                    c(4, True,  [], []),
                    c(5, False, [], []),
                ],
            },
            {
                "question": 13,
                "choices": [
                    c("ア", True,  [], []),
                    c("イ", False, ["5"], ph("5", "審査基準を定めるに当たっては")),
                    c("ウ", True,  ["12"], ph("12", "処分基準を定め、かつ、これを公にしておくよう努めなければならない")),
                    c("エ", False, [], []),
                ],
            },
        ],
    },
    # ===== R6 =====
    {
        "year": "R6",
        "law": "行政手続法",
        "questions": [
            {
                "question": 11,
                "choices": [
                    c(1, False, ["2"], []),
                    c(2, False, [], []),
                    c(3, False, [], []),
                    c(4, False, ["5", "12"], []),
                    c(5, True,  ["13"], ph("13", "客観的な資料により直接証明")),
                ],
            },
            {
                "question": 12,
                "choices": [
                    c("ア", True,  ["35"], ph("35", "許認可等をする権限又は許認可等に基づく処分をする権限を行使し得る旨を示すときは")),
                    c("イ", False, [], []),
                    c("ウ", True,  ["36の2"], ph("36の2", "当該行政指導の中止その他必要な措置をとることを求めることができる")),
                    c("エ", False, ["2"], ph("2", "行政指導指針")),
                ],
            },
            {
                "question": 13,
                "choices": [
                    c(1, True,  ["5"], ph("5", "行政上特別の支障があるときを除き")),
                    c(2, False, ["12"], ph("12", "処分基準を定め、かつ、これを公にしておくよう努めなければならない")),
                    c(3, False, ["5"], ph("5", "審査基準を定めるものとする")),
                    c(4, False, ["5"], ph("5", "行政上特別の支障があるときを除き")),
                    c(5, False, ["12"], ph("12", "処分基準を定め、かつ、これを公にしておくよう努めなければならない")),
                ],
            },
        ],
    },
    # ===== R7 =====
    {
        "year": "R7",
        "law": "行政手続法",
        "questions": [
            {
                "question": 11,
                "choices": [
                    c(1, True,  ["31", "16"], ph("31", "第十五条第三項及び第十六条の規定は") + ph("16", "代理人を選任することができる")),
                    c(2, False, ["31"], ph("31", "第十五条第三項及び第十六条の規定は")),
                    c(3, False, [], []),
                    c(4, False, ["24", "31"], ph("24", "調書を作成し")),
                    c(5, False, [], []),
                ],
            },
            {
                "question": 12,
                "choices": [
                    c("ア", False, ["13", "2"], ph("2", "行政指導\u3000行政機関がその任務")),
                    c("イ", True,  ["35"], ph("35", "趣旨及び内容並びに責任者を明確に示さなければならない")),
                    c("ウ", False, ["36の2"], ph("36の2", "当該行政指導の中止その他必要な措置をとることを求めることができる")),
                    c("エ", True,  ["14"], ph("14", "その名あて人に対し、同時に、当該不利益処分の理由を示さなければならない")),
                ],
            },
            {
                "question": 13,
                "choices": [
                    c(1, False, ["8"], ph("8", "申請者に対し、同時に、当該処分の理由を示さなければならない")),
                    c(2, True,  ["9"], ph("9", "申請者の求めに応じ、当該申請に係る審査の進行状況及び当該申請に対する処分の時期の見通しを示すよう努めなければならない")),
                    c(3, False, ["12"], ph("12", "処分基準を定め、かつ、これを公にしておくよう努めなければならない")),
                    c(4, False, ["13"], ph("13", "意見陳述のための手続を執らなければならない")),
                    c(5, False, ["7"], ph("7", "補正を求め、又は当該申請により求められた許認可等を拒否しなければならない")),
                ],
            },
        ],
    },
]

# Write output
with open('data/gyosei_analysis.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Done! gyosei_analysis.json generated.')
print(f'Total years: {len(data)}')
for entry in data:
    print(f"  {entry['year']}: {len(entry['questions'])} questions")

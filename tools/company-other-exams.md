# 会社法：他資格過去問の追加手順

## 対象

- 司法書士試験 午前の部（商法・会社法）
- 司法試験予備試験 短答式（民法・商法・民事訴訟法のうち商法部分）
- 初回公開対象は R5〜R7

2017年は会社法改正の施行年ではなく、企業統治等に関する見直しの諮問が行われた年。
直近の大きな改正は令和元年法律第70号で、原則施行は2021年3月1日、株主総会資料の
電子提供制度等は2022年9月1日施行。両方の施行後であるR5以降を初回対象にする。

通常の司法試験は短答式に会社法がないため、条文単位の集計対象にはしない。

一次資料：

- 法務省「会社法の一部を改正する法律について」
  https://www.moj.go.jp/MINJI/minji07_00001
- 法務省「令和5年司法試験予備試験問題」
  https://www.moj.go.jp/jinji/shihoushiken/jinji07_00151.html
- 法務省「令和6年司法試験予備試験問題」
  https://www.moj.go.jp/jinji/shihoushiken/jinji07_00228.html
- 法務省「令和7年司法試験予備試験問題」
  https://www.moj.go.jp/jinji/shihoushiken/jinji07_00287.html
- 法務省「令和5年度司法書士試験問題」
  https://www.moj.go.jp/MINJI/minji05_00541.html
- 法務省「令和6年度司法書士試験問題」
  https://www.moj.go.jp/MINJI/minji05_00635.html
- 法務省「令和7年度司法書士試験問題」
  https://www.moj.go.jp/MINJI/minji05_00715.html

## フロー

### 1. レビュー入力を生成

```powershell
node tools/make_other_exam_review.mjs --years=R5,R6,R7 --group=shoji --out-dir=tools/out/company_review
```

`tools/out/company_review` は `.gitignore` 対象。問題文を公開リポジトリへ入れない。

### 2. 候補条文の機械監査

```powershell
node tools/audit_other_exam_candidates.mjs --years=R5,R6,R7
```

`tools/out/company_review/company_candidates.csv` に、現行条文との文字列一致で
上位3候補と曖昧フラグを出す。全行が「判定必要」であり、候補をそのまま公開しない。

同時に次も生成する。

- `company_exact_matches.csv`：一致度0.55以上、次点との差0.15以上の機械的一致群
- `company_manual_review.csv`：個別判定が必要な残り
- `company_machine_prefill.json`：機械的一致群の補助入力。全件 `reviewed: false`

### 3. 補助判定

生成した入力を年度ごとにCodex.aiへ渡し、回答JSONを同じディレクトリへ
`条文割当_他資格_司法書士_R5_回答.json` の形式で保存する。

### 4. 回答の機械監査

```powershell
node tools/verify_other_exams.mjs --answers-dir=tools/out/company_review --output=tools/out/company_review/company_assignment_audit.csv
```

条文の実在、明示された条番号、条文本文との語彙一致をCSVで監査する。
「要確認」は自動修正せず、人間が一次資料と現行条文を見て判定する。

### 5. 判定済み回答から公開JSONを生成

```powershell
node tools/emit_other_exams_review.mjs --years=R5,R6,R7 --answers-dir=tools/out/company_review
node tools/emit_other_exams_review.mjs --years=R5,R6,R7 --answers-dir=tools/out/company_review --write
```

差分確認を先に行い、人間判定済みの回答だけを `--write` する。

### 6. 表示を有効化

`public/highlights/other_exams_company_act.json` と
`public/highlights/other_exams_commercial_code.json` の検証後、`lib/laws.ts` の
`OTHER_EXAM_LAWS` に `company_act` と `commercial_code` を追加する。

"""
e-Gov法令APIから条文データを取得してpublic/laws/{lawId}.jsonに保存するスクリプト
"""

import requests
import xml.etree.ElementTree as ET
import json
import re
import os

# 取得する法律: {lawId: e-Gov法令番号}
TARGETS = {
    'admin_procedure':  '405AC0000000088',   # 行政手続法
    'admin_appeal':     '426AC0000000068',   # 行政不服審査法
    'admin_litigation': '337AC0000000139',   # 行政事件訴訟法
    'state_liability':  '322AC0000000125',   # 国家賠償法
    'constitution':     '321CONSTITUTION',   # 日本国憲法
    'civil_code':       '129AC0000000089',   # 民法
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'laws')


def fetch_xml(law_number: str) -> str:
    url = f'https://laws.e-gov.go.jp/api/1/lawdata/{law_number}'
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.text


def collect_sentences(elem) -> str:
    """要素内の全 Sentence テキストを改行なしで連結する"""
    parts = []
    for s in elem.iter('Sentence'):
        t = (s.text or '').strip()
        if t:
            parts.append(t)
    return ''.join(parts)


def paragraph_text(para) -> str:
    """1つの Paragraph を「項番号 + テキスト」形式で返す"""
    num_el = para.find('ParagraphNum')
    num = (num_el.text or '').strip() if num_el is not None else ''
    body_el = para.find('ParagraphSentence')
    body = collect_sentences(body_el) if body_el is not None else ''
    # 枝番リスト(各号)を追記
    items = []
    for item in para.findall('.//Item'):
        item_num_el = item.find('ItemTitle')
        item_body_el = item.find('ItemSentence')
        i_num = (item_num_el.text or '').strip() if item_num_el is not None else ''
        i_body = collect_sentences(item_body_el) if item_body_el is not None else ''
        if i_num or i_body:
            items.append(f'　{i_num}　{i_body}')
    result = f'{num}　{body}' if num else body
    if items:
        result += '\n' + '\n'.join(items)
    return result


def parse_law(xml_text: str, law_id: str) -> dict:
    root = ET.fromstring(xml_text)
    articles: dict[str, dict] = {}

    # MainProvision 内の Article だけを対象にする（附則・改正附則を除外）
    main = root.find('.//MainProvision')
    scope = main if main is not None else root
    for article in scope.iter('Article'):
        num_str = article.get('Num', '')
        if not num_str:
            continue

        # 条番号をキーに変換: "1" → "1", "36_2" → "36の2" など
        key = re.sub(r'_(\d+)$', r'の\1', num_str)

        title_el = article.find('ArticleTitle')
        title = (title_el.text or '').strip() if title_el is not None else f'第{key}条'

        caption_el = article.find('ArticleCaption')
        caption = (caption_el.text or '').strip() if caption_el is not None else ''

        # 全段落を結合
        paras = article.findall('.//Paragraph')
        text_parts = [paragraph_text(p) for p in paras]
        text = '\n'.join(t for t in text_parts if t)

        entry: dict = {'title': title, 'text': text}
        if caption:
            entry['caption'] = caption

        articles[key] = entry

    return {'lawId': law_id, 'articles': articles}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for law_id, law_number in TARGETS.items():
        out_path = os.path.join(OUTPUT_DIR, f'{law_id}.json')
        print(f'Fetching {law_id} ({law_number})...', end=' ', flush=True)
        try:
            xml_text = fetch_xml(law_number)
            data = parse_law(xml_text, law_id)
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f'OK ({len(data["articles"])} articles) -> {out_path}')
        except Exception as e:
            print(f'ERROR: {e}')


if __name__ == '__main__':
    main()

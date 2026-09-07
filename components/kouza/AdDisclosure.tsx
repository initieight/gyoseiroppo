/**
 * ステマ規制（景品表示法の指定告示）対応の広告表記。
 * 広告を含むページのファーストビューに必ず置くこと。
 * 広告主（スタディング）の提携条件でも必須要件になっている。
 */
export default function AdDisclosure() {
  return (
    <p className="mb-4 rounded-lg bg-gray-100 px-3 py-2 text-xs leading-5 text-gray-700">
      <span className="font-bold">広告</span>
      ：このページはプロモーションを含みます。各社へのリンクには広告が含まれ、
      当サイトは広告主から手数料を受け取る場合があります。
      掲載内容は各社の公式サイトで確認した情報にもとづいて記載しています。
    </p>
  );
}

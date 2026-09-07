const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 旧ページ。/law/admin_procedure と内容が重複していたため統合。
      // 既にインデックスされている可能性があるので 301 で寄せる。
      {
        source: '/admin_procedure',
        destination: '/law/admin_procedure',
        // permanent: true は 308 になる。指示どおり 301 を明示する
        // （Google は 301/308 を同等に扱うが、古いクローラ対策も兼ねて）
        statusCode: 301,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);

import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

export default {
  base: './',
  plugins: [
    {
      name: 'html-transform',
      transformIndexHtml(html: string) {
        return html.replace('__BUILD_DATE__', new Date().toLocaleString('ja-JP'));
      },
    },
    {
      name: 'minify-html-raw',
      transform(code: string, id: string) {
        // .html?raw というクエリがついたファイルをフック
        if (id.endsWith('.html?raw')) {
          // 簡易的な圧縮：改行と余分な空白を削除
          const minified = code
            .replace(/\\n/g, '')         // 改行を消す
            .replace(/\s{2,}/g, ' ')     // 2つ以上の空白を1つに
            .replace(/>\s+</g, '><')    // タグ間の空白を消す
            .replace(/__PACKAGE_VERSION__/g, pkg.version);
          return { code: minified };
        }
      }
    },
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        lang: 'ja',
        short_name: 'TxtMiruApp',
        name: 'TxtMiruApp',
        background_color: '#fff',
        theme_color: '#fff',
        display: 'standalone',
        id: 'index',
        start_url: 'index.html',
        orientation: 'portrait',
        icons: [
          {
            "src": "favicon.ico",
            "sizes": "48x48 32x32 128x128",
            "type": "image/x-icon"
          },
          {
            src: 'images/32.png',
            type: 'image/png',
            sizes: '32x32'
          },
          {
            src: 'images/48.png',
            type: 'image/png',
            sizes: '48x48'
          },
          {
            src: 'images/192.png',
            type: 'image/png',
            sizes: '192x192'
          },
          {
            src: 'images/512.png',
            type: 'image/png',
            sizes: '512x512'
          }
        ],
        screenshots: [
          {
            src: 'images/512.png',
            sizes: '512x512',
            form_factor: 'wide',
            label: 'With Software, you can select a part of your screen and take a screenshot in seconds.'
          },
          {
            src: 'images/512.png',
            sizes: '512x512',
            form_factor: 'narrow',
            label: 'With Software, you can select a part of your screen and take a screenshot in seconds.'
          }
        ]
      },
    })
  ],
  define: {
    // JS内で使用できるグローバル変数を定義
    __BUILD_DATE__: JSON.stringify(new Date().toLocaleString('ja-JP')),
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  },
}
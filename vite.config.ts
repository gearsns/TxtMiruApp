/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'
import path from 'path';
import { playwright } from '@vitest/browser-playwright'

export default defineConfig(({ mode }) => {
  return {
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
    build: {
      outDir: "docs",
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('/gaiji')) {
              return 'gaiji';
            }
          }
        }
      }
    },
    define: {
      // JS内で使用できるグローバル変数を定義
      __BUILD_DATE__: JSON.stringify(new Date().toLocaleString('ja-JP')),
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
    },
    test: {
      // ブラウザ環境をシミュレート
      environment: 'jsdom',
      // 全てのテストファイルで自動的に `expect` などを使えるようにする
      globals: true,
      projects: [
        {
          extends: true,
          test: {
            name: 'node-unit',
            include: ['src/**/*.test.ts', 'src/**/*.test.tsx'], // 通常のテスト
            exclude: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'], // ブラウザ用を除外
            environment: 'jsdom',
            setupFiles: './src/test/setup.ts',
            alias: {
              // テスト時だけasm.js版（Nodeで安定する版）に差し替える
              'sql.js': path.resolve(__dirname, 'node_modules/sql.js/dist/sql-asm.js'),
            },
          }
        },
        {
          extends: true,
          test: {
            name: 'browser-integration',
            include: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'], // ブラウザ用だけ実行
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
              headless: true,
            },
          },
          vite: {
            publicDir: 'public',
            server: {
              fs: {
                allow: ['..', './test-fixtures']
              }
            }
          }
        }
      ]
    },
  }
});
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'
import path from 'path';
import { playwright } from '@vitest/browser-playwright'
import license from 'rollup-plugin-license';

const formattedDate = () => {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // 月は+1が必要
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0'); // 分は getMinutes()

  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

export default defineConfig(({ mode }) => {
  return {
    base: './',
    plugins: [
      license({
      thirdParty: {
        output: {
          file: path.join(__dirname, 'docs', 'OSS_LICENSES.txt'),
          template(dependencies) {
            return dependencies
              .map((dependency) => {
                return `========================================================================
Name: ${dependency.name}
Version: ${dependency.version}
License: ${dependency.license}
Author: ${dependency.author?.name || 'N/A'}
URL: ${dependency.homepage || 'N/A'}
------------------------------------------------------------------------
${dependency.licenseText || 'No license text provided.'}
`;
              })
              .join('\n');
          },
        },
      },
    }),
      {
        name: 'html-transform',
        transformIndexHtml(html: string) {
          return html.replace('__BUILD_DATE__', formattedDate);
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
              .replace(/__PACKAGE_VERSION__/g, pkg.version)
              .replace(/__BUILD_DATE__/g, formattedDate);
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
          display_override: ["window-controls-overlay", "minimal-ui"],
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@features': path.resolve(__dirname, './src/features'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@components': path.resolve(__dirname, './src/components'),
      },
    },
    define: {
      // JS内で使用できるグローバル変数を定義
      __BUILD_DATE__: JSON.stringify(formattedDate()),
      'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
      'import.meta.env.APP_DESCRIPTION': JSON.stringify(pkg.description),
      'import.meta.env.APP_TITLE': JSON.stringify(pkg.appConfig.title),
      'import.meta.env.APP_FULL_TITLE': JSON.stringify(`${pkg.appConfig.title} ${pkg.version} - ${pkg.appConfig.shortDescription} -`),
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
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ヘルプ - KeepOn',
  description:
    'KeepOnの使い方ガイド、よくある質問、トラブルシューティング。アプリの活用方法を知りたい場合や、困ったときにご確認ください。',
  openGraph: {
    title: 'ヘルプ - KeepOn',
    description: '使い方ガイドとよくある質問',
    type: 'website',
  },
}

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-10 p-6">
      <header className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-3">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">ヘルプセンター</p>
          <h1 className="font-bold text-3xl text-foreground">ヘルプ</h1>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">
            KeepOnの使い方とよくある質問をまとめています。困ったときはまずこちらをご確認ください。
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-muted-foreground text-xs">
          <span className="rounded-full border border-border bg-background px-3 py-1">チェックイン</span>
          <span className="rounded-full border border-border bg-background px-3 py-1">習慣管理</span>
          <span className="rounded-full border border-border bg-background px-3 py-1">設定</span>
          <span className="rounded-full border border-border bg-background px-3 py-1">トラブル対処</span>
        </div>
      </header>

      <section aria-labelledby="quick-links" className="space-y-4">
        <div className="space-y-1">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">クイックアクセス</p>
          <h2 className="font-semibold text-2xl text-foreground" id="quick-links">
            よく使うページ
          </h2>
          <p className="text-muted-foreground text-sm">まずはよく使う画面を開いて状況を確認できます。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickLinkCard description="今日の進捗とチェックイン操作はこちら" href="/dashboard" title="ダッシュボード" />
          <QuickLinkCard description="習慣の作成・編集・アーカイブ" href="/habits" title="習慣管理" />
          <QuickLinkCard description="表示・週の開始日などの設定" href="/settings" title="設定" />
        </div>
      </section>

      <section aria-labelledby="how-to" className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">はじめての方へ</p>
            <h2 className="font-semibold text-2xl text-foreground" id="how-to">
              使い方
            </h2>
            <p className="text-muted-foreground text-sm">基本は3ステップ。継続の流れを押さえましょう。</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            <StepCard description="名前・頻度・期間を設定して習慣を追加します。" step="1" title="習慣を作成する" />
            <StepCard
              description="ダッシュボードで習慣をタップしてチェックインします。"
              step="2"
              title="チェックインする"
            />
            <StepCard description="習慣の編集・アーカイブは習慣一覧から行えます。" step="3" title="見直し・整理する" />
          </ol>
        </div>
        <aside className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">トラブル時の確認</p>
            <h2 className="font-semibold text-2xl text-foreground">まず試すこと</h2>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <ul className="space-y-3 text-muted-foreground text-sm">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>通信状態を確認して、画面を再読み込みします。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>ログアウト→再ログインでセッションを更新します。</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>別の端末でも同じ状態になるか確認します。</span>
              </li>
            </ul>
          </div>
        </aside>
      </section>

      <section aria-labelledby="faq" className="space-y-4">
        <div className="space-y-1">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">FAQ</p>
          <h2 className="font-semibold text-2xl text-foreground" id="faq">
            よくある質問
          </h2>
          <p className="text-muted-foreground text-sm">クリックして回答を開けます。</p>
        </div>
        <div className="grid gap-4">
          <FaqCard
            answer="ダッシュボード右上のユーザーアイコンからログアウト後、再度サインインしてください。"
            question="ログインできません"
          />
          <FaqCard
            answer="チェックイン後に反映されない場合は、画面を再読み込みしてください。通信環境が不安定な場合は反映に時間がかかることがあります。"
            question="チェックインが反映されません"
          />
          <FaqCard
            answer="設定画面で「週の開始日」を変更できます。変更後は週次習慣の集計が切り替わります。"
            question="週の開始日を変更したい"
          />
          <FaqCard
            answer="習慣一覧からアーカイブできます。不要になった習慣はアーカイブ後に削除できます。"
            question="習慣を削除したい"
          />
          <FaqCard
            answer="オフライン時は閲覧のみになります。再接続後にチェックイン操作を行ってください。"
            question="オフラインでも使えますか？"
          />
        </div>
      </section>

      <section aria-labelledby="support" className="space-y-4">
        <div className="space-y-1">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">サポート</p>
          <h2 className="font-semibold text-2xl text-foreground" id="support">
            お問い合わせ / フィードバック
          </h2>
          <p className="text-muted-foreground text-sm">解決しない場合は、詳細を添えてご連絡ください。</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-muted-foreground text-sm">
          <div className="space-y-2">
            <p>不具合報告や要望は GitHub Issue にて受け付けています。</p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>発生日時・再現手順・スクリーンショットを記載</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                <span>端末やブラウザの情報を併記</span>
              </li>
            </ul>
          </div>
          <p className="mt-4">
            <a
              className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 transition hover:underline"
              href="https://github.com/jey3dayo/keep-on/issues"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub Issue を開く
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}

function QuickLinkCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      className="group flex h-full cursor-pointer flex-col justify-between gap-2 rounded-lg border border-border bg-card p-4 transition hover:border-foreground/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href={href}
    >
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-foreground/80 text-sm transition group-hover:text-foreground">
        開く
        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </span>
    </Link>
  )
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold text-base text-foreground">
        {step}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-lg border border-border bg-card p-4 open:bg-muted/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <span>Q. {question}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground transition group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <p className="mt-3 text-muted-foreground text-sm leading-relaxed">A. {answer}</p>
    </details>
  )
}

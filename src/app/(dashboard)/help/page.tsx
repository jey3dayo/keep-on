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
    <div className="flex flex-1 flex-col gap-8 p-6">
      <header className="space-y-2">
        <h1 className="font-bold text-3xl text-foreground">ヘルプ</h1>
        <p className="text-muted-foreground">
          KeepOnの使い方とよくある質問をまとめています。困ったときはまずこちらをご確認ください。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <QuickLinkCard description="今日の進捗とチェックイン操作はこちら" href="/dashboard" title="ダッシュボード" />
        <QuickLinkCard description="習慣の作成・編集・アーカイブ" href="/habits" title="習慣管理" />
        <QuickLinkCard description="表示・週の開始日などの設定" href="/settings" title="設定" />
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl text-foreground">使い方</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          <StepCard description="名前・頻度・期間を設定して習慣を追加します。" step="1" title="習慣を作成する" />
          <StepCard
            description="ダッシュボードで習慣をタップしてチェックインします。"
            step="2"
            title="チェックインする"
          />
          <StepCard description="習慣の編集・アーカイブは習慣一覧から行えます。" step="3" title="見直し・整理する" />
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl text-foreground">よくある質問</h2>
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

      <section className="space-y-4">
        <h2 className="font-semibold text-2xl text-foreground">お問い合わせ / フィードバック</h2>
        <div className="rounded-lg border border-border bg-card p-4 text-muted-foreground text-sm">
          <p>
            不具合報告や要望は GitHub Issue
            にて受け付けています。できるだけ再現手順とスクリーンショットを添えてください。
          </p>
          <p className="mt-3">
            <a
              className="font-medium text-foreground underline-offset-4 transition hover:underline"
              href="https://github.com/jey3dayo/keep-on/issues"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub Issue を開く
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
      className="group flex h-full flex-col justify-between gap-2 rounded-lg border border-border bg-card p-4 transition hover:border-foreground/40 hover:bg-muted/30"
      href={href}
    >
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <span className="text-foreground/80 text-sm transition group-hover:text-foreground">開く →</span>
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
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  )
}

function FaqCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold text-base text-foreground">Q. {question}</h3>
      <p className="mt-2 text-muted-foreground text-sm">A. {answer}</p>
    </div>
  )
}

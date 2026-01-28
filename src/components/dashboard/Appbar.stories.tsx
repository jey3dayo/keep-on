import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentType } from 'react'
import { ThemeProvider } from '@/components/basics/ThemeProvider'
import { Appbar } from './Appbar'

const meta = {
  title: 'Dashboard/Appbar',
  component: Appbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story: ComponentType) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Appbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithUserButton: Story = {
  args: {
    showUserButton: true,
  },
  render: (args) => (
    <div>
      <Appbar {...args} />
      <div className="p-8">
        <h1 className="mb-4 font-bold text-3xl">ダッシュボード</h1>
        <p className="text-muted-foreground">ユーザー認証ありのAppbarサンプルです</p>
        <p className="mt-2 text-muted-foreground text-sm">※ UserButtonはClerk認証コンテキストが必要です</p>
      </div>
    </div>
  ),
}

export const WithContent: Story = {
  render: () => (
    <div className="min-h-screen bg-background">
      <Appbar />
      <main className="container mx-auto p-8">
        <h1 className="mb-4 font-bold text-3xl">KeepOnへようこそ</h1>
        <div className="space-y-4">
          <p className="text-muted-foreground">Appbarがコンテンツと統合されているサンプルページです</p>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 font-semibold text-xl">カードタイトル</h2>
            <p className="text-muted-foreground text-sm">新しいデザインシステムの視覚階層を示すカードです</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-2 font-semibold text-xl">もう一つのカード</h2>
            <p className="text-muted-foreground text-sm">カード背景とページ背景の微妙な違いを確認してください</p>
          </div>
        </div>
      </main>
    </div>
  ),
}

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <Appbar showUserButton />
      <main className="p-4">
        <h1 className="mb-4 font-bold text-2xl">モバイルビュー</h1>
        <p className="text-muted-foreground text-sm">
          モバイルではナビゲーションリンクが非表示になり、メニューボタンでアクセスできます
        </p>
      </main>
    </div>
  ),
}

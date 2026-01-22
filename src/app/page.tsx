export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-white">KeepOn</h1>
        <p className="text-xl text-slate-300">習慣トラッキングアプリ</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/sign-in"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            サインイン
          </a>
          <a
            href="/sign-up"
            className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            新規登録
          </a>
        </div>
      </div>
    </main>
  )
}

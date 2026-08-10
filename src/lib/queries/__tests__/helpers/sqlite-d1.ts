import { DatabaseSync, type StatementSync } from 'node:sqlite'

/**
 * `node:sqlite`（Node 24 標準、実験的機能）の `DatabaseSync` を、
 * Drizzle の `drizzle-orm/d1` ドライバが要求する `D1Database` interface でラップするテスト用シム。
 *
 * 目的: `drizzle-orm` をモックせず、本物の Drizzle に SQL を組み立てさせて
 * 実 SQLite で実行することで、raw SQL（`sql` テンプレート）の構文誤りを検出できるようにする。
 *
 * `node:sqlite` は SQLite であって D1 そのものではない。D1 固有の制約
 * （トランザクション不可、`batch` の挙動）はここでは再現しない。
 */

type SqliteBindable = bigint | number | string | null

function toSqliteBindable(value: unknown): SqliteBindable {
  if (value === null || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string') {
    return value
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  throw new Error(`Unsupported SQLite parameter type: ${typeof value}`)
}

class SqliteD1PreparedStatement implements D1PreparedStatement {
  private readonly db: DatabaseSync
  private params: unknown[] = []
  private readonly query: string

  constructor(db: DatabaseSync, query: string) {
    this.db = db
    this.query = query
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this.params = values
    return this
  }

  first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    // drizzle-orm/d1 の session.js は get() 相当も all() 経由で処理するため呼ばれない
    // (checkin.ts の対象クエリも first() を使わない)。未実装として明示する。
    throw new Error(`SqliteD1PreparedStatement.first(${colName ?? ''}) is not implemented in the test shim`)
  }

  run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    // RETURNING句を含む文（INSERT/DELETE）でも行を取りこぼさないよう all() で実行する。
    const rows = this.getAllRows()
    return Promise.resolve({
      meta: buildMeta(),
      results: this.mapRows<T>(rows),
      success: true,
    })
  }

  all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const rows = this.getAllRows()
    return Promise.resolve({
      meta: buildMeta(),
      results: this.mapRows<T>(rows),
      success: true,
    })
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> {
    const stmt = this.prepare()
    stmt.setReturnArrays(true)
    const rows = stmt.all(...this.boundParams())
    const values = this.mapRows<T>(rows)
    if (options?.columnNames) {
      const columnNames = stmt.columns().map((column) => column.name)
      return Promise.resolve(this.prependColumnNames<T>(columnNames, values))
    }
    return Promise.resolve(values)
  }

  private prependColumnNames<T>(columnNames: string[], values: T[]): [string[], ...T[]] {
    return [columnNames, ...values]
  }

  private boundParams(): SqliteBindable[] {
    return this.params.map(toSqliteBindable)
  }

  private getAllRows(): Record<string, unknown>[] {
    return this.prepare().all(...this.boundParams())
  }

  // D1PreparedStatement.all/run/raw は呼び出し側が任意の T を指定できる（Cloudflare の
  // 型定義自体が呼び出し側完全信頼の runtime boundary）。node:sqlite が返す
  // Record<string, unknown> 行を T へ変換するにはここでの型アサーションが必須であり、
  // 除去は不可能（TS2322: 'T' could be instantiated with an arbitrary type）。
  private mapRow<T>(row: Record<string, unknown>): T {
    return row as unknown as T
  }

  private mapRows<T>(rows: Record<string, unknown>[]): T[] {
    return rows.map((row) => this.mapRow<T>(row))
  }

  private prepare(): StatementSync {
    return this.db.prepare(this.query)
  }
}

function buildMeta(): D1Meta & Record<string, unknown> {
  return {
    changed_db: false,
    changes: 0,
    duration: 0,
    last_row_id: 0,
    rows_read: 0,
    rows_written: 0,
    size_after: 0,
  }
}

class SqliteD1Database implements D1Database {
  private readonly db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.db = db
  }

  prepare(query: string): D1PreparedStatement {
    return new SqliteD1PreparedStatement(this.db, query)
  }

  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    throw new Error(`SqliteD1Database.batch() is not implemented in the test shim (${statements.length} statements)`)
  }

  exec(query: string): Promise<D1ExecResult> {
    this.db.exec(query)
    return Promise.resolve({ count: 1, duration: 0 })
  }

  withSession(): D1DatabaseSession {
    throw new Error('SqliteD1Database.withSession() is not implemented in the test shim')
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error('SqliteD1Database.dump() is not implemented in the test shim')
  }
}

/**
 * in-memory の `node:sqlite` インスタンスを D1 互換の interface でラップして返す。
 */
export function createSqliteD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  return { d1: new SqliteD1Database(sqlite), sqlite }
}

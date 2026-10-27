import "server-only";
import type { Client, InValue } from "@libsql/client";
import {
  CompiledQuery,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type Kysely,
  type QueryResult,
} from "kysely";

// Better Auth가 쓰는 Kysely를 앱과 같은 libsql 클라이언트에 연결하는 최소한의 dialect.
// (@libsql/kysely-libsql은 오래된 libsql 클라이언트를 따로 끌고 와서 쓰지 않는다)

class LibsqlConnection implements DatabaseConnection {
  constructor(private client: Client) {}

  async executeQuery<R>(query: CompiledQuery): Promise<QueryResult<R>> {
    const res = await this.client.execute({ sql: query.sql, args: query.parameters as InValue[] });
    return {
      rows: res.rows as unknown as R[],
      numAffectedRows: BigInt(res.rowsAffected),
      insertId: res.lastInsertRowid,
    };
  }

  // eslint-disable-next-line require-yield
  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("streamQuery is not supported");
  }
}

class LibsqlDriver implements Driver {
  constructor(private client: Client) {}
  async init() {}
  async acquireConnection() {
    return new LibsqlConnection(this.client);
  }
  async beginTransaction(conn: DatabaseConnection) {
    await conn.executeQuery(CompiledQuery.raw("BEGIN"));
  }
  async commitTransaction(conn: DatabaseConnection) {
    await conn.executeQuery(CompiledQuery.raw("COMMIT"));
  }
  async rollbackTransaction(conn: DatabaseConnection) {
    await conn.executeQuery(CompiledQuery.raw("ROLLBACK"));
  }
  async releaseConnection() {}
  async destroy() {}
}

export class LibsqlDialect implements Dialect {
  constructor(private client: Client) {}
  createAdapter() {
    return new SqliteAdapter();
  }
  createDriver() {
    return new LibsqlDriver(this.client);
  }
  createIntrospector(db: Kysely<unknown>) {
    return new SqliteIntrospector(db);
  }
  createQueryCompiler() {
    return new SqliteQueryCompiler();
  }
}

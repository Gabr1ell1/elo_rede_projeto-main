// Para que serve este arquivo: Abre e prepara o banco SQLite usado somente pelos lembretes (Android/iOS).
// Onde ele é usado: lembreteRepository.ts pede o banco por getDatabase() antes de cada operação.

import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

const NOME_DO_BANCO = "elo-lembretes.db";

// Guarda a abertura em andamento: várias telas pedindo o banco ao mesmo tempo reaproveitam a mesma promessa.
let abertura: Promise<SQLiteDatabase> | null = null;

// Devolve o banco já inicializado. A tabela só existe depois da inicialização assíncrona terminar,
// por isso toda leitura ou escrita deve esperar esta função.
export function getDatabase(): Promise<SQLiteDatabase> {
    if (!abertura) {
        abertura = abrirEPreparar().catch((erro) => {
            // Falhou: libera para a próxima chamada tentar de novo, em vez de guardar o erro para sempre.
            abertura = null;
            throw new Error(`Não foi possível iniciar o banco de lembretes. ${erro instanceof Error ? erro.message : ""}`.trim());
        });
    }
    return abertura;
}

async function abrirEPreparar(): Promise<SQLiteDatabase> {
    const db = await SQLite.openDatabaseAsync(NOME_DO_BANCO);
    // WAL deixa leituras e escritas conviverem melhor.
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await migrar(db);
    return db;
}

// Versão do esquema guardada no próprio arquivo (PRAGMA user_version). Para mudar a tabela no futuro,
// basta somar um bloco "if (versao < 2)" aqui, sem apagar os dados já salvos.
async function migrar(db: SQLiteDatabase): Promise<void> {
    const resultado = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    const versao = resultado?.user_version ?? 0;

    if (versao < 1) {
        await db.withTransactionAsync(async () => {
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS lembretes (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario_id      TEXT    NOT NULL,
                    categoria       TEXT    NOT NULL CHECK (categoria IN ('CONSULTA','SUPERVISAO','PLATAFORMA','GERAL')),
                    titulo          TEXT    NOT NULL,
                    descricao       TEXT    NOT NULL DEFAULT '',
                    data_hora       INTEGER NOT NULL,
                    referencia_id   TEXT,
                    notificacao_id  TEXT,
                    ativo           INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1))
                );
                CREATE INDEX IF NOT EXISTS idx_lembretes_usuario ON lembretes (usuario_id, data_hora);
            `);
            await db.execAsync("PRAGMA user_version = 1");
        });
    }
    if (versao < 2) {
        await db.withTransactionAsync(async () => {
            await db.execAsync(`
                CREATE TABLE IF NOT EXISTS cache (
                    chave TEXT PRIMARY KEY NOT NULL,
                    valor TEXT NOT NULL,
                    salvo_em INTEGER NOT NULL,
                    ttl_segundos INTEGER NOT NULL CHECK (ttl_segundos >= 0)
                );
            `);
            await db.execAsync("PRAGMA user_version = 2");
        });
    }
}

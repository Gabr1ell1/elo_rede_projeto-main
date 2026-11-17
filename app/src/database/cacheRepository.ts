// Para que serve este arquivo: Guarda valores serializados com prazo de validade no SQLite nativo.
// Onde ele é usado: services/cache.ts oferece acesso ao hook sem expor SQL à tela.

import { getDatabase } from "./database";

export type ItemCache<T> = { chave: string; valor: T; salvoEm: number; ttlSegundos: number; expirado: boolean };

export class CacheRepository {
    // CREATE/UPDATE: grava ou substitui uma chave e reinicia seu prazo de persistência.
    static async salvar<T>(chave: string, valor: T, ttlSegundos: number): Promise<void> {
        if (!Number.isFinite(ttlSegundos) || ttlSegundos < 0) throw new Error("O prazo do cache deve ser um número positivo.");
        const db = await getDatabase();
        await db.runAsync(
            "INSERT INTO cache (chave, valor, salvo_em, ttl_segundos) VALUES (?, ?, ?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, salvo_em = excluded.salvo_em, ttl_segundos = excluded.ttl_segundos",
            [chave, JSON.stringify(valor), Date.now(), ttlSegundos]
        );
    }

    // READ: devolve também os metadados para permitir sincronizar valores expirados com o servidor.
    static async buscar<T>(chave: string): Promise<ItemCache<T> | null> {
        const db = await getDatabase();
        const linha = await db.getFirstAsync<{ chave: string; valor: string; salvo_em: number; ttl_segundos: number }>("SELECT * FROM cache WHERE chave = ?", [chave]);
        if (!linha) return null;
        return { chave: linha.chave, valor: JSON.parse(linha.valor) as T, salvoEm: linha.salvo_em, ttlSegundos: linha.ttl_segundos, expirado: Date.now() >= linha.salvo_em + linha.ttl_segundos * 1000 };
    }

    // DELETE: remove uma entrada sem afetar as demais.
    static async excluir(chave: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM cache WHERE chave = ?", [chave]);
    }
}

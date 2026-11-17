// Para que serve este arquivo: Mantém a versão Web funcionando sem carregar o SQLite nativo.
// Onde ele é usado: o Expo escolhe este arquivo no navegador no lugar de database.native.ts.

import type { SQLiteDatabase } from "expo-sqlite";

// Na Web os lembretes não existem; quem chamar recebe um erro claro (a tela já avisa antes).
export function getDatabase(): Promise<SQLiteDatabase> {
    return Promise.reject(new Error("Os lembretes locais estão disponíveis apenas no aplicativo Android."));
}

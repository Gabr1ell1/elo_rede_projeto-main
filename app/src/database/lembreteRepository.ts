// Para que serve este arquivo: Concentra todo o SQL da tabela de lembretes (criar, ler, atualizar e excluir).
// Onde ele é usado: services/lembretes.ts. Telas e hooks nunca falam SQL; só chamam o serviço.

import { CategoriaLembrete, DadosLembrete, Lembrete } from "../types/lembrete";
import { getDatabase } from "./database";

// Formato bruto de uma linha da tabela (colunas em snake_case, booleano como 0/1).
type LinhaLembrete = {
    id: number;
    usuario_id: string;
    categoria: CategoriaLembrete;
    titulo: string;
    descricao: string;
    data_hora: number;
    referencia_id: string | null;
    notificacao_id: string | null;
    ativo: number;
};

// Campos que o serviço pode alterar depois da criação.
export type AlteracoesLembrete = Partial<Pick<Lembrete, "categoria" | "titulo" | "descricao" | "dataHora" | "referenciaId" | "notificacaoId" | "ativo">>;

// Formato enxuto para a seção de depuração da tela.
export type LinhaDepuracaoLembrete = { id: number; titulo: string; data_hora: number; notificacao_id: string | null; ativo: number };
export type DiagnosticoBancoLembretes = { userVersion: number; total: number; linhas: LinhaDepuracaoLembrete[] };

// Lista branca: só estes nomes viram parte do SQL, então um campo inesperado nunca chega ao comando.
const COLUNAS: Record<keyof AlteracoesLembrete, string> = {
    categoria: "categoria",
    titulo: "titulo",
    descricao: "descricao",
    dataHora: "data_hora",
    referenciaId: "referencia_id",
    notificacaoId: "notificacao_id",
    ativo: "ativo",
};

function paraLembrete(linha: LinhaLembrete): Lembrete {
    return {
        id: linha.id,
        usuarioId: linha.usuario_id,
        categoria: linha.categoria,
        titulo: linha.titulo,
        descricao: linha.descricao,
        dataHora: linha.data_hora,
        referenciaId: linha.referencia_id,
        notificacaoId: linha.notificacao_id,
        ativo: linha.ativo === 1,
    };
}

export class LembreteRepository {
    // READ: devolve as linhas cruas e metadados do banco para conferência local.
    static async listarTodasLinhas(): Promise<DiagnosticoBancoLembretes> {
        const db = await getDatabase();
        const [linhas, versao] = await Promise.all([
            db.getAllAsync<LinhaDepuracaoLembrete>("SELECT id, titulo, data_hora, notificacao_id, ativo FROM lembretes ORDER BY id ASC"),
            db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"),
        ]);
        return { userVersion: versao?.user_version ?? 0, total: linhas.length, linhas };
    }

    // CREATE: grava um lembrete novo e devolve o registro completo, já com o id gerado pelo banco.
    static async criar(usuarioId: string, dados: DadosLembrete, dataHora: number): Promise<Lembrete> {
        const db = await getDatabase();
        const resultado = await db.runAsync(
            `INSERT INTO lembretes (usuario_id, categoria, titulo, descricao, data_hora, referencia_id, notificacao_id, ativo)
             VALUES (?, ?, ?, ?, ?, ?, NULL, 1)`,
            [usuarioId, dados.categoria, dados.titulo, dados.descricao, dataHora, dados.referenciaId]
        );
        const criado = await this.buscarPorId(resultado.lastInsertRowId);
        if (!criado) throw new Error("O lembrete não foi encontrado depois de salvar.");
        return criado;
    }

    // READ: todos os lembretes de um usuário, do mais próximo para o mais distante.
    static async listarPorUsuario(usuarioId: string): Promise<Lembrete[]> {
        const db = await getDatabase();
        const linhas = await db.getAllAsync<LinhaLembrete>(
            "SELECT * FROM lembretes WHERE usuario_id = ? ORDER BY data_hora ASC",
            [usuarioId]
        );
        return linhas.map(paraLembrete);
    }

    // READ: um lembrete pelo id, ou null se não existir.
    static async buscarPorId(id: number): Promise<Lembrete | null> {
        const db = await getDatabase();
        const linha = await db.getFirstAsync<LinhaLembrete>("SELECT * FROM lembretes WHERE id = ?", [id]);
        return linha ? paraLembrete(linha) : null;
    }

    // UPDATE: altera só os campos informados e devolve o registro atualizado.
    static async atualizar(id: number, alteracoes: AlteracoesLembrete): Promise<Lembrete> {
        const chaves = (Object.keys(alteracoes) as (keyof AlteracoesLembrete)[]).filter((chave) => chave in COLUNAS);
        if (chaves.length === 0) {
            const atual = await this.buscarPorId(id);
            if (!atual) throw new Error("Lembrete não encontrado.");
            return atual;
        }
        const db = await getDatabase();
        const trechos = chaves.map((chave) => `${COLUNAS[chave]} = ?`).join(", ");
        const valores = chaves.map((chave) => {
            const valor = alteracoes[chave];
            return typeof valor === "boolean" ? (valor ? 1 : 0) : (valor ?? null);
        });
        const resultado = await db.runAsync(`UPDATE lembretes SET ${trechos} WHERE id = ?`, [...valores, id]);
        if (resultado.changes === 0) throw new Error("Lembrete não encontrado.");
        const atualizado = await this.buscarPorId(id);
        if (!atualizado) throw new Error("Lembrete não encontrado.");
        return atualizado;
    }

    // DELETE: remove o lembrete. Não é erro apagar algo que já não existe.
    static async excluir(id: number): Promise<void> {
        const db = await getDatabase();
        await db.runAsync("DELETE FROM lembretes WHERE id = ?", [id]);
    }
}

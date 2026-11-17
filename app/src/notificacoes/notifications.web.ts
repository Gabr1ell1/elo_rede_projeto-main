// Para que serve este arquivo: Versão da classe Notifications para o navegador, que não agenda nada.
// Onde ele é usado: o Expo escolhe este arquivo na Web, então expo-notifications nem chega a ser carregado.

import { CategoriaLembrete } from "../types/lembrete";

export type ConteudoNotificacao = {
    titulo: string;
    mensagem: string;
    categoria: CategoriaLembrete;
    dados?: Record<string, unknown>;
};

export type DiagnosticoNotificacoes = {
    permitido: boolean;
    canaisDesativados: CategoriaLembrete[];
};
export type NotificacaoAgendada = { id: string; titulo: string; mensagem: string; dataHora: number };

const INDISPONIVEL = "As notificações locais estão disponíveis apenas no aplicativo Android.";

// Mesma interface da versão nativa: o resto do app não precisa saber em que plataforma está.
export class Notifications {
    static readonly suportado = false;
    static async configurar(): Promise<void> { /* nada a configurar na Web */ }
    static async garantirPermissao(): Promise<boolean> { return false; }
    static async permissaoConcedida(): Promise<boolean> { return false; }
    static async diagnosticar(): Promise<DiagnosticoNotificacoes> { return { permitido: false, canaisDesativados: [] }; }
    static async agendarNaData(_conteudo: ConteudoNotificacao, _data: Date): Promise<string> { throw new Error(INDISPONIVEL); }
    static async agendarEmSegundos(_conteudo: ConteudoNotificacao, _tempoSegundos: number): Promise<string> { throw new Error(INDISPONIVEL); }
    static async cancelar(_notificacaoId: string | null): Promise<void> { /* nada agendado na Web */ }
    static async cancelarTodas(): Promise<void> { /* nada agendado na Web */ }
    static async listarIdsAgendados(): Promise<Set<string>> { return new Set(); }
    static async listarAgendadas(): Promise<NotificacaoAgendada[]> { return []; }
}

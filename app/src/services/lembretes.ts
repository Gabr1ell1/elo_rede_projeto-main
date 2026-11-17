// Para que serve este arquivo: Orquestra banco (SQLite) e agendamento (Notifications) para manter os dois sempre coerentes.
// Onde ele é usado: hooks use-lembretes e use-sincronizar-lembretes. É o único lugar que une Repository e Notifications.

import { LembreteRepository } from "../database/lembreteRepository";
import { DadosLembrete, Disparo, Lembrete } from "../types/lembrete";
import { validarLembrete } from "../validacoes/lembrete";
import { ConteudoNotificacao, Notifications } from "../notificacoes/notifications";

// Erro específico para a tela poder oferecer o botão "Abrir configurações".
export class ErroPermissaoNotificacao extends Error {
    constructor() {
        super("As notificações estão desativadas para o ELO. Ative-as nas configurações do Android para receber seus lembretes.");
        this.name = "ErroPermissaoNotificacao";
    }
}

// ===== Fila de operações =====
// Toques rápidos, a sincronização do login e a limpeza do logout podem acontecer ao mesmo tempo.
// A fila faz uma operação começar só depois da anterior terminar, evitando que se atropelem.
let fila: Promise<unknown> = Promise.resolve();
function emSerie<T>(tarefa: () => Promise<T>): Promise<T> {
    const proxima = fila.then(tarefa, tarefa);
    fila = proxima.catch(() => undefined);
    return proxima;
}

function exigirSuporte(): void {
    if (!Notifications.suportado) throw new Error("Os lembretes locais estão disponíveis apenas no aplicativo Android.");
}

async function exigirPermissao(): Promise<void> {
    if (!(await Notifications.garantirPermissao())) throw new ErroPermissaoNotificacao();
}

function montarConteudo(lembrete: Pick<Lembrete, "id" | "usuarioId" | "categoria" | "titulo" | "descricao" | "referenciaId">): ConteudoNotificacao {
    return {
        titulo: lembrete.titulo,
        mensagem: lembrete.descricao || "Toque para abrir o ELO.",
        categoria: lembrete.categoria,
        // O id do lembrete viaja junto da notificação: liga o aviso do aparelho ao registro do banco.
        dados: { lembreteId: lembrete.id, usuarioId: lembrete.usuarioId, referenciaId: lembrete.referenciaId },
    };
}

// Converte o "quando" em um momento exato (milissegundos).
function resolverMomento(disparo: Disparo): number {
    return "tempoSegundos" in disparo ? Date.now() + disparo.tempoSegundos * 1000 : disparo.dataHora;
}

// Agenda no aparelho e devolve o ID do agendamento. tempoSegundos usa o gatilho de intervalo; data usa o gatilho de data.
async function agendar(lembrete: Lembrete, disparo: Disparo | null): Promise<string> {
    const conteudo = montarConteudo(lembrete);
    if (disparo && "tempoSegundos" in disparo) return Notifications.agendarEmSegundos(conteudo, disparo.tempoSegundos);
    return Notifications.agendarNaData(conteudo, new Date(lembrete.dataHora));
}

// ===== Operações usadas pelos hooks =====

export function listarLembretes(usuarioId: string): Promise<Lembrete[]> {
    return LembreteRepository.listarPorUsuario(usuarioId);
}

// Consulta as linhas cruas e a versão do banco para a seção de depuração.
export function listarTodasLinhasLembretes() {
    return LembreteRepository.listarTodasLinhas();
}

// Cria o lembrete: valida -> permissão -> salva no SQLite -> agenda -> guarda o ID do agendamento.
export function criarLembrete(usuarioId: string, dados: DadosLembrete, disparo: Disparo): Promise<Lembrete> {
    return emSerie(async () => {
        exigirSuporte();
        const problema = validarLembrete(dados, disparo);
        if (problema) throw new Error(problema);
        await exigirPermissao();

        const salvo = await LembreteRepository.criar(usuarioId, normalizar(dados), resolverMomento(disparo));
        let notificacaoId: string | null = null;
        try {
            notificacaoId = await agendar(salvo, disparo);
            return await LembreteRepository.atualizar(salvo.id, { notificacaoId });
        } catch (erro) {
            // Compensação: se agendar ou gravar o ID falhou, desfaz o que já foi feito para não sobrar lembrete "fantasma".
            await Notifications.cancelar(notificacaoId).catch(() => undefined);
            await LembreteRepository.excluir(salvo.id).catch(() => undefined);
            throw erro;
        }
    });
}

// Edita o lembrete. Se estiver ativo, o agendamento novo nasce ANTES de o antigo ser cancelado,
// assim nunca ficamos sem nenhum dos dois.
export function editarLembrete(lembrete: Lembrete, dados: DadosLembrete, disparo: Disparo): Promise<Lembrete> {
    return emSerie(async () => {
        exigirSuporte();
        const problema = validarLembrete(dados, disparo);
        if (problema) throw new Error(problema);
        const campos = { ...normalizar(dados), dataHora: resolverMomento(disparo) };

        if (!lembrete.ativo) return LembreteRepository.atualizar(lembrete.id, campos);

        await exigirPermissao();
        const novoId = await agendar({ ...lembrete, ...campos }, disparo);
        try {
            const atualizado = await LembreteRepository.atualizar(lembrete.id, { ...campos, notificacaoId: novoId });
            await Notifications.cancelar(lembrete.notificacaoId).catch(() => undefined);
            return atualizado;
        } catch (erro) {
            await Notifications.cancelar(novoId).catch(() => undefined);
            throw erro;
        }
    });
}

// ativar_lembrete: marca como ativo e agenda de novo. Só é possível se o horário ainda não passou.
export function ativarLembrete(lembrete: Lembrete): Promise<Lembrete> {
    return emSerie(async () => {
        exigirSuporte();
        if (lembrete.dataHora < Date.now() + 1000) throw new Error("Este horário já passou. Edite a data e a hora para ativar o lembrete.");
        await exigirPermissao();
        // Se ainda existir um agendamento antigo, ele sai antes para não notificar duas vezes.
        await Notifications.cancelar(lembrete.notificacaoId).catch(() => undefined);
        const novoId = await agendar(lembrete, null);
        try {
            return await LembreteRepository.atualizar(lembrete.id, { ativo: true, notificacaoId: novoId });
        } catch (erro) {
            await Notifications.cancelar(novoId).catch(() => undefined);
            throw erro;
        }
    });
}

// desativar_lembrete: cancela o agendamento primeiro; só então registra "desativado" no banco.
export function desativarLembrete(lembrete: Lembrete): Promise<Lembrete> {
    return emSerie(async () => {
        await Notifications.cancelar(lembrete.notificacaoId);
        return LembreteRepository.atualizar(lembrete.id, { ativo: false, notificacaoId: null });
    });
}

export function excluirLembrete(lembrete: Lembrete): Promise<void> {
    return emSerie(async () => {
        await Notifications.cancelar(lembrete.notificacaoId);
        await LembreteRepository.excluir(lembrete.id);
    });
}

export type ResumoSincronizacao = { reagendados: number; semPermissao: boolean };

// Compara o que o banco diz com o que o Android realmente tem agendado e corrige as diferenças.
// Cobre: app reinstalado/dados limpos, permissão revogada e depois devolvida, logout e outro usuário no mesmo aparelho.
export function sincronizarLembretes(usuarioId: string): Promise<ResumoSincronizacao> {
    return emSerie(async () => {
        if (!Notifications.suportado) return { reagendados: 0, semPermissao: false };
        await Notifications.configurar();
        const [lembretes, agendados] = await Promise.all([
            LembreteRepository.listarPorUsuario(usuarioId),
            Notifications.listarIdsAgendados(),
        ]);
        const permitido = await Notifications.permissaoConcedida();
        const esperados = new Set<string>();
        let reagendados = 0;
        let semPermissao = false;
        const agora = Date.now();

        for (const lembrete of lembretes) {
            const agendado = !!lembrete.notificacaoId && agendados.has(lembrete.notificacaoId);

            // Desativado ou horário já passado: não deve haver agendamento, nem ID guardado.
            if (!lembrete.ativo || lembrete.dataHora <= agora) {
                if (agendado) await Notifications.cancelar(lembrete.notificacaoId);
                if (lembrete.notificacaoId) await LembreteRepository.atualizar(lembrete.id, { notificacaoId: null });
                continue;
            }
            if (agendado) { esperados.add(lembrete.notificacaoId as string); continue; }

            // Ativo e futuro, mas sumiu do aparelho: agenda de novo (sem abrir pedido de permissão aqui).
            if (!permitido) { semPermissao = true; continue; }
            const novoId = await agendar(lembrete, null);
            await LembreteRepository.atualizar(lembrete.id, { notificacaoId: novoId });
            esperados.add(novoId);
            reagendados += 1;
        }

        // Qualquer agendamento que o banco não reconhece é "órfão" (lembrete apagado, outro usuário): cancela.
        for (const id of agendados) if (!esperados.has(id)) await Notifications.cancelar(id);
        return { reagendados, semPermissao };
    });
}

// Chamada ao sair da conta: tira os avisos do aparelho para que a próxima pessoa não receba lembretes de outra.
// Os registros continuam no SQLite e voltam a ser agendados por sincronizarLembretes no próximo login.
export function suspenderAgendamentos(): Promise<void> {
    return emSerie(() => Notifications.cancelarTodas());
}

function normalizar(dados: DadosLembrete): DadosLembrete {
    return { ...dados, titulo: dados.titulo.trim(), descricao: dados.descricao.trim() };
}

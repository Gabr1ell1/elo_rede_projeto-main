// Para que serve este arquivo: Dá à tela de lembretes a lista, as ações (criar, editar, ativar...) e os avisos de permissão.
// Onde ele é usado: src/app/(app)/lembretes.tsx. A lógica pesada fica em services/lembretes.ts.

import { useCallback, useEffect, useState } from "react";
import { AppState, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { motivoDoErro, useAlerta } from "../context/AlertaContext";
import {
    ativarLembrete,
    criarLembrete,
    desativarLembrete,
    editarLembrete,
    ErroPermissaoNotificacao,
    excluirLembrete,
    listarLembretes,
    sincronizarLembretes,
} from "../services/lembretes";
import { Notifications } from "../notificacoes/notifications";
import { CATEGORIAS_LEMBRETE } from "../constants/lembretes";
import { DadosLembrete, Disparo, Lembrete } from "../types/lembrete";

export function useLembretes() {
    const { user } = useAuth();
    const { mostrarErro } = useAlerta();
    const [lembretes, setLembretes] = useState<Lembrete[]>([]);
    const [carregando, setCarregando] = useState(Notifications.suportado);
    // Texto de alerta quando a permissão ou algum canal foi desligado nas configurações do Android.
    const [aviso, setAviso] = useState<string | null>(null);
    const [notificacoesAgendadas, setNotificacoesAgendadas] = useState<{ id: string; titulo: string; mensagem: string; dataHora: number }[]>([]);
    const userId = user?.userId;

    // Lê o SQLite, confere os agendamentos do aparelho e monta o aviso de permissões. Só devolve dados; quem chama atualiza a tela.
    const buscar = useCallback(async () => {
        if (!userId || !Notifications.suportado) return null;
        await sincronizarLembretes(userId);
        const lista = await listarLembretes(userId);
        const diagnostico = await Notifications.diagnosticar();
        let novoAviso: string | null = null;
        if (!diagnostico.permitido) {
            novoAviso = "As notificações estão desativadas para o ELO. Ative-as para receber os lembretes.";
        } else if (diagnostico.canaisDesativados.length > 0) {
            const nomes = diagnostico.canaisDesativados.map((c) => CATEGORIAS_LEMBRETE[c].rotulo).join(", ");
            novoAviso = `Você silenciou estas categorias nas configurações do Android: ${nomes}.`;
        }
        const notificacoes = await Notifications.listarAgendadas();
        return { lista, novoAviso, notificacoes };
    }, [userId]);

    // Guarda o resultado de buscar() no estado da tela.
    const aplicar = useCallback((resultado: Awaited<ReturnType<typeof buscar>>) => {
        if (resultado) { setLembretes(resultado.lista); setAviso(resultado.novoAviso); setNotificacoesAgendadas(resultado.notificacoes); }
        setCarregando(false);
    }, []);

    const falhou = useCallback((erro: unknown) => {
        setCarregando(false);
        mostrarErro("Erro ao carregar lembretes", motivoDoErro(erro));
    }, [mostrarErro]);

    // Carga inicial (e nova carga se a conta mudar).
    useEffect(() => {
        let ativo = true;
        buscar().then((resultado) => { if (ativo) aplicar(resultado); }).catch((erro) => { if (ativo) falhou(erro); });
        return () => { ativo = false; };
    }, [buscar, aplicar, falhou]);

    // Ao voltar das configurações do Android, confere de novo se a pessoa liberou as notificações.
    useEffect(() => {
        const assinatura = AppState.addEventListener("change", (estado) => {
            if (estado === "active") buscar().then(aplicar).catch(falhou);
        });
        return () => assinatura.remove();
    }, [buscar, aplicar, falhou]);

    // Executa uma ação do serviço, atualiza a lista e transforma falhas em alerta. Devolve se deu certo.
    const executar = useCallback(async (titulo: string, acao: () => Promise<unknown>): Promise<boolean> => {
        try {
            await acao();
            if (userId) { setLembretes(await listarLembretes(userId)); setNotificacoesAgendadas(await Notifications.listarAgendadas()); }
            return true;
        } catch (erro) {
            mostrarErro(titulo, erro instanceof ErroPermissaoNotificacao ? erro.message : motivoDoErro(erro));
            // Permissão negada: confere o estado real para mostrar o aviso com o botão de configurações.
            if (erro instanceof ErroPermissaoNotificacao) buscar().then(aplicar).catch(falhou);
            return false;
        }
    }, [userId, mostrarErro, buscar, aplicar, falhou]);

    return {
        suportado: Notifications.suportado,
        lembretes,
        carregando,
        aviso,
        notificacoesAgendadas,
        abrirConfiguracoes: () => { void Linking.openSettings(); },
        criar: (dados: DadosLembrete, disparo: Disparo) =>
            executar("Não foi possível criar o lembrete", () => criarLembrete(userId as string, dados, disparo)),
        editar: (lembrete: Lembrete, dados: DadosLembrete, disparo: Disparo) =>
            executar("Não foi possível salvar o lembrete", () => editarLembrete(lembrete, dados, disparo)),
        alternar: (lembrete: Lembrete) =>
            executar(lembrete.ativo ? "Não foi possível desativar" : "Não foi possível ativar", () => (lembrete.ativo ? desativarLembrete(lembrete) : ativarLembrete(lembrete))),
        excluir: (lembrete: Lembrete) =>
            executar("Não foi possível excluir o lembrete", () => excluirLembrete(lembrete)),
    };
}

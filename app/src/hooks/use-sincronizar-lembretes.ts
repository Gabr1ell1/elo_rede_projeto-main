// Para que serve este arquivo: Mantém os agendamentos do aparelho alinhados ao banco enquanto a pessoa está logada.
// Onde ele é usado: src/app/(app)/_layout.tsx, que só existe para quem está autenticado.

import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { sincronizarLembretes, suspenderAgendamentos } from "../services/lembretes";
import { Notifications } from "../notificacoes/notifications";

export function useSincronizarLembretes() {
    const { user } = useAuth();
    const userId = user?.userId;

    useEffect(() => {
        if (!Notifications.suportado || !userId) return;

        // Entrou (ou trocou de conta): confere o banco com o Android e reagenda o que estiver faltando.
        sincronizarLembretes(userId).catch((erro) => console.warn("Falha ao sincronizar lembretes:", erro));

        // Saiu da conta (o grupo (app) deixa de existir): retira os avisos do aparelho.
        return () => {
            suspenderAgendamentos().catch((erro) => console.warn("Falha ao suspender lembretes:", erro));
        };
    }, [userId]);
}

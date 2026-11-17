// Para que serve este arquivo: Carrega os metadados do SQLite e os IDs de notificações para depuração.
// Onde ele é usado: seção recolhível da tela src/app/(app)/lembretes.tsx.

import { useCallback, useState } from "react";
import { Notifications } from "../notificacoes/notifications";
import { listarTodasLinhasLembretes } from "../services/lembretes";
import { DiagnosticoBancoLembretes } from "../database/lembreteRepository";

export function useDepuracaoLembretes() {
    const [banco, setBanco] = useState<DiagnosticoBancoLembretes | null>(null);
    const [idsAgendados, setIdsAgendados] = useState<string[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const atualizar = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const [resultadoBanco, ids] = await Promise.all([listarTodasLinhasLembretes(), Notifications.listarIdsAgendados()]);
            setBanco(resultadoBanco);
            setIdsAgendados([...ids]);
        } catch (falha) {
            setErro(falha instanceof Error ? falha.message : "Não foi possível ler os dados de depuração.");
        } finally {
            setCarregando(false);
        }
    }, []);
    return { banco, idsAgendados, carregando, erro, atualizar };
}

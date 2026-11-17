// Para que serve este arquivo: Mantém um valor em cache local e informa quando seu prazo terminou.
// Onde ele é usado: telas e serviços que precisam exibir dados locais enquanto atualizam o servidor.

import { useCallback, useEffect, useState } from "react";
import { buscarCache, excluirCache, ItemCache, salvarCache } from "../services/cache";

export function useCache<T>(chave: string) {
    const [item, setItem] = useState<ItemCache<T> | null>(null);
    const [carregando, setCarregando] = useState(true);
    const atualizar = useCallback(async () => {
        setCarregando(true);
        try { setItem(await buscarCache<T>(chave)); }
        finally { setCarregando(false); }
    }, [chave]);
    useEffect(() => { let ativo = true; buscarCache<T>(chave).then((resultado) => { if (ativo) setItem(resultado); }).finally(() => { if (ativo) setCarregando(false); }); return () => { ativo = false; }; }, [chave]);
    const guardar = useCallback(async (valor: T, ttlSegundos = 3 * 60 * 60) => { await salvarCache(chave, valor, ttlSegundos); await atualizar(); }, [chave, atualizar]);
    const remover = useCallback(async () => { await excluirCache(chave); setItem(null); }, [chave]);
    return { item, valor: item?.valor ?? null, expirado: item?.expirado ?? false, carregando, guardar, atualizar, remover };
}

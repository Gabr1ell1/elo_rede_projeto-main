// Para que serve este arquivo: Expõe as operações do cache local e sua leitura para sincronização.
// Onde ele é usado: hook useCache e qualquer fluxo de dados que precise persistência temporária.

import { CacheRepository, ItemCache } from "../database/cacheRepository";

export const salvarCache = CacheRepository.salvar;
export const buscarCache = CacheRepository.buscar;
export const excluirCache = CacheRepository.excluir;
export type { ItemCache };

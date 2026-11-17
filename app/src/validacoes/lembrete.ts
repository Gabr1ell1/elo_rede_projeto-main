// Para que serve este arquivo: Valida os campos do formulário de lembretes e converte data/hora digitadas.
// Onde ele é usado: services/lembretes.ts (regras) e formulario-lembrete (conversão do que a pessoa digita).

import { TEMPO_MINIMO_SEGUNDOS } from "../constants/lembretes";
import { DadosLembrete, Disparo } from "../types/lembrete";

// Recebe "25/12/2026" e "14:30" e devolve o momento em milissegundos, ou null se algo for inválido (ex.: 31/02).
export function interpretarDataHora(data: string, hora: string): number | null {
    const d = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data.trim());
    const h = /^(\d{2}):(\d{2})$/.exec(hora.trim());
    if (!d || !h) return null;
    const [dia, mes, ano, horas, minutos] = [d[1], d[2], d[3], h[1], h[2]].map(Number);
    const momento = new Date(ano, mes - 1, dia, horas, minutos, 0, 0);
    // O Date "corrige" datas impossíveis (31/02 vira março); comparar de volta detecta isso.
    const confere = momento.getFullYear() === ano && momento.getMonth() === mes - 1 && momento.getDate() === dia
        && momento.getHours() === horas && momento.getMinutes() === minutos;
    return confere ? momento.getTime() : null;
}

// Devolve a mensagem do primeiro problema encontrado, ou null quando está tudo certo.
export function validarLembrete(dados: DadosLembrete, disparo: Disparo, agora = Date.now()): string | null {
    if (dados.titulo.trim().length < 3) return "Digite um título com pelo menos 3 letras.";
    if (dados.titulo.trim().length > 80) return "O título pode ter no máximo 80 caracteres.";
    if (dados.descricao.trim().length > 240) return "A descrição pode ter no máximo 240 caracteres.";
    if ("tempoSegundos" in disparo) {
        if (!Number.isFinite(disparo.tempoSegundos) || disparo.tempoSegundos < TEMPO_MINIMO_SEGUNDOS) {
            return `Escolha um tempo de pelo menos ${TEMPO_MINIMO_SEGUNDOS} segundos.`;
        }
        return null;
    }
    if (!Number.isFinite(disparo.dataHora)) return "Informe uma data e uma hora válidas.";
    if (disparo.dataHora < agora + TEMPO_MINIMO_SEGUNDOS * 1000) return "Escolha uma data e hora no futuro.";
    return null;
}

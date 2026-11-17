// Para que serve este arquivo: Guarda os textos e ícones de cada categoria de lembrete e as regras de tempo.
// Onde ele é usado: cartão e formulário de lembretes, validação e serviço de lembretes.

import { Ionicons } from "@expo/vector-icons";
import { CategoriaLembrete } from "../types/lembrete";
import { Role } from "../types/auth";

export const CATEGORIAS_LEMBRETE: Record<CategoriaLembrete, { rotulo: string; icone: keyof typeof Ionicons.glyphMap }> = {
    CONSULTA: { rotulo: "Consulta", icone: "calendar-outline" },
    SUPERVISAO: { rotulo: "Supervisão", icone: "people-outline" },
    PLATAFORMA: { rotulo: "Novidades da ELO", icone: "megaphone-outline" },
    GERAL: { rotulo: "Lembrete geral", icone: "notifications-outline" },
};

// Cada perfil enxerga só as categorias que fazem sentido para ele.
export const CATEGORIAS_POR_PERFIL: Record<Role, CategoriaLembrete[]> = {
    PATIENT: ["CONSULTA", "PLATAFORMA", "GERAL"],
    PSYCHOLOGIST: ["CONSULTA", "SUPERVISAO", "PLATAFORMA", "GERAL"],
};

// Atalhos de tempo_segundos usados para demonstrar o agendamento local rapidamente.
export const ATALHOS_TEMPO: { rotulo: string; segundos: number }[] = [
    { rotulo: "10 segundos", segundos: 10 },
    { rotulo: "1 minuto", segundos: 60 },
    { rotulo: "5 minutos", segundos: 300 },
];

// Antecedência oferecida nos lembretes de consulta, em minutos.
export const ANTECEDENCIAS: { rotulo: string; minutos: number }[] = [
    { rotulo: "15 min antes", minutos: 15 },
    { rotulo: "1 h antes", minutos: 60 },
    { rotulo: "1 dia antes", minutos: 1440 },
];

// Menor intervalo aceito entre agora e o disparo, para o alarme não nascer "vencido".
export const TEMPO_MINIMO_SEGUNDOS = 5;

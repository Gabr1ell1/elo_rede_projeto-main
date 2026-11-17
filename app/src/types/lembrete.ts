// Para que serve este arquivo: Define os formatos de dados da funcionalidade de lembretes.
// Onde ele é usado: banco SQLite, repositório, serviço de lembretes, hooks e telas de lembretes.

// As quatro situações pedidas: consultas, supervisões, novidades da plataforma e lembretes gerais.
export type CategoriaLembrete = "CONSULTA" | "SUPERVISAO" | "PLATAFORMA" | "GERAL";

// Um lembrete como o app o enxerga (já convertido das colunas do SQLite).
export type Lembrete = {
    id: number;
    usuarioId: string;
    categoria: CategoriaLembrete;
    titulo: string;
    descricao: string;
    // Momento do disparo, em milissegundos desde 1970 (formato do Date.now()).
    dataHora: number;
    // Id da consulta (ou supervisão) relacionada; null quando o lembrete é avulso.
    referenciaId: string | null;
    // Identificador devolvido pelo Expo Notifications; null quando não há agendamento no aparelho.
    notificacaoId: string | null;
    ativo: boolean;
};

// Campos que a pessoa preenche; o resto (id, usuário, agendamento) é responsabilidade das camadas internas.
export type DadosLembrete = {
    categoria: CategoriaLembrete;
    titulo: string;
    descricao: string;
    referenciaId: string | null;
};

// Define QUANDO a notificação dispara: daqui a N segundos (tempoSegundos) ou em uma data e hora exatas.
export type Disparo = { tempoSegundos: number } | { dataHora: number };

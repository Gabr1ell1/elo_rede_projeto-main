// Para que serve este arquivo: Única classe que fala com o Expo Notifications (canais, permissão, agendar e cancelar).
// Onde ele é usado: services/lembretes.ts e hooks de lembretes. Telas nunca importam expo-notifications direto.

import * as ExpoNotifications from "expo-notifications";
import { AndroidImportance, SchedulableTriggerInputTypes } from "expo-notifications";
import { Platform } from "react-native";
import { COLORS } from "../constants/cores";
import { CategoriaLembrete } from "../types/lembrete";

// Cada categoria tem seu canal. No Android 8+ o canal é o que a pessoa vê (e pode silenciar)
// em Configurações > Apps > ELO > Notificações.
const CANAIS: Record<CategoriaLembrete, { id: string; nome: string; descricao: string; importancia: AndroidImportance }> = {
    CONSULTA: { id: "elo-consultas", nome: "Lembretes de consultas", descricao: "Avisos de consultas psicológicas agendadas.", importancia: AndroidImportance.HIGH },
    SUPERVISAO: { id: "elo-supervisoes", nome: "Lembretes de supervisões", descricao: "Avisos de supervisões agendadas.", importancia: AndroidImportance.HIGH },
    PLATAFORMA: { id: "elo-plataforma", nome: "Atualizações da plataforma", descricao: "Novidades e acontecimentos da ELO.", importancia: AndroidImportance.DEFAULT },
    GERAL: { id: "elo-gerais", nome: "Lembretes gerais", descricao: "Lembretes criados por você.", importancia: AndroidImportance.DEFAULT },
};

export type ConteudoNotificacao = {
    titulo: string;
    mensagem: string;
    categoria: CategoriaLembrete;
    // Vai junto da notificação; usamos para saber a qual lembrete ela pertence.
    dados?: Record<string, unknown>;
};

export type DiagnosticoNotificacoes = {
    // false quando a pessoa negou (ou desligou) as notificações do app no Android.
    permitido: boolean;
    // Categorias cujo canal foi silenciado manualmente nas configurações do Android.
    canaisDesativados: CategoriaLembrete[];
};

export type NotificacaoAgendada = { id: string; titulo: string; mensagem: string; dataHora: number };

export class Notifications {
    static readonly suportado = true;

    // Guarda a configuração em andamento para ela rodar uma única vez, mesmo com chamadas simultâneas.
    private static configuracao: Promise<void> | null = null;

    // false quando o aparelho não conseguiu criar os canais (ex.: Expo Go). Nesse caso agendamos sem canal.
    private static canaisProntos = true;

    // Define como notificações se comportam com o app aberto e cria os canais do Android. É seguro chamar várias vezes.
    static configurar(): Promise<void> {
        if (!this.configuracao) {
            this.configuracao = this.configurarCanaisEHandler().catch((erro) => {
                this.configuracao = null;
                throw erro;
            });
        }
        return this.configuracao;
    }

    private static async configurarCanaisEHandler(): Promise<void> {
        // Com o app aberto, o Android não mostra notificações sozinho: este handler manda mostrar o aviso.
        ExpoNotifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        if (Platform.OS !== "android") return;
        try {
            for (const canal of Object.values(CANAIS)) {
                await ExpoNotifications.setNotificationChannelAsync(canal.id, {
                    name: canal.nome,
                    description: canal.descricao,
                    importance: canal.importancia,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: COLORS.primary,
                });
            }
        } catch (erro) {
            // Em alguns ambientes (como o Expo Go) a criação de canais falha. Não é motivo para travar o app.
            this.canaisProntos = false;
            console.warn("Não foi possível criar os canais de notificação:", erro);
        }
    }

    // Garante a permissão, pedindo à pessoa se ainda for possível. Devolve false se ela não foi concedida.
    static async garantirPermissao(): Promise<boolean> {
        // No Android 13+ o pedido só aparece se já existir ao menos um canal; por isso configurar() vem antes.
        await this.configurar();
        const atual = await ExpoNotifications.getPermissionsAsync();
        if (atual.granted) return true;
        if (!atual.canAskAgain) return false;
        const nova = await ExpoNotifications.requestPermissionsAsync();
        return nova.granted;
    }

    // Só consulta a permissão, sem abrir nenhum pedido. Usada na sincronização silenciosa.
    static async permissaoConcedida(): Promise<boolean> {
        const atual = await ExpoNotifications.getPermissionsAsync();
        return atual.granted;
    }

    // Verifica se a pessoa mexeu nas configurações do Android depois que o app foi instalado.
    static async diagnosticar(): Promise<DiagnosticoNotificacoes> {
        await this.configurar();
        const permitido = await this.permissaoConcedida();
        const canaisDesativados: CategoriaLembrete[] = [];
        if (Platform.OS === "android" && this.canaisProntos) {
            for (const [categoria, canal] of Object.entries(CANAIS) as [CategoriaLembrete, (typeof CANAIS)[CategoriaLembrete]][]) {
                const atual = await ExpoNotifications.getNotificationChannelAsync(canal.id);
                if (atual && atual.importance === AndroidImportance.NONE) canaisDesativados.push(categoria);
            }
        }
        return { permitido, canaisDesativados };
    }

    // Agenda uma notificação para uma data e hora exatas. Devolve o ID que identifica o agendamento.
    static async agendarNaData(conteudo: ConteudoNotificacao, data: Date): Promise<string> {
        await this.configurar();
        return ExpoNotifications.scheduleNotificationAsync({
            content: this.montarConteudo(conteudo),
            trigger: { type: SchedulableTriggerInputTypes.DATE, date: data, ...this.canal(conteudo.categoria) },
        });
    }

    // Agenda uma notificação para daqui a N segundos (parâmetro tempo_segundos). Devolve o ID do agendamento.
    static async agendarEmSegundos(conteudo: ConteudoNotificacao, tempoSegundos: number): Promise<string> {
        await this.configurar();
        return ExpoNotifications.scheduleNotificationAsync({
            content: this.montarConteudo(conteudo),
            trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: tempoSegundos, repeats: false, ...this.canal(conteudo.categoria) },
        });
    }

    // Cancela um agendamento pelo ID. Sem ID (ou ID que já não existe) não há o que fazer.
    static async cancelar(notificacaoId: string | null): Promise<void> {
        if (!notificacaoId) return;
        await ExpoNotifications.cancelScheduledNotificationAsync(notificacaoId);
    }

    static async cancelarTodas(): Promise<void> {
        await ExpoNotifications.cancelAllScheduledNotificationsAsync();
    }

    // IDs de tudo que o Android ainda tem agendado para o app. É a "verdade" usada para conferir o banco.
    static async listarIdsAgendados(): Promise<Set<string>> {
        const agendadas = await ExpoNotifications.getAllScheduledNotificationsAsync();
        return new Set(agendadas.map((item) => item.identifier));
    }

    // Lista o conteúdo e o horário dos avisos pendentes para a demonstração local.
    static async listarAgendadas(): Promise<NotificacaoAgendada[]> {
        const agendadas = await ExpoNotifications.getAllScheduledNotificationsAsync();
        return agendadas.map((item) => ({ id: item.identifier, titulo: item.content.title ?? "Lembrete", mensagem: item.content.body ?? "", dataHora: typeof item.trigger === "object" && item.trigger && "date" in item.trigger && item.trigger.date instanceof Date ? item.trigger.date.getTime() : Date.now() }));
    }

    // Devolve o canal da categoria, ou nada se os canais não puderam ser criados.
    private static canal(categoria: CategoriaLembrete): { channelId?: string } {
        return this.canaisProntos ? { channelId: CANAIS[categoria].id } : {};
    }

    private static montarConteudo(conteudo: ConteudoNotificacao): ExpoNotifications.NotificationContentInput {
        return {
            title: conteudo.titulo,
            body: conteudo.mensagem,
            data: conteudo.dados ?? {},
            sound: true,
            color: COLORS.primary,
        };
    }
}

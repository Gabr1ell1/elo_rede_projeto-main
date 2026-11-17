// Para que serve este arquivo: Aponta o verificador TypeScript para uma das versões por plataforma.
// Onde ele é usado: quem importa "./notifications"; o Expo carrega o .native ou o .web de verdade.

// Expo carrega o arquivo específico da plataforma; esta versão serve ao verificador TypeScript.
export { Notifications } from "./notifications.web";
export type { ConteudoNotificacao, DiagnosticoNotificacoes } from "./notifications.web";
export type { NotificacaoAgendada } from "./notifications.web";

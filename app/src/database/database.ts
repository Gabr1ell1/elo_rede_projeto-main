// Para que serve este arquivo: Aponta o verificador TypeScript para uma das versões por plataforma.
// Onde ele é usado: lembreteRepository.ts importa "./database"; o Expo carrega o .native ou o .web de verdade.

// Expo carrega o arquivo específico da plataforma; esta versão serve ao verificador TypeScript.
export { getDatabase } from "./database.web";

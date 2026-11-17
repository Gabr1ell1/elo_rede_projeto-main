// Para que serve este arquivo: Aplica as máscaras DD/MM/AAAA e HH:MM enquanto a pessoa digita.
// Onde ele é usado: formulário de lembretes.

// Recebe o texto digitado e devolve só dígitos no formato 25/12/2026.
export function mascararData(texto: string): string {
    const d = texto.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// Recebe o texto digitado e devolve só dígitos no formato 14:30.
export function mascararHora(texto: string): string {
    const d = texto.replace(/\D/g, "").slice(0, 4);
    return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

// Converte milissegundos em "25/12/2026" e "14:30" para preencher o formulário na edição.
export function dataEHoraParaCampos(ms: number): { data: string; hora: string } {
    const dt = new Date(ms);
    const p = (n: number) => String(n).padStart(2, "0");
    return { data: `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`, hora: `${p(dt.getHours())}:${p(dt.getMinutes())}` };
}

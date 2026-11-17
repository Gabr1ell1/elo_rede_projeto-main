// Para que serve este arquivo: Janela para criar ou editar um lembrete (categoria, texto e quando disparar).
// Onde ele é usado: src/app/(app)/lembretes.tsx.

import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/cores";
import { ANTECEDENCIAS, ATALHOS_TEMPO, CATEGORIAS_LEMBRETE } from "../../constants/lembretes";
import { formatarDataHora } from "../../formatacao/data-hora";
import { dataEHoraParaCampos, mascararData, mascararHora } from "../../formatacao/mascara-data-hora";
import { Appointment } from "../../types/clinic";
import { Role } from "../../types/auth";
import { CategoriaLembrete, DadosLembrete, Disparo, Lembrete } from "../../types/lembrete";
import { interpretarDataHora } from "../../validacoes/lembrete";

type Modo = "segundos" | "data" | "consulta";

const ROTULO_MODO: Record<Modo, string> = { segundos: "Daqui a pouco", data: "Data e hora", consulta: "Pela consulta" };

type Props = {
    // Quando vem preenchido, o formulário edita este lembrete; senão, cria um novo.
    lembrete: Lembrete | null;
    categorias: CategoriaLembrete[];
    consultas: Appointment[];
    perfil: Role | null;
    onFechar: () => void;
    // Devolve true quando salvou; o formulário só fecha nesse caso.
    onSalvar: (dados: DadosLembrete, disparo: Disparo) => Promise<boolean>;
};

// A tela só monta este componente enquanto a janela está aberta; por isso o estado inicial vem direto das props.
export function FormularioLembrete({ lembrete, categorias, consultas, perfil, onFechar, onSalvar }: Props) {
    const inicial = lembrete ? dataEHoraParaCampos(lembrete.dataHora) : { data: "", hora: "" };
    const [categoria, setCategoria] = useState<CategoriaLembrete>(lembrete?.categoria ?? (categorias.includes("GERAL") ? "GERAL" : categorias[0]));
    const [titulo, setTitulo] = useState(lembrete?.titulo ?? "");
    const [descricao, setDescricao] = useState(lembrete?.descricao ?? "");
    const [modo, setModo] = useState<Modo>(lembrete ? "data" : "segundos");
    const [segundos, setSegundos] = useState(ATALHOS_TEMPO[0].segundos);
    const [data, setData] = useState(inicial.data);
    const [hora, setHora] = useState(inicial.hora);
    const [consultaId, setConsultaId] = useState<string | null>(lembrete?.referenciaId ?? null);
    const [antecedencia, setAntecedencia] = useState(ANTECEDENCIAS[1].minutos);
    const [erro, setErro] = useState("");
    const [salvando, setSalvando] = useState(false);

    const editando = lembrete !== null;
    const modosDisponiveis: Modo[] = editando ? ["data"] : categoria === "CONSULTA" ? ["consulta", "data"] : ["segundos", "data"];

    function escolherCategoria(nova: CategoriaLembrete) {
        setCategoria(nova);
        setModo(nova === "CONSULTA" ? "consulta" : "segundos");
        setConsultaId(null);
    }

    // Ao escolher uma consulta, o título e a descrição já vêm sugeridos com os dados dela.
    function escolherConsulta(consulta: Appointment) {
        const outraPessoa = perfil === "PSYCHOLOGIST" ? consulta.patientName : consulta.psychologistName;
        setConsultaId(consulta.id);
        setTitulo(`Consulta com ${outraPessoa}`);
        setDescricao(formatarDataHora(consulta.date));
    }

    async function salvar() {
        setErro("");
        let disparo: Disparo;
        let referenciaId: string | null = editando ? lembrete.referenciaId : null;

        if (modo === "segundos") {
            disparo = { tempoSegundos: segundos };
        } else if (modo === "consulta") {
            const consulta = consultas.find((c) => c.id === consultaId);
            if (!consulta) { setErro("Escolha a consulta que deseja lembrar."); return; }
            disparo = { dataHora: new Date(consulta.date).getTime() - antecedencia * 60000 };
            referenciaId = consulta.id;
        } else {
            const momento = interpretarDataHora(data, hora);
            if (momento === null) { setErro("Digite a data como DD/MM/AAAA e a hora como HH:MM."); return; }
            disparo = { dataHora: momento };
        }

        setSalvando(true);
        const ok = await onSalvar({ categoria, titulo, descricao, referenciaId }, disparo);
        setSalvando(false);
        if (ok) onFechar();
    }

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onFechar}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
                <View style={styles.folha}>
                    <View style={styles.cabecalho}>
                        <Text style={styles.tituloJanela}>{editando ? "Editar lembrete" : "Novo lembrete"}</Text>
                        <Pressable accessibilityLabel="Fechar" onPress={onFechar} hitSlop={8} style={styles.fechar}>
                            <Ionicons name="close" size={23} color={COLORS.text} />
                        </Pressable>
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.corpo}>
                        {!editando && (
                            <>
                                <Text style={styles.rotulo}>Categoria</Text>
                                <View style={styles.chips}>
                                    {categorias.map((item) => (
                                        <Chip key={item} texto={CATEGORIAS_LEMBRETE[item].rotulo} ativo={categoria === item} onPress={() => escolherCategoria(item)} />
                                    ))}
                                </View>
                            </>
                        )}

                        {modo === "consulta" && !editando && (
                            <>
                                <Text style={styles.rotulo}>Consulta</Text>
                                {consultas.length === 0 && <Text style={styles.ajuda}>Você não tem consultas confirmadas futuras. Use “Data e hora”.</Text>}
                                {consultas.map((consulta) => (
                                    <Pressable key={consulta.id} onPress={() => escolherConsulta(consulta)} style={[styles.opcao, consultaId === consulta.id && styles.opcaoAtiva]}>
                                        <Ionicons name={consultaId === consulta.id ? "radio-button-on" : "radio-button-off"} size={18} color={COLORS.primaryDark} />
                                        <Text style={styles.opcaoTexto}>
                                            {(perfil === "PSYCHOLOGIST" ? consulta.patientName : consulta.psychologistName)} · {formatarDataHora(consulta.date)}
                                        </Text>
                                    </Pressable>
                                ))}
                                <Text style={styles.rotulo}>Avisar</Text>
                                <View style={styles.chips}>
                                    {ANTECEDENCIAS.map((item) => (
                                        <Chip key={item.minutos} texto={item.rotulo} ativo={antecedencia === item.minutos} onPress={() => setAntecedencia(item.minutos)} />
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={styles.rotulo}>Título</Text>
                        <TextInput style={styles.campo} value={titulo} onChangeText={setTitulo} placeholder="Ex.: Beber água" placeholderTextColor="#9AA8A6" maxLength={80} />

                        <Text style={styles.rotulo}>Descrição (opcional)</Text>
                        <TextInput style={[styles.campo, styles.campoLongo]} value={descricao} onChangeText={setDescricao} placeholder="Detalhes que aparecerão na notificação" placeholderTextColor="#9AA8A6" multiline maxLength={240} />

                        <Text style={styles.rotulo}>Quando avisar</Text>
                        {!editando && (
                            <View style={styles.chips}>
                                {modosDisponiveis.map((item) => (
                                    <Chip key={item} texto={ROTULO_MODO[item]} ativo={modo === item} onPress={() => setModo(item)} />
                                ))}
                            </View>
                        )}

                        {modo === "segundos" && (
                            <View style={styles.chips}>
                                {ATALHOS_TEMPO.map((item) => (
                                    <Chip key={item.segundos} texto={item.rotulo} ativo={segundos === item.segundos} onPress={() => setSegundos(item.segundos)} />
                                ))}
                            </View>
                        )}

                        {modo === "data" && (
                            <View style={styles.linha}>
                                <TextInput style={[styles.campo, styles.metade]} value={data} onChangeText={(t) => setData(mascararData(t))} placeholder="DD/MM/AAAA" placeholderTextColor="#9AA8A6" keyboardType="numeric" />
                                <TextInput style={[styles.campo, styles.metade]} value={hora} onChangeText={(t) => setHora(mascararHora(t))} placeholder="HH:MM" placeholderTextColor="#9AA8A6" keyboardType="numeric" />
                            </View>
                        )}

                        {!!erro && <Text style={styles.erro}>{erro}</Text>}

                        <Pressable accessibilityRole="button" disabled={salvando} onPress={() => void salvar()} style={({ pressed }) => [styles.salvar, (pressed || salvando) && styles.salvarPressionado]}>
                            <Text style={styles.salvarTexto}>{salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar lembrete"}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function Chip({ texto, ativo, onPress }: { texto: string; ativo: boolean; onPress: () => void }) {
    return (
        <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]}>
            <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{texto}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,35,33,0.4)" },
    folha: { maxHeight: "92%", backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
    cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
    tituloJanela: { color: COLORS.text, fontSize: 19, fontWeight: "700" },
    fechar: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    corpo: { paddingHorizontal: 20, paddingBottom: 28, gap: 8 },
    rotulo: { color: "#526562", fontSize: 13, fontWeight: "600", marginTop: 8 },
    ajuda: { color: COLORS.textSecondary, fontSize: 13 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
    chipAtivo: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipTexto: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
    chipTextoAtivo: { color: "#FFFFFF" },
    campo: { minHeight: 48, borderBottomWidth: 1.5, borderBottomColor: "#BFCFCC", color: COLORS.text, fontSize: 15, paddingHorizontal: 4 },
    campoLongo: { minHeight: 64, textAlignVertical: "top" },
    linha: { flexDirection: "row", gap: 16 },
    metade: { flex: 1 },
    opcao: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    opcaoAtiva: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
    opcaoTexto: { flex: 1, color: COLORS.text, fontSize: 14 },
    erro: { color: COLORS.error, fontSize: 13, fontWeight: "600" },
    salvar: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, marginTop: 12 },
    salvarPressionado: { opacity: 0.7 },
    salvarTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

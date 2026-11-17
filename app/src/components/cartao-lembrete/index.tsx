// Para que serve este arquivo: Mostra um lembrete com categoria, data, estado e as ações de ativar, editar e excluir.
// Onde ele é usado: src/app/(app)/lembretes.tsx.

import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/cores";
import { CATEGORIAS_LEMBRETE } from "../../constants/lembretes";
import { formatarDataHora } from "../../formatacao/data-hora";
import { Lembrete } from "../../types/lembrete";

type Props = {
    lembrete: Lembrete;
    onAlternar: () => void;
    onEditar: () => void;
    onExcluir: () => void;
};

// Traduz o estado do lembrete em texto e cores: ativo e futuro, ativo que já disparou, ou desativado.
function estadoDe(lembrete: Lembrete): { texto: string; fundo: string; cor: string } {
    if (!lembrete.ativo) return { texto: "Desativado", fundo: "#ECEFEF", cor: COLORS.textSecondary };
    if (lembrete.dataHora <= Date.now()) return { texto: "Já disparou", fundo: "#FFF4D6", cor: "#9A6B00" };
    return { texto: "Ativo", fundo: COLORS.primaryLight, cor: COLORS.primaryDark };
}

export function CartaoLembrete({ lembrete, onAlternar, onEditar, onExcluir }: Props) {
    const categoria = CATEGORIAS_LEMBRETE[lembrete.categoria];
    const estado = estadoDe(lembrete);
    return (
        <View style={[styles.card, !lembrete.ativo && styles.cardInativo]}>
            <View style={styles.topo}>
                <View style={styles.categoria}>
                    <Ionicons name={categoria.icone} size={16} color={COLORS.primaryDark} />
                    <Text style={styles.categoriaTexto}>{categoria.rotulo}</Text>
                </View>
                <View style={[styles.estado, { backgroundColor: estado.fundo }]}>
                    <Text style={[styles.estadoTexto, { color: estado.cor }]}>{estado.texto}</Text>
                </View>
            </View>

            <Text style={styles.titulo}>{lembrete.titulo}</Text>
            {!!lembrete.descricao && <Text style={styles.descricao}>{lembrete.descricao}</Text>}

            <View style={styles.dataLinha}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.data}>{formatarDataHora(new Date(lembrete.dataHora).toISOString())}</Text>
            </View>

            <View style={styles.acoes}>
                <View style={styles.interruptor}>
                    <Switch
                        value={lembrete.ativo}
                        onValueChange={onAlternar}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor="#FFFFFF"
                        accessibilityLabel={lembrete.ativo ? "Desativar lembrete" : "Ativar lembrete"}
                    />
                    <Text style={styles.interruptorTexto}>{lembrete.ativo ? "Ligado" : "Desligado"}</Text>
                </View>
                <View style={styles.botoes}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Editar lembrete" onPress={onEditar} hitSlop={8} style={({ pressed }) => [styles.botao, pressed && styles.pressed]}>
                        <Ionicons name="create-outline" size={20} color={COLORS.primaryDark} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Excluir lembrete" onPress={onExcluir} hitSlop={8} style={({ pressed }) => [styles.botao, pressed && styles.pressed]}>
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, gap: 8, borderWidth: 1, borderColor: COLORS.border },
    cardInativo: { opacity: 0.8 },
    topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    categoria: { flexDirection: "row", alignItems: "center", gap: 6 },
    categoriaTexto: { color: COLORS.primaryDark, fontSize: 12, fontWeight: "700" },
    estado: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    estadoTexto: { fontSize: 11, fontWeight: "700" },
    titulo: { color: COLORS.text, fontSize: 17, fontWeight: "700" },
    descricao: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
    dataLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
    data: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
    acoes: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
    interruptor: { flexDirection: "row", alignItems: "center", gap: 8 },
    interruptorTexto: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
    botoes: { flexDirection: "row", gap: 6 },
    botao: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    pressed: { opacity: 0.7, backgroundColor: COLORS.primaryLight },
});

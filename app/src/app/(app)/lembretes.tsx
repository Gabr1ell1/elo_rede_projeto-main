// Para que serve este arquivo: Tela única de lembretes, compartilhada por paciente e psicólogo (as categorias mudam conforme o perfil).
// Onde ele é usado: rota /lembretes, aberta pelo menu de navegação.

import { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MenuSanduiche } from "../../components/menu-sanduiche";
import { CartaoLembrete } from "../../components/cartao-lembrete";
import { FormularioLembrete } from "../../components/formulario-lembrete";
import { ConfirmDialog } from "../../components/confirmar-dialogo";
import { COLORS } from "../../constants/cores";
import { CATEGORIAS_POR_PERFIL } from "../../constants/lembretes";
import { useAuth } from "../../context/AuthContext";
import { useLembretes } from "../../hooks/use-lembretes";
import { useConsultasFuturas } from "../../hooks/use-consultas-futuras";
import { useDepuracaoLembretes } from "../../hooks/use-depuracao-lembretes";
import { Platform } from "react-native";
import { Lembrete } from "../../types/lembrete";

const LOGO = require("../../../assets/images/elo-logo-branca.png");

export default function TelaLembretes() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { suportado, lembretes, carregando, aviso, notificacoesAgendadas, abrirConfiguracoes, criar, editar, alternar, excluir } = useLembretes();
    const consultas = useConsultasFuturas();
    const depuracao = useDepuracaoLembretes();
    const [depuracaoAberta, setDepuracaoAberta] = useState(false);

    // Controla o formulário: fechado, criando (lembrete null) ou editando um lembrete.
    const [formularioAberto, setFormularioAberto] = useState(false);
    const [emEdicao, setEmEdicao] = useState<Lembrete | null>(null);
    const [paraExcluir, setParaExcluir] = useState<Lembrete | null>(null);

    const categorias = CATEGORIAS_POR_PERFIL[user?.role ?? "PATIENT"];

    function abrirNovo() { setEmEdicao(null); setFormularioAberto(true); }
    function abrirEdicao(lembrete: Lembrete) { setEmEdicao(lembrete); setFormularioAberto(true); }

    const topo = (
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
            <View style={styles.decorCircle} />
            <View style={styles.topRow}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Elo - Psicologia clínica em rede" />
                <MenuSanduiche />
            </View>
            <View style={styles.content}>
                <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace((user?.role === "PSYCHOLOGIST" ? "/psicologo" : "/paciente") as never))} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
                    <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                    <Text style={styles.backText}>Voltar</Text>
                </Pressable>
            </View>
        </View>
    );

    // Na Web não há notificações locais: explica em vez de mostrar uma tela que não funciona.
    if (!suportado) {
        return (
            <View style={styles.screen}>
                {topo}
                <View style={[styles.content, styles.vazio]}>
                    <Ionicons name="phone-portrait-outline" size={30} color={COLORS.textSecondary} />
                    <Text style={styles.vazioTexto}>Os lembretes com notificação estão disponíveis apenas no aplicativo Android.</Text>
                </View>
            </View>
        );
    }

    const cabecalhoLista = (
        <View style={styles.content}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Meus lembretes</Text>
                <Pressable accessibilityRole="button" onPress={abrirNovo} style={({ pressed }) => [styles.novo, pressed && styles.pressed]}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.novoTexto}>Novo</Text>
                </Pressable>
            </View>
            {!!aviso && (
                <View style={styles.aviso}>
                    <Ionicons name="notifications-off-outline" size={18} color="#9A6B00" />
                    <View style={{ flex: 1, gap: 6 }}>
                        <Text style={styles.avisoTexto}>{aviso}</Text>
                        <Pressable accessibilityRole="button" onPress={abrirConfiguracoes}>
                            <Text style={styles.avisoLink}>Abrir configurações</Text>
                        </Pressable>
                    </View>
                </View>
            )}
            <View style={styles.demonstracao}>
                <Text style={styles.sectionTitle}>Banco local e notificações agendadas</Text>
                <Text style={styles.demonstracaoTexto}>Registros no SQLite: {lembretes.length}</Text>
                {lembretes.map((item) => <Text key={`db-${item.id}`} style={styles.demonstracaoTexto}>• {item.titulo} — {item.ativo ? "ativo" : "inativo"}</Text>)}
                <Text style={[styles.demonstracaoTexto, { marginTop: 8 }]}>Notificações pendentes: {notificacoesAgendadas.length}</Text>
                {notificacoesAgendadas.map((item) => <Text key={item.id} style={styles.demonstracaoTexto}>• {item.titulo} — {item.mensagem}</Text>)}
            </View>
            {Platform.OS === "android" && (
                <View style={styles.demonstracao}>
                    <Pressable accessibilityRole="button" accessibilityState={{ expanded: depuracaoAberta }} onPress={() => setDepuracaoAberta((aberta) => !aberta)} style={styles.depurarCabecalho}>
                        <Text style={styles.sectionTitle}>Depuração (banco local)</Text>
                        <Ionicons name={depuracaoAberta ? "chevron-up" : "chevron-down"} size={20} color={COLORS.primary} />
                    </Pressable>
                    {depuracaoAberta && (
                        <View style={{ gap: 8 }}>
                            <Pressable accessibilityRole="button" disabled={depuracao.carregando} onPress={() => void depuracao.atualizar()} style={({ pressed }) => [styles.atualizar, pressed && styles.pressed]}>
                                <Text style={styles.atualizarTexto}>{depuracao.carregando ? "Atualizando…" : "Atualizar"}</Text>
                            </Pressable>
                            {depuracao.erro ? <Text style={styles.demonstracaoTexto}>{depuracao.erro}</Text> : null}
                            {depuracao.banco && <Text style={styles.demonstracaoTexto}>PRAGMA user_version: {depuracao.banco.userVersion} · Total de linhas: {depuracao.banco.total}</Text>}
                            {depuracao.banco?.linhas.map((linha) => {
                                const correspondente = !!linha.notificacao_id && depuracao.idsAgendados.includes(linha.notificacao_id);
                                return <Text key={linha.id} style={styles.demonstracaoTexto}>ID {linha.id} · {linha.titulo} · {new Date(linha.data_hora).toLocaleString()} · notificacao_id: {linha.notificacao_id ?? "NULL"} · ativo: {linha.ativo} · {correspondente ? "notificação correspondente" : "sem notificação correspondente"}</Text>;
                            })}
                            <Text style={styles.demonstracaoTexto}>IDs agendados no aparelho: {depuracao.idsAgendados.length ? depuracao.idsAgendados.join(", ") : "nenhum"}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.screen}>
            {topo}
            <FlatList
                data={carregando ? [] : lembretes}
                keyExtractor={(item) => String(item.id)}
                ListHeaderComponent={cabecalhoLista}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                renderItem={({ item }) => (
                    <View style={styles.content}>
                        <CartaoLembrete lembrete={item} onAlternar={() => void alternar(item)} onEditar={() => abrirEdicao(item)} onExcluir={() => setParaExcluir(item)} />
                    </View>
                )}
                ListEmptyComponent={
                    <View style={[styles.content, styles.vazio]}>
                        {carregando ? (
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        ) : (
                            <>
                                <Ionicons name="notifications-outline" size={28} color={COLORS.textSecondary} />
                                <Text style={styles.vazioTexto}>Você ainda não tem lembretes. Toque em “Novo” para criar o primeiro.</Text>
                            </>
                        )}
                    </View>
                }
            />

            {formularioAberto && (
                <FormularioLembrete
                    key={emEdicao?.id ?? "novo"}
                    lembrete={emEdicao}
                    categorias={categorias}
                    consultas={consultas}
                    perfil={user?.role ?? null}
                    onFechar={() => setFormularioAberto(false)}
                    onSalvar={(dados, disparo) => (emEdicao ? editar(emEdicao, dados, disparo) : criar(dados, disparo))}
                />
            )}
            <ConfirmDialog
                visible={paraExcluir !== null}
                title="Excluir lembrete?"
                message="O aviso programado também será cancelado."
                confirmLabel="Excluir"
                onCancel={() => setParaExcluir(null)}
                onConfirm={() => { const alvo = paraExcluir; setParaExcluir(null); if (alvo) void excluir(alvo); }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    hero: { backgroundColor: COLORS.primary, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", gap: 10 },
    decorCircle: { position: "absolute", width: 200, height: 200, borderRadius: 100, top: -90, right: -50, backgroundColor: COLORS.accent, opacity: 0.3 },
    topRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 },
    logo: { width: 162, height: 60 },
    back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingLeft: 10, paddingRight: 16, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" },
    backText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
    content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 24 },
    list: { paddingTop: 28, paddingBottom: 40 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
    novo: { flexDirection: "row", alignItems: "center", gap: 4, height: 38, paddingHorizontal: 16, borderRadius: 999, backgroundColor: COLORS.primary },
    novoTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
    aviso: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 14, backgroundColor: "#FFF4D6", marginBottom: 16 },
    avisoTexto: { color: "#7A5500", fontSize: 13, lineHeight: 18 },
    avisoLink: { color: COLORS.primaryDark, fontSize: 13, fontWeight: "700" },
    demonstracao: { gap: 6, padding: 14, marginBottom: 16, borderRadius: 14, backgroundColor: "#FFFFFF" },
    demonstracaoTexto: { color: COLORS.textSecondary, fontSize: 13 },
    depurarCabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    atualizar: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.primary },
    atualizarTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    vazio: { alignItems: "center", gap: 10, paddingVertical: 32 },
    vazioTexto: { color: COLORS.textSecondary, fontSize: 14, textAlign: "center" },
    pressed: { opacity: 0.72 },
});

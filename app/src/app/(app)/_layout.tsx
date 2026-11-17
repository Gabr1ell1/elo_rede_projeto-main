import { Slot } from "expo-router";
import { useSincronizarLembretes } from "../../hooks/use-sincronizar-lembretes";

// O controle de quem entra agora fica no layout raiz (Stack.Protected).
export default function LayoutApp() {
    // Só roda para quem está logado: mantém os lembretes agendados no aparelho iguais ao banco.
    useSincronizarLembretes();
    return <Slot />;
}

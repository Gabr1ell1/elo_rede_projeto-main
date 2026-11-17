// Para que serve este arquivo: Carrega as consultas confirmadas e futuras da pessoa logada (dados mockados já existentes).
// Onde ele é usado: tela de lembretes, para oferecer "lembrar desta consulta".

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getMyAppointmentsAsPatient, getMyAppointmentsAsPsychologist } from "../services/api";
import { Appointment } from "../types/clinic";

export function useConsultasFuturas(): Appointment[] {
    const { user } = useAuth();
    const [consultas, setConsultas] = useState<Appointment[]>([]);

    useEffect(() => {
        if (!user?.role) return;
        let ativo = true;
        const buscar = user.role === "PSYCHOLOGIST" ? getMyAppointmentsAsPsychologist : getMyAppointmentsAsPatient;
        buscar(user.userId)
            .then((lista) => {
                if (!ativo) return;
                const agora = Date.now();
                setConsultas(
                    lista
                        .filter((c) => c.status === "CONFIRMED" && new Date(c.date).getTime() > agora)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                );
            })
            // A lista é só uma facilidade do formulário; se falhar, o lembrete avulso continua possível.
            .catch(() => { if (ativo) setConsultas([]); });
        return () => { ativo = false; };
    }, [user?.role, user?.userId]);

    return consultas;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, BellRing } from "lucide-react";
import {
  caminhoDaNotificacao,
  obterPushNativo,
  removerOuvinte,
  type PermissaoPush,
} from "@/lib/push-nativo";

const CANAL_ENTREGAS = "entregas";
const CHAVE_AVISO_NEGADO = "canhoto-motorista:push-negado-dispensado";

async function enviarTokenAoServidor(token: string): Promise<void> {
  try {
    await fetch("/motorista/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "same-origin",
    });
  } catch {
    // Sem rede agora: o app registra de novo na próxima abertura.
  }
}

/**
 * Notificações do app Android: pede permissão (com um aviso claro, não de
 * surpresa), registra o celular no servidor da loja e leva o motorista à
 * entrega quando ele toca na notificação. Fora do app não faz nada.
 */
export function MotoristaPushNativo() {
  const router = useRouter();
  const [permissao, setPermissao] = useState<PermissaoPush | null>(null);
  const [dispensado, setDispensado] = useState(true);
  const [pedindo, setPedindo] = useState(false);
  const iniciouRef = useRef(false);

  const registrar = useCallback(async () => {
    const push = obterPushNativo();
    if (!push) return;
    try {
      await push.register();
    } catch {
      // Sem Google Play Services/Firebase configurado: sem push, o app segue normal.
    }
  }, []);

  useEffect(() => {
    const push = obterPushNativo();
    if (!push || iniciouRef.current) return;
    iniciouRef.current = true;

    const ouvintes: unknown[] = [
      push.addListener("registration", (token) => {
        void enviarTokenAoServidor(token.value);
      }),
      push.addListener("registrationError", () => {
        // Firebase não configurado neste APK: tudo bem, só não chega push.
      }),
      // App aberto: o Android não mostra a notificação; atualiza a lista e o
      // aviso na tela (MotoristaAvisoEntregas) cuida do resto.
      push.addListener("pushNotificationReceived", () => {
        router.refresh();
      }),
      push.addListener("pushNotificationActionPerformed", (acao) => {
        const caminho = caminhoDaNotificacao(acao);
        if (caminho) window.location.assign(caminho);
      }),
    ];

    void (async () => {
      try {
        await push.createChannel?.({
          id: CANAL_ENTREGAS,
          name: "Entregas",
          description: "Entrega nova ou cancelada",
          importance: 5,
          visibility: 1,
          vibration: true,
        });
        const { receive } = await push.checkPermissions();
        setPermissao(receive);
        if (receive === "granted") await registrar();
      } catch {
        // Plugin indisponível nesta versão do app.
      }
    })();

    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no cliente
      setDispensado(window.localStorage.getItem(CHAVE_AVISO_NEGADO) === "1");
    } catch {
      setDispensado(false);
    }

    return () => {
      iniciouRef.current = false;
      for (const ouvinte of ouvintes) {
        removerOuvinte(ouvinte);
      }
    };
  }, [registrar, router]);

  async function ativar() {
    const push = obterPushNativo();
    if (!push || pedindo) return;
    setPedindo(true);
    try {
      const { receive } = await push.requestPermissions();
      setPermissao(receive);
      if (receive === "granted") await registrar();
    } catch {
      // Segue sem avisos.
    } finally {
      setPedindo(false);
    }
  }

  function dispensarAvisoNegado() {
    setDispensado(true);
    try {
      window.localStorage.setItem(CHAVE_AVISO_NEGADO, "1");
    } catch {
      // Só uma conveniência.
    }
  }

  if (permissao === "prompt" || permissao === "prompt-with-rationale") {
    return (
      <section className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#E8F1FE] text-[#1F73F1]">
          <BellRing className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#0A1F44]">
            Receba aviso de entrega nova
          </p>
          <p className="text-xs font-medium text-slate-500">
            Toca e vibra mesmo com o app fechado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void ativar()}
          disabled={pedindo}
          className="shrink-0 bg-[#1F73F1] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          {pedindo ? "Aguarde..." : "Ativar"}
        </button>
      </section>
    );
  }

  if (permissao === "denied" && !dispensado) {
    return (
      <section className="flex items-start gap-3 border-b border-slate-200 bg-amber-50 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <BellOff className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#0A1F44]">Avisos desligados</p>
          <p className="text-xs font-medium text-slate-600">
            Para saber de entrega nova com o app fechado, ligue as notificações
            do app nas configurações do Android.
          </p>
        </div>
        <button
          type="button"
          onClick={dispensarAvisoNegado}
          className="shrink-0 text-xs font-black text-slate-500"
        >
          Fechar
        </button>
      </section>
    );
  }

  return null;
}

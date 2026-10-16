// Decide quando o app do motorista deve avisar de entrega nova ou retirada.
// Lógica pura (sem React/DOM) para ser testável.

export interface EntregaParaAviso {
  id: string;
  numero: string;
  clienteNome: string;
  status: string;
}

/** O que o aparelho já "viu" da lista, guardado entre uma atualização e outra. */
export interface EntregasVistas {
  /** Dia (AAAA-MM-DD) a que a lista se refere; vira o dia, recomeça sem avisar. */
  dia: string;
  /** Pendentes que o motorista já viu, com o rótulo para a mensagem de remoção. */
  pendentes: Array<{ id: string; numero: string; clienteNome: string }>;
}

export interface ResultadoAvisos {
  novas: EntregaParaAviso[];
  /** Estavam pendentes e sumiram da lista (cancelada ou passada a outro motorista). */
  retiradas: Array<{ id: string; numero: string; clienteNome: string }>;
  /** O que guardar para a próxima comparação. */
  vistas: EntregasVistas;
}

export function calcularAvisos(
  entregas: EntregaParaAviso[],
  anterior: EntregasVistas | null,
  dia: string
): ResultadoAvisos {
  const pendentesAgora = entregas.filter((e) => e.status === "pendente");
  const vistas: EntregasVistas = {
    dia,
    pendentes: pendentesAgora.map(({ id, numero, clienteNome }) => ({
      id,
      numero,
      clienteNome,
    })),
  };

  // Primeira abertura (ou outro dia): só memoriza, não avisa do que já existia.
  if (!anterior || anterior.dia !== dia) {
    return { novas: [], retiradas: [], vistas };
  }

  const idsAnteriores = new Set(anterior.pendentes.map((p) => p.id));
  const idsNaLista = new Set(entregas.map((e) => e.id));

  return {
    novas: pendentesAgora.filter((e) => !idsAnteriores.has(e.id)),
    // Uma entrega que o próprio motorista concluiu continua na lista (entregue);
    // só some quando foi cancelada ou reatribuída.
    retiradas: anterior.pendentes.filter((p) => !idsNaLista.has(p.id)),
    vistas,
  };
}

export function mensagemDoAviso(
  novas: Array<{ numero: string; clienteNome: string }>,
  retiradas: Array<{ numero: string; clienteNome: string }>
): { titulo: string; detalhe: string } | null {
  if (novas.length > 0) {
    const primeira = novas[0];
    if (novas.length === 1) {
      return {
        titulo: `Nova entrega ${primeira.numero}`,
        detalhe: primeira.clienteNome,
      };
    }
    return {
      titulo: `${novas.length} entregas novas`,
      detalhe: novas.map((e) => e.numero).join(", "),
    };
  }

  if (retiradas.length > 0) {
    const primeira = retiradas[0];
    if (retiradas.length === 1) {
      return {
        titulo: `Entrega ${primeira.numero} cancelada`,
        detalhe: `${primeira.clienteNome} saiu da sua lista.`,
      };
    }
    return {
      titulo: `${retiradas.length} entregas saíram da sua lista`,
      detalhe: retiradas.map((e) => e.numero).join(", "),
    };
  }

  return null;
}

import "server-only";

interface BrasilApiCep {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
}

async function consultarCep(
  cep: string
): Promise<BrasilApiCep | null> {
  if (!/^\d{8}$/.test(cep)) return null;

  try {
    const resposta = await fetch(
      `https://brasilapi.com.br/api/cep/v1/${cep}`,
      {
        headers: {
          "User-Agent": "Canhoto-Digital/1.0",
        },
        next: {
          revalidate: 60 * 60 * 24 * 30,
        },
        // Sem isso a tela de detalhe ficava esperando a BrasilAPI sem limite.
        signal: AbortSignal.timeout(3_000),
      }
    );

    if (!resposta.ok) return null;
    return (await resposta.json()) as BrasilApiCep;
  } catch {
    return null;
  }
}

function adicionarSeFaltar(
  partes: string[],
  valor: string | undefined,
  baseNormalizada: string
) {
  const texto = valor?.trim();
  if (!texto) return;

  if (!baseNormalizada.includes(texto.toLocaleLowerCase("pt-BR"))) {
    partes.push(texto);
  }
}

/**
 * Monta um endereço mais completo para o Waze sem depender de API paga.
 *
 * O endereço digitado pelo operador continua sendo a fonte principal.
 * Quando há CEP, a BrasilAPI é usada apenas para acrescentar bairro,
 * cidade e UF e reduzir ambiguidades na busca do Waze.
 *
 * Se a BrasilAPI estiver indisponível, a rota continua funcionando com
 * endereço + CEP + Brasil.
 */
export async function montarEnderecoRoteavel(input: {
  endereco: string;
  cep: string;
}): Promise<string> {
  const endereco = input.endereco.trim();
  const cep = input.cep.replace(/\D/g, "");

  if (!endereco && !cep) return "";

  const partes: string[] = [];
  if (endereco) partes.push(endereco);

  const cepInfo = await consultarCep(cep);
  const baseNormalizada = endereco.toLocaleLowerCase("pt-BR");

  if (cepInfo) {
    adicionarSeFaltar(partes, cepInfo.neighborhood, baseNormalizada);

    const cidadeUf = [cepInfo.city?.trim(), cepInfo.state?.trim()]
      .filter(Boolean)
      .join(" - ");

    adicionarSeFaltar(partes, cidadeUf, baseNormalizada);
  }

  if (cep) {
    partes.push(`CEP ${cep.slice(0, 5)}-${cep.slice(5)}`);
  }

  partes.push("Brasil");

  return partes.join(", ");
}

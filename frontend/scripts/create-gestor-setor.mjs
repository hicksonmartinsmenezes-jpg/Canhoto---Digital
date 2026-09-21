import bcrypt from "bcryptjs";
import postgres from "postgres";

const email = process.env.GESTOR_SETOR_EMAIL?.trim().toLowerCase();
const senha = process.env.GESTOR_SETOR_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL não foi informada.");
  process.exit(1);
}
if (!email) {
  console.error("GESTOR_SETOR_EMAIL não foi informado.");
  process.exit(1);
}
if (!senha || senha.length < 4) {
  console.error("A senha deve ter pelo menos 4 caracteres.");
  process.exit(1);
}
if (Buffer.byteLength(senha, "utf8") > 72) {
  console.error("A senha excede o limite de 72 bytes do bcrypt.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  // Diferente do Admin (que pode existir sem nenhum colaborador vinculado),
  // um gestor_setor SEMPRE parte de um colaborador já cadastrado — é de lá
  // que vem o nome e, principalmente, o setor que escopa o que ele vê. Não
  // criamos o colaborador aqui pra não duplicar a tela de Colaboradores.
  const [colaborador] = await sql`
    select id, nome, setor_id, papel
    from colaboradores
    where lower(email) = ${email}
      and ativo = true
    limit 1
  `;

  if (!colaborador) {
    console.error(
      `Nenhum colaborador ativo encontrado com o e-mail ${email}. ` +
        "Cadastre a pessoa em Colaboradores (com o setor dela definido) antes de rodar esse script."
    );
    process.exitCode = 2;
  } else if (!colaborador.setor_id) {
    console.error(
      `O colaborador ${colaborador.nome} não tem setor definido. ` +
        "Edite o cadastro dele em Colaboradores e escolha um setor antes de dar acesso de login."
    );
    process.exitCode = 2;
  } else {
    const senhaHash = await bcrypt.hash(senha, 12);

    await sql`
      update colaboradores
      set papel = 'gestor_setor',
          senha_hash = ${senhaHash}
      where id = ${colaborador.id}
    `;

    console.log(
      `Acesso de login concedido a ${colaborador.nome} (papel gestor_setor).`
    );
  }
} finally {
  await sql.end({ timeout: 5 });
}

import bcrypt from "bcryptjs";
import postgres from "postgres";

const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const senha = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL não foi informada.");
  process.exit(1);
}
if (!email) {
  console.error("ADMIN_BOOTSTRAP_EMAIL não foi informado.");
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
  const existente = await sql`
    select id
    from usuarios_admin
    where lower(email) = ${email}
    limit 1
  `;

  if (existente.length > 0) {
    console.error("Já existe um usuário administrativo com esse e-mail.");
    process.exitCode = 2;
  } else {
    const colaborador = await sql`
      select id
      from colaboradores
      where lower(email) = ${email}
        and ativo = true
      limit 1
    `;

    const senhaHash = await bcrypt.hash(senha, 12);
    const colaboradorId = colaborador[0]?.id ?? null;

    await sql`
      insert into usuarios_admin (
        colaborador_id,
        email,
        senha_hash,
        ativo
      )
      values (
        ${colaboradorId},
        ${email},
        ${senhaHash},
        true
      )
    `;

    console.log(
      colaboradorId
        ? "Usuário Admin criado e vinculado ao colaborador existente."
        : "Usuário Admin criado sem vínculo com colaborador."
    );
  }
} finally {
  await sql.end({ timeout: 5 });
}

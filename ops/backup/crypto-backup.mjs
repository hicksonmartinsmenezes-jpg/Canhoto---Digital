// Criptografia do pacote de backup que vai para a nuvem (Google Drive etc.).
//
// Uso (a senha vem SEMPRE da variável de ambiente, nunca por argumento, para
// não aparecer na lista de processos nem em logs):
//
//   BACKUP_ENCRYPTION_PASSPHRASE=... node crypto-backup.mjs encrypt <entrada> <saida>
//   BACKUP_ENCRYPTION_PASSPHRASE=... node crypto-backup.mjs decrypt <entrada> <saida>
//   BACKUP_ENCRYPTION_PASSPHRASE=... node crypto-backup.mjs verify  <entrada>
//
// Formato do arquivo (.enc):
//   "CNHB1\n" (6 bytes) | salt (16) | iv (12) | texto cifrado | tag GCM (16)
// AES-256-GCM, chave derivada da senha com scrypt (N=2^17, r=8, p=1).
// GCM autentica o arquivo inteiro: se a senha estiver errada ou o arquivo
// tiver sido alterado/cortado, decrypt/verify falham e nada é entregue.
//
// Sem dependências externas: só o Node que já roda o Next.js.

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, open, rename, rm, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

const MAGIC = Buffer.from("CNHB1\n", "utf8");
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN;
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const MIN_PASSPHRASE = 12;

function lerSenha() {
  const senha = process.env.BACKUP_ENCRYPTION_PASSPHRASE ?? "";
  if (senha.length < MIN_PASSPHRASE) {
    throw new Error(
      `BACKUP_ENCRYPTION_PASSPHRASE ausente ou curta (mínimo ${MIN_PASSPHRASE} caracteres).`
    );
  }
  return senha;
}

function derivarChave(senha, salt) {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, 32, SCRYPT, (erro, chave) =>
      erro ? reject(erro) : resolve(chave)
    );
  });
}

async function garantirQueNaoExiste(caminho) {
  try {
    await access(caminho);
  } catch {
    return;
  }
  throw new Error(`O arquivo de saída já existe: ${caminho}`);
}

export async function criptografar(entrada, saida, senha) {
  await garantirQueNaoExiste(saida);
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const chave = await derivarChave(senha, salt);
  const cifra = createCipheriv("aes-256-gcm", chave, iv);
  const temporario = `${saida}.partial`;

  try {
    const destino = createWriteStream(temporario, { flags: "wx" });
    destino.write(Buffer.concat([MAGIC, salt, iv]));
    await pipeline(createReadStream(entrada), cifra, destino, { end: false });
    await new Promise((resolve, reject) => {
      destino.end(cifra.getAuthTag(), (erro) => (erro ? reject(erro) : resolve()));
    });
    await rename(temporario, saida);
  } catch (erro) {
    await rm(temporario, { force: true });
    throw erro;
  }
}

async function lerCabecalho(entrada) {
  const { size } = await stat(entrada);
  if (size < HEADER_LEN + TAG_LEN) {
    throw new Error("Arquivo criptografado inválido (pequeno demais).");
  }
  const arquivo = await open(entrada, "r");
  try {
    const cabecalho = Buffer.alloc(HEADER_LEN);
    await arquivo.read(cabecalho, 0, HEADER_LEN, 0);
    const tag = Buffer.alloc(TAG_LEN);
    await arquivo.read(tag, 0, TAG_LEN, size - TAG_LEN);

    if (!cabecalho.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error("Arquivo não é um backup criptografado do Canhoto Digital.");
    }
    return {
      size,
      salt: cabecalho.subarray(MAGIC.length, MAGIC.length + SALT_LEN),
      iv: cabecalho.subarray(MAGIC.length + SALT_LEN, HEADER_LEN),
      tag,
    };
  } finally {
    await arquivo.close();
  }
}

async function decifrarPara(entrada, destino, senha) {
  const { size, salt, iv, tag } = await lerCabecalho(entrada);
  const chave = await derivarChave(senha, salt);
  const decifra = createDecipheriv("aes-256-gcm", chave, iv);
  decifra.setAuthTag(tag);

  const fimCifrado = size - TAG_LEN - 1;
  const origem =
    fimCifrado < HEADER_LEN
      ? Readable.from([]) // arquivo original vazio: só cabeçalho + tag
      : createReadStream(entrada, { start: HEADER_LEN, end: fimCifrado });

  await pipeline(origem, decifra, destino);
}

export async function descriptografar(entrada, saida, senha) {
  await garantirQueNaoExiste(saida);
  const temporario = `${saida}.partial`;
  try {
    await decifrarPara(entrada, createWriteStream(temporario, { flags: "wx" }), senha);
    await rename(temporario, saida);
  } catch (erro) {
    await rm(temporario, { force: true });
    if (erro && erro.code === "ERR_OSSL_EVP_BAD_DECRYPT") {
      throw new Error("Senha incorreta ou arquivo corrompido.");
    }
    if (erro && /authenticate data/i.test(String(erro.message))) {
      throw new Error("Senha incorreta ou arquivo corrompido.");
    }
    throw erro;
  }
}

export async function verificar(entrada, senha) {
  const descarte = new Writable({ write: (_c, _e, cb) => cb() });
  try {
    await decifrarPara(entrada, descarte, senha);
  } catch (erro) {
    if (erro && /authenticate data/i.test(String(erro.message))) {
      throw new Error("Senha incorreta ou arquivo corrompido.");
    }
    throw erro;
  }
}

async function principal() {
  const [comando, entrada, saida] = process.argv.slice(2);
  const senha = lerSenha();

  if (comando === "encrypt" && entrada && saida) {
    await criptografar(entrada, saida, senha);
  } else if (comando === "decrypt" && entrada && saida) {
    await descriptografar(entrada, saida, senha);
  } else if (comando === "verify" && entrada) {
    await verificar(entrada, senha);
  } else {
    throw new Error(
      "Uso: node crypto-backup.mjs encrypt|decrypt <entrada> <saida>  |  verify <entrada>"
    );
  }
}

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((erro) => {
    console.error(`ERRO: ${erro.message}`);
    process.exit(1);
  });
}

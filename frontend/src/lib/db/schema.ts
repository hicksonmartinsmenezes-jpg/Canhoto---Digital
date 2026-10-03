import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const papelColaboradorEnum = pgEnum("papel_colaborador", [
  "admin",
  "gestor_setor",
  "colaborador",
]);

export const statusEntregaEnum = pgEnum("status_entrega", [
  "pendente",
  "entregue",
  "cancelado",
]);

export const formaPagamentoEnum = pgEnum("forma_pagamento", [
  "dinheiro",
  "pix",
  "debito",
  "cartao_1x",
  "prazo",
]);

export const tipoAnexoEntregaEnum = pgEnum("tipo_anexo_entrega", [
  "xml_nfe",
  "xml_cte",
  "assinatura_cliente",
  "foto",
  "comprovante_pix",
]);

export const tipoGastoVeiculoEnum = pgEnum("tipo_gasto_veiculo", [
  "combustivel",
  "manutencao",
  "multa",
  "lava_jato",
  "pedagio",
  "outro",
]);

export const statusTreinamentoEnum = pgEnum("status_treinamento", [
  "em_andamento",
  "concluido",
]);

export const setores = pgTable("setores", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull().unique(),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const colaboradores = pgTable(
  "colaboradores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nome: text("nome").notNull(),
    email: text("email").unique(),
    // Identificador de login em /colaborador/login (papel gestor_setor) —
    // ver migration 0012_login_colaborador_por_celular.sql.
    celular: text("celular").unique(),
    setorId: uuid("setor_id").references(() => setores.id, {
      onDelete: "set null",
    }),
    cargo: text("cargo"),
    papel: papelColaboradorEnum("papel").notNull().default("colaborador"),
    // Só preenchido pra colaboradores com papel "gestor_setor" — dá acesso
    // de login escopado ao setor deles (ver @/lib/colaborador-session).
    senhaHash: text("senha_hash"),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_colaboradores_setor").on(table.setorId)]
);

export const usuariosAdmin = pgTable(
  "usuarios_admin",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    colaboradorId: uuid("colaborador_id").references(() => colaboradores.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull().unique(),
    senhaHash: text("senha_hash").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp("atualizado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("usuarios_admin_colaborador_id_key").on(table.colaboradorId),
    index("idx_usuarios_admin_ativo").on(table.ativo),
  ]
);

export const motoboys = pgTable("motoboys", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").unique(),
  pinHash: text("pin_hash"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const motoboyLocalizacoes = pgTable(
  "motoboy_localizacoes",
  {
    motoboyId: uuid("motoboy_id")
      .primaryKey()
      .references(() => motoboys.id, { onDelete: "cascade" }),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    precisaoMetros: numeric("precisao_metros", { precision: 10, scale: 2 }),
    atualizadoEm: timestamp("atualizado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_motoboy_localizacoes_atualizado").on(table.atualizadoEm),
    check(
      "ck_motoboy_localizacao_latitude",
      sql`${table.latitude} between -90 and 90`
    ),
    check(
      "ck_motoboy_localizacao_longitude",
      sql`${table.longitude} between -180 and 180`
    ),
    check(
      "ck_motoboy_localizacao_precisao",
      sql`${table.precisaoMetros} is null or ${table.precisaoMetros} >= 0`
    ),
  ]
);

export const veiculos = pgTable(
  "veiculos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placa: text("placa").notNull().unique(),
    marca: text("marca").notNull(),
    modelo: text("modelo").notNull(),
    ano: integer("ano"),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp("atualizado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_veiculos_ativo").on(table.ativo),
    check(
      "ck_veiculos_placa",
      sql`${table.placa} ~ '^[A-Z0-9]{7}$'`
    ),
    check(
      "ck_veiculos_ano",
      sql`${table.ano} is null or ${table.ano} between 1950 and 2100`
    ),
  ]
);

export const veiculoGastos = pgTable(
  "veiculo_gastos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    veiculoId: uuid("veiculo_id")
      .notNull()
      .references(() => veiculos.id, { onDelete: "restrict" }),
    tipo: tipoGastoVeiculoEnum("tipo").notNull(),
    data: date("data", { mode: "string" }).notNull().defaultNow(),
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
    quilometragem: integer("quilometragem"),
    observacao: text("observacao"),
    cadastradoPorAdmin: uuid("cadastrado_por_admin").references(
      () => usuariosAdmin.id,
      { onDelete: "set null" }
    ),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_veiculo_gastos_veiculo").on(table.veiculoId),
    index("idx_veiculo_gastos_data").on(table.data),
    index("idx_veiculo_gastos_tipo").on(table.tipo),
    check("ck_veiculo_gastos_valor", sql`${table.valor} > 0`),
    check(
      "ck_veiculo_gastos_quilometragem",
      sql`${table.quilometragem} is null or ${table.quilometragem} >= 0`
    ),
  ]
);

export const treinamentoProgresso = pgTable(
  "treinamento_progresso",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioAdminId: uuid("usuario_admin_id")
      .notNull()
      .references(() => usuariosAdmin.id, { onDelete: "cascade" }),
    treinamentoSlug: text("treinamento_slug").notNull(),
    status: statusTreinamentoEnum("status")
      .notNull()
      .default("em_andamento"),
    iniciadoEm: timestamp("iniciado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    concluidoEm: timestamp("concluido_em", {
      withTimezone: true,
      mode: "string",
    }),
    atualizadoEm: timestamp("atualizado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("treinamento_progresso_usuario_slug_key").on(
      table.usuarioAdminId,
      table.treinamentoSlug
    ),
    index("idx_treinamento_progresso_usuario").on(table.usuarioAdminId),
    index("idx_treinamento_progresso_status").on(table.status),
    check(
      "ck_treinamento_progresso_slug",
      sql`${table.treinamentoSlug} ~ '^[a-z0-9-]+$'`
    ),
    check(
      "ck_treinamento_progresso_conclusao",
      sql`(${table.status} = 'concluido' and ${table.concluidoEm} is not null) or (${table.status} = 'em_andamento' and ${table.concluidoEm} is null)`
    ),
  ]
);

export const entregas = pgTable(
  "entregas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    numero: integer("numero")
      .notNull()
      .default(sql`nextval('entregas_numero_seq')`)
      .unique(),
    data: date("data", { mode: "string" }).notNull().defaultNow(),
    clienteNome: text("cliente_nome").notNull(),
    clienteTelefone: text("cliente_telefone"),
    endereco: text("endereco"),
    cep: text("cep"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    numeroPedido: text("numero_pedido"),
    numeroNfe: text("numero_nfe"),
    valorPagamento: numeric("valor_pagamento", {
      precision: 12,
      scale: 2,
    }).notNull(),
    formaPagamento: formaPagamentoEnum("forma_pagamento").notNull(),
    horaSaida: time("hora_saida"),
    motoboyId: uuid("motoboy_id").references(() => motoboys.id),
    clienteAssinouEm: timestamp("cliente_assinou_em", {
      withTimezone: true,
      mode: "string",
    }),
    caixaId: uuid("caixa_id").references(() => colaboradores.id),
    caixaConfirmouEm: timestamp("caixa_confirmou_em", {
      withTimezone: true,
      mode: "string",
    }),
    status: statusEntregaEnum("status").notNull().default("pendente"),
    observacoes: text("observacoes"),
    cadastradoPor: uuid("cadastrado_por").references(() => colaboradores.id),
    cadastradoPorAdmin: uuid("cadastrado_por_admin").references(
      () => usuariosAdmin.id
    ),
    // Setor dono da entrega (Issue: login por gestor_setor) — usado pra
    // escopar o que um gestor_setor enxerga no Dashboard/Entregas.
    setorId: uuid("setor_id").references(() => setores.id, {
      onDelete: "set null",
    }),
    criadoEm: timestamp("criado_em", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp("atualizado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_entregas_data").on(table.data),
    index("idx_entregas_motoboy").on(table.motoboyId),
    index("idx_entregas_caixa").on(table.caixaId),
    index("idx_entregas_status").on(table.status),
    index("idx_entregas_forma_pagamento").on(table.formaPagamento),
    index("idx_entregas_setor").on(table.setorId),
    index("idx_entregas_cadastrado_por_admin").on(table.cadastradoPorAdmin),
    check(
      "ck_entregas_cep",
      sql`${table.cep} is null or ${table.cep} ~ '^[0-9]{8}$'`
    ),
    check(
      "ck_entregas_latitude",
      sql`${table.latitude} is null or ${table.latitude} between -90 and 90`
    ),
    check(
      "ck_entregas_longitude",
      sql`${table.longitude} is null or ${table.longitude} between -180 and 180`
    ),
    check(
      "ck_entregas_coordenadas_completas",
      sql`(${table.latitude} is null) = (${table.longitude} is null)`
    ),
  ]
);

export const entregaAnexos = pgTable(
  "entrega_anexos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entregaId: uuid("entrega_id")
      .notNull()
      .references(() => entregas.id, { onDelete: "cascade" }),
    tipo: tipoAnexoEntregaEnum("tipo").notNull(),
    arquivoUrl: text("arquivo_url").notNull(),
    capturadoEm: timestamp("capturado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    capturadoPor: uuid("capturado_por").references(() => colaboradores.id),
    capturadoPorMotoboy: uuid("capturado_por_motoboy").references(
      () => motoboys.id
    ),
  },
  (table) => [
    index("idx_entrega_anexos_entrega").on(table.entregaId),
    index("idx_entrega_anexos_motoboy").on(table.capturadoPorMotoboy),
    check(
      "ck_entrega_anexos_um_ator",
      sql`num_nonnulls(${table.capturadoPor}, ${table.capturadoPorMotoboy}) <= 1`
    ),
  ]
);

export const entregaHistorico = pgTable(
  "entrega_historico",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entregaId: uuid("entrega_id")
      .notNull()
      .references(() => entregas.id, { onDelete: "cascade" }),
    statusAnterior: statusEntregaEnum("status_anterior"),
    statusNovo: statusEntregaEnum("status_novo").notNull(),
    alteradoPor: uuid("alterado_por").references(() => colaboradores.id),
    alteradoPorMotoboy: uuid("alterado_por_motoboy").references(
      () => motoboys.id
    ),
    alteradoPorAdmin: uuid("alterado_por_admin").references(
      () => usuariosAdmin.id
    ),
    alteradoEm: timestamp("alterado_em", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    observacao: text("observacao"),
  },
  (table) => [
    index("idx_entrega_historico_entrega").on(table.entregaId),
    index("idx_entrega_historico_colaborador").on(table.alteradoPor),
    index("idx_entrega_historico_motoboy").on(table.alteradoPorMotoboy),
    index("idx_entrega_historico_admin").on(table.alteradoPorAdmin),
    check(
      "ck_historico_um_ator",
      sql`num_nonnulls(${table.alteradoPor}, ${table.alteradoPorMotoboy}, ${table.alteradoPorAdmin}) <= 1`
    ),
  ]
);

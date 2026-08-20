import { expect, test } from "@playwright/test";

// Testes de fumaça: cada rota principal carrega, mostra o título certo e
// não deixa nenhum erro não tratado no console. Não gravam nada no Supabase
// (ver comentário em playwright.config.ts) — o objetivo aqui é pegar
// regressões óbvias (página quebrada, import faltando, exceção em runtime),
// não validar regra de negócio.
const ROTAS: { path: string; heading: string }[] = [
  { path: "/", heading: "Dashboard" },
  { path: "/canhotos", heading: "Entregas" },
  { path: "/colaboradores", heading: "Colaboradores" },
  { path: "/motoboys", heading: "Motoristas" },
  { path: "/relatorios", heading: "Relatórios" },
];

for (const rota of ROTAS) {
  test(`${rota.path} carrega sem erro e mostra o título "${rota.heading}"`, async ({ page }) => {
    const errosDeConsole: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errosDeConsole.push(msg.text());
    });

    await page.goto(rota.path);
    await expect(page.getByRole("heading", { name: rota.heading, exact: true })).toBeVisible();
    expect(errosDeConsole).toEqual([]);
  });
}

test("submenu Cadastros da barra lateral expande e recolhe", async ({ page }) => {
  await page.goto("/");
  // A barra só revela os rótulos/o submenu com a barra "aberta" (hover) —
  // ver Sidebar.tsx. Sem o hover, o botão fica clipado fora da faixa
  // recolhida de 64px e o clique não teria efeito visível de verdade.
  await page.getByTestId("sidebar").hover();

  const botaoCadastros = page.getByRole("button", { name: "Cadastros" });
  const linkColaboradores = page.getByRole("link", { name: "Colaboradores" });

  // O submenu é renderizado condicionalmente ({cadastrosAberto && (...)})
  // — quando fechado, o link nem existe no DOM, não é só CSS escondendo.
  await expect(linkColaboradores).toHaveCount(0);
  await botaoCadastros.click();
  await expect(linkColaboradores).toBeVisible();
  await botaoCadastros.click();
  await expect(linkColaboradores).toHaveCount(0);
});

test("wizard Adicionar Entrega avança e volta entre as etapas sem gravar nada", async ({ page }) => {
  await page.goto("/canhotos/nova");

  await expect(page.getByRole("heading", { name: "Dados do documento" })).toBeVisible();
  // A Etapa 1 exige o nome do cliente antes de avançar (validação em
  // irParaEtapa2, AdicionarEntregaWizard.tsx) — sem preencher, o clique em
  // "Avançar" fica na mesma etapa e mostra uma mensagem de erro.
  await page.getByPlaceholder("Nome do cliente").fill("Cliente de teste (E2E)");
  await page.getByRole("button", { name: "Avançar" }).click();
  await expect(page.getByRole("heading", { name: "Dados da entrega" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.getByRole("heading", { name: "Dados do documento" })).toBeVisible();
});

test("estado vazio de Motoristas mostra o botão de ação quando não há cadastro", async ({ page }) => {
  await page.goto("/motoboys");
  // Sem Supabase configurado em CI, a lista vem vazia — o EmptyState (com
  // seu próprio atalho "Novo Motorista") aparece no lugar da tabela, além
  // do botão "Novo Motorista" que já existe fixo no topo da tela — por
  // isso são 2 botões com o mesmo nome, não 1.
  await expect(page.getByText("Nenhum motorista cadastrado ainda")).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo Motorista" })).toHaveCount(2);
});

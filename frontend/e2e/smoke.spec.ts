import { expect, test } from "@playwright/test";

// Testes de fumaça: cada rota principal carrega, mostra o título certo e
// não deixa nenhum erro não tratado no console. Não gravam nada no banco
// (ver comentário em playwright.config.ts) — o objetivo aqui é pegar
// regressões óbvias (página quebrada, import faltando, exceção em runtime),
// não validar regra de negócio.
const ROTAS: { path: string; heading: string }[] = [
  { path: "/", heading: "Dashboard" },
  { path: "/canhotos", heading: "Entregas" },
  { path: "/colaboradores", heading: "Colaboradores" },
  { path: "/motoboys", heading: "Motoristas" },
  { path: "/relatorios", heading: "Relatórios" },
  { path: "/veiculos", heading: "Gestão de Veículos" },
  { path: "/canhotos/nova", heading: "Adicionar Entrega" },
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

test("Adicionar Entrega valida os campos obrigatórios sem gravar nada", async ({ page }) => {
  await page.goto("/canhotos/nova");

  await expect(page.getByRole("heading", { name: "Cliente e endereço" })).toBeVisible();
  // Tela única: salvar sem preencher mostra o primeiro campo que falta e não
  // chama o servidor (validação em AdicionarEntregaForm.tsx).
  await page.getByRole("button", { name: "Salvar entrega" }).click();
  // (o Next também tem um role="alert" vazio, o anunciador de rotas)
  await expect(page.getByText("Informe o nome do cliente.")).toBeVisible();
  await page.getByPlaceholder("Nome do cliente").fill("Cliente de teste (E2E)");
  await page.getByRole("button", { name: "Salvar entrega" }).click();
  await expect(page.getByText(/Informe o endereço de entrega/)).toBeVisible();
  await expect(page).toHaveURL(/\/canhotos\/nova$/);
});

test("estado vazio de Motoristas mostra a ação para cadastrar o primeiro motorista", async ({ page }) => {
  await page.goto("/motoboys");

  // O CI roda sem DATABASE_URL, então a camada PostgreSQL devolve o estado
  // vazio. A tela deve continuar oferecendo uma única ação clara de cadastro.
  await expect(
    page.getByText("Nenhum motorista cadastrado ainda")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Novo Motorista" })
  ).toHaveCount(1);
});


test("login do motorista carrega a interface pública sem expor o Portal Admin", async ({ page }) => {
  const errosDeConsole: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errosDeConsole.push(msg.text());
  });

  await page.goto("/motorista/login");

  await expect(page.getByPlaceholder("(00) 00000-0000")).toBeVisible();
  await expect(page.getByPlaceholder("••••")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  expect(errosDeConsole).toEqual([]);
});

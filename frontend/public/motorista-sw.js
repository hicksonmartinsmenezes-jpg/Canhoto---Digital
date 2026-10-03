// Service worker mínimo da área do motorista — existe só pra satisfazer o
// critério de instalabilidade do Chrome/Android (exige um service worker
// ativo com handler de "fetch" pra oferecer "Instalar app", em vez de cair
// pra "Criar atalho"). De propósito NÃO faz cache nem funciona offline:
// evita a complexidade de invalidar cache num app cujos dados (entregas do
// dia, localização) precisam estar sempre atualizados (ver "evitar
// overengineering" em AGENTS.md).
self.addEventListener("fetch", () => {
  // Sem cache — toda requisição passa direto pra rede.
});

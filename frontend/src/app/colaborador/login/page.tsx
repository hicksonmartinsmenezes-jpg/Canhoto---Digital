import { redirect } from "next/navigation";

// O login do colaborador agora é o mesmo do painel (Usuário e Senha).
// Esta rota fica só para quem ainda tem o endereço antigo salvo.
export default function LoginColaboradorPage(): never {
  redirect("/login");
}

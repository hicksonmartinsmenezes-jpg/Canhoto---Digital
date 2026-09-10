import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ erro?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const erro = Array.isArray(params.erro) ? params.erro[0] : params.erro;

  return <LoginForm initialError={erro === "link-invalido" ? "O link de acesso é inválido ou já expirou. Peça um novo abaixo." : null} />;
}

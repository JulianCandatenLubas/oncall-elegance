// Tradução de mensagens de erro do Supabase Auth para português (Brasil)
export function traduzirErroAuth(message: string | undefined | null): string {
  if (!message) return "Ocorreu um erro inesperado. Tente novamente.";
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials") || m.includes("invalid credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (m.includes("user not found")) return "Usuário não encontrado.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "Este e-mail já está cadastrado.";
  if (m.includes("email rate limit") || m.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (m.includes("invalid email") || m.includes("email address"))
    return "E-mail inválido.";
  if (m.includes("session") && m.includes("expired"))
    return "Sessão expirada. Faça login novamente.";
  if (m.includes("jwt expired") || m.includes("token has expired"))
    return "Sessão expirada. Faça login novamente.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Sem conexão com o servidor. Verifique sua internet.";
  if (m.includes("unauthorized") || m.includes("not authorized"))
    return "Acesso não autorizado.";
  if (m.includes("signup is disabled") || m.includes("signups not allowed"))
    return "Cadastro desativado. Solicite um convite ao administrador.";
  if (m.includes("same password"))
    return "A nova senha deve ser diferente da anterior.";
  if (m.includes("weak password")) return "Senha muito fraca. Escolha uma mais forte.";
  if (m.includes("otp") && m.includes("expired"))
    return "Código expirado. Solicite um novo.";
  if (m.includes("token") && (m.includes("invalid") || m.includes("not found")))
    return "Link inválido ou expirado. Solicite um novo convite.";

  return message;
}

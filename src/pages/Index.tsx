import { Navigate } from "react-router-dom";

/** Rota legada: redireciona para a área autenticada ou login. */
export default function Index() {
  return <Navigate to="/" replace />;
}

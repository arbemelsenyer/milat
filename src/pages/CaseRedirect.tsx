import { Navigate, useParams } from "react-router-dom";

/**
 * /cases/:id shortcut → existing 8-phase MediationEngine, preserving all
 * existing stage logic and code untouched.
 */
export default function CaseRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/cases" replace />;
  return <Navigate to={`/legal-reasoning?tab=surec&resume=${id}`} replace />;
}

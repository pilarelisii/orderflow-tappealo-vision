import { Navigate } from "react-router-dom";
import { useAdminUsers } from "@/hooks/useAdminUsers";

export default function AdminRoute({
	children,
}: {
	children: React.ReactNode;
}) {
	const { loading, isAuthenticated, isAdmin } = useAdminUsers();

	if (loading) return null;

	if (!isAuthenticated || !isAdmin) {
		return <Navigate to="/login-admin" replace />;
	}

	return <>{children}</>;
}

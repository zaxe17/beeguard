"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { authService, AuthUser } from "@/services/auth";
import { tokenStore } from "@/services/api";

interface AuthContextValue {
	user: AuthUser | null;
	loading: boolean;
	setUser: (u: AuthUser | null) => void;
	logout: () => void;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		if (!tokenStore.get()) {
			setUser(null);
			setLoading(false);
			return;
		}
		const res = await authService.me();
		if (res.success && res.data) setUser(res.data);
		else {
			authService.logout();
			setUser(null);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const logout = () => {
		authService.logout();
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, loading, setUser, logout, refresh }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
};
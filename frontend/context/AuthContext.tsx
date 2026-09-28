// context/AuthContext.tsx
"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService, AuthUser, Role } from "@/services/auth";
import { currentUserKey, tokenStore } from "@/services/api";
import { responseCache } from "@/lib/offlineDb";
import { AUTH_REFRESH_EVENT } from "@/services/verification";

// While a beekeeper is waiting on verification, re-check their account
// this often so the Report tab unlocks as soon as an admin approves —
// no logout/login needed.
const VERIFICATION_POLL_MS = 30000;

interface AuthContextValue {
	user: AuthUser | null;
	loading: boolean;
	setUser: (u: AuthUser | null) => void;
	logout: () => void;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Only these /auth/me answers mean "your login is no good" (middleware
// auth_middleware.py + routes/auth.py). Network errors / 500s don't.
const LOGIN_REJECTED_MESSAGES = [
	"Token has expired.",
	"Invalid token.",
	"Missing or invalid Authorization header.",
	"User not found.",
];
const isLoginRejected = (message?: string) =>
	!!message && LOGIN_REJECTED_MESSAGES.includes(message);

// OFFLINE MODE — sign out also forgets the data saved on this phone for
// offline viewing, so the next person using it can't see it. Changes
// still waiting to sync are KEPT and sent the next time this same user
// signs in.
const signOut = () => {
	const key = currentUserKey();
	if (key !== "anon") responseCache.clearUser(key);
	authService.logout();
};

// ROUTE GUARD — which role may open which part of the app. Typing
// /citizen (or /beekeeper, /admin) in the address bar used to show that
// side without being signed in. Now:
//   not signed in   -> sent to the login page
//   wrong role      -> sent to your own dashboard
// Pages outside these folders (/, /register, /guest, /forgot-password,
// /offline) stay open to everyone.
const PROTECTED: { prefix: string; role: Role }[] = [
	{ prefix: "/citizen", role: "citizen" },
	{ prefix: "/beekeeper", role: "beekeeper" },
	{ prefix: "/admin", role: "admin" },
];

const homeFor = (role: Role) =>
	role === "citizen" ? "/citizen" : role === "beekeeper" ? "/beekeeper" : "/admin";

const requiredRole = (pathname: string | null): Role | null => {
	if (!pathname) return null;
	const hit = PROTECTED.find(
		(p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`),
	);
	return hit ? hit.role : null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const pathname = usePathname();
	const router = useRouter();
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
		else if (isLoginRejected(res.message)) {
			// The server says this login is no good -> sign out.
			signOut();
			setUser(null);
		}
		// OFFLINE: /auth/me comes from the copy saved on this phone
		// (services/api.ts), so you stay signed in with no internet.
		// Anything else (backend restarting / down, a server error) keeps
		// you logged in — before, a Flask restart while a page was open
		// wiped the saved token and every page then failed with
		// "Missing or invalid Authorization header".
		setLoading(false);
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// NEW — refresh on demand (verification submitted / reviewed).
	useEffect(() => {
		const handler = () => {
			refresh();
		};
		window.addEventListener(AUTH_REFRESH_EVENT, handler);
		return () => window.removeEventListener(AUTH_REFRESH_EVENT, handler);
	}, [refresh]);

	// NEW — unverified beekeepers: poll + re-check when the tab regains focus.
	const waitingOnVerification =
		user?.role === "beekeeper" && user.verification_status !== "Verified";

	useEffect(() => {
		if (!waitingOnVerification) return;
		const interval = setInterval(refresh, VERIFICATION_POLL_MS);
		const onFocus = () => {
			refresh();
		};
		window.addEventListener("focus", onFocus);
		return () => {
			clearInterval(interval);
			window.removeEventListener("focus", onFocus);
		};
	}, [waitingOnVerification, refresh]);

	const logout = () => {
		signOut();
		setUser(null);
	};

	// ROUTE GUARD
	const needRole = requiredRole(pathname);
	const allowed = !needRole || (!!user && user.role === needRole);

	useEffect(() => {
		if (loading || !needRole) return;
		if (!user) router.replace("/");
		else if (user.role !== needRole) router.replace(homeFor(user.role));
	}, [loading, needRole, user, router]);

	return (
		<AuthContext.Provider value={{ user, loading, setUser, logout, refresh }}>
			{/* Protected pages only render once the right user is confirmed —
			    no flash of the dashboard before the redirect. */}
			{allowed ? children : null}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
};
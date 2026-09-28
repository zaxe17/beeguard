// app/page.tsx  (LOGIN PAGE)
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Background from "@/components/Background";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { CheckBox, Input } from "@/components/ui/Input";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { Icon } from "@iconify/react";

// REMEMBER ME — the username/email is kept here so it's filled in next
// time. (The login token itself is kept by tokenStore in services/api.ts.)
const REMEMBER_ID_KEY = "beeguard_remember_identifier";

const homeFor = (role?: string) =>
	role === "citizen"
		? "/citizen"
		: role === "beekeeper"
			? "/beekeeper"
			: "/admin";

const Login = () => {
	const router = useRouter();
	const { user, loading, refresh } = useAuth();

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [remember, setRemember] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	// Remember me: fill in the saved username and keep the box ticked.
	useEffect(() => {
		try {
			const saved = localStorage.getItem(REMEMBER_ID_KEY);
			if (saved) {
				setUsername(saved);
				setRemember(true);
			}
		} catch {
			// storage blocked — just start empty
		}
	}, []);

	// Remember me: still signed in (saved token is valid) -> skip the
	// login form and go straight to your dashboard.
	useEffect(() => {
		if (!loading && user) router.replace(homeFor(user.role));
	}, [loading, user, router]);

	const handleSubmit = async () => {
		if (submitting) return; // Enter pressed twice
		setErrorMsg(null);

		if (!username.trim() || !password) {
			setErrorMsg("Please enter your username and password.");
			return;
		}

		setSubmitting(true);

		// No role is sent — the backend auto-detects which account table
		// the identifier belongs to (citizen / beekeeper / admin) and
		// returns the resolved role in res.data.user.role.
		const res = await authService.login({
			identifier: username.trim(),
			password,
			remember_me: remember,
		});

		// Backend returns success:true (with status 403) even when the
		// account exists but email isn't verified yet — it's not a
		// "wrong credentials" case, so it must be checked BEFORE we
		// treat res.success as a real login success.
		const data = res.data as
			| { requires_verification?: boolean; email?: string; role?: string }
			| undefined;

		if (data?.requires_verification) {
			sessionStorage.setItem(
				"beeguard_pending_verification",
				JSON.stringify({ email: data.email, role: data.role }),
			);
			setSubmitting(false);
			router.push("/register/verification");
			return;
		}

		if (res.success) {
			const resolvedRole = res.data?.user?.role;
			try {
				if (remember)
					localStorage.setItem(REMEMBER_ID_KEY, username.trim());
				else localStorage.removeItem(REMEMBER_ID_KEY);
			} catch {
				// storage blocked — login still works
			}
			await refresh();
			router.push(homeFor(resolvedRole));
			setSubmitting(false);
			return;
		}

		setErrorMsg(res.message || "Invalid credentials.");
		setSubmitting(false);
	};

	return (
		<div className="relative bg-white h-screen overflow-hidden">
			{/* BACKGROUND */}
			<Background />

			{/* CONTAINER */}
			<div className="relative h-full flex flex-wrap justify-center items-center z-10 p-5">
				{/* LOGIN FORM */}
				<div className="relative w-full flex lg:flex-row flex-col justify-center items-center">
					{/* LOGO */}
					<Logo />

					<FormContainer
						width="lg:w-130 w-full"
						onSubmit={handleSubmit}>
						{/* FORM HEADER */}
						<h1 className="Poppins-Bold text-[#4A2F00] lg:text-5xl text-5xl lg:block hidden">
							Welcome Back!
						</h1>

						<h2 className="Poppins-SemiBold text-[#7A6A58] lg:text-2xl text-base lg:mb-12 mb-8 lg:block hidden">
							Glad to see you again.
						</h2>

						{/* LOG IN INPUT */}
						<div className="flex flex-col gap-6">
							<Input
								label="Username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
							<Input
								label="Password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<div className="flex justify-between">
								<CheckBox
									label="Remember me"
									checked={remember}
									onCheckedChange={setRemember}
								/>
								<Link
									href="/forgot-password"
									className="hover:underline text-[#ff9a00] font-extrabold lg:text-lg text-sm">
									Forgot Password?
								</Link>
							</div>
						</div>

						{errorMsg && (
							<p className="text-sm text-red-600 mt-4">
								{errorMsg}
							</p>
						)}

						<div className="flex flex-col gap-4 mt-10 text-center">
							{/* SUBMIT BUTTON */}
							{/* type="submit" -> clicking it OR pressing Enter signs in */}
							<Button
								buttonType="submit"
								label={submitting ? "Signing in..." : "Sign In"}
								disabled={submitting}
							/>

							{/* SIGN UP ROUTE */}
							<span className="">
								Don&apos;t have an account?{" "}
								<Link
									href="/register"
									className="hover:underline text-[#ff9a00] font-bold">
									Sign Up
								</Link>
							</span>

							{/* GUEST BEE IDENTIFICATION (no login) */}
							<Link
								href="/guest"
								className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/25 py-2 text-[15px] font-semibold text-yellow-900 shadow-[0_2px_8px_rgba(180,110,0,0.25)] backdrop-blur-md">
								<Icon
									icon="bi:camera-fill"
									className="w-6 h-6 mb-0.5"
								/>
								<span>Try Bee Identification</span>
							</Link>
						</div>
					</FormContainer>
				</div>
			</div>
		</div>
	);
};

export default Login;

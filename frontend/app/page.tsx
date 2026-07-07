"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import Background from "@/components/Background";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { CheckBox, Input } from "@/components/ui/Input";
import { authService } from "@/services/auth";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/modal/Modal";

const Login = () => {
	const router = useRouter();
	const { refresh } = useAuth();

	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [remember, setRemember] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const handleSubmit = async (e?: FormEvent) => {
		e?.preventDefault();
		setErrorMsg(null);

		if (!username.trim() || !password) {
			setErrorMsg("Please enter your username and password.");
			return;
		}

		setSubmitting(true);

		// Try citizen first, then beekeeper, then admin — matches the schema's role tables.
		const roles: ("citizen" | "beekeeper" | "admin")[] = [
			"citizen",
			"beekeeper",
			"admin",
		];
		let lastError = "Invalid credentials.";
		for (const role of roles) {
			const res = await authService.login({
				role,
				identifier: username.trim(),
				password,
			});
			if (res.success) {
				await refresh();
				if (role === "citizen") router.push("/citizen");
				else if (role === "beekeeper")
					router.push("/citizen"); // TODO: replace when beekeeper dashboard exists
				else router.push("/citizen"); // TODO: admin dashboard route
				setSubmitting(false);
				return;
			}
			lastError = res.message || lastError;
		}

		setErrorMsg(lastError);
		setSubmitting(false);
	};

	return (
		<div className="relative bg-white h-screen overflow-hidden">
			{/* BACKGROUND */}
			<Background />

			{/* CONTAINER */}
			<div className="relative h-full flex flex-wrap justify-center items-center z-10 p-5">
				{/* LOGO */}
				<Logo />

				{/* LOGIN FORM */}
				<div className="relative lg:w-1/2 w-full flex flex-col justify-center items-center">
					<FormContainer width="lg:w-130">
						{/* FORM HEADER */}
						<h1 className="Poppins-Bold text-[#4A2F00] lg:text-5xl text-5xl">
							Welcome Back!
						</h1>

						<h2 className="Poppins-SemiBold text-[#7A6A58] lg:text-2xl text-base lg:mb-12 mb-8">
							Glad to see you again.
						</h2>

						{/* LOG IN INPUT */}
						<div className="flex flex-col lg:gap-6 gap-3">
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
									href=""
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
							<Button
								buttonType="button"
								label={submitting ? "Signing in..." : "Sign In"}
								onClick={() => handleSubmit()}
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
						</div>
					</FormContainer>
				</div>
			</div>
		</div>
	);
};

export default Login;

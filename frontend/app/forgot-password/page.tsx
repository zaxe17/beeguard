// app/forgot-password/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { authService } from "@/services/auth";

/**
 * FORGOT PASSWORD — 3 steps on one page (based on /register/verification):
 *   1. "email"    — enter the account email -> a 6-digit code is emailed
 *   2. "code"     — enter the code (Resend Code, 60s cooldown)
 *   3. "password" — set a new password -> back to login
 *
 * Backend: POST /api/auth/forgot-password, /verify-reset-code, /reset-password
 */
type Step = "email" | "code" | "password";

const RESEND_COOLDOWN = 60;

const ForgotPassword = () => {
	const router = useRouter();

	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [resetToken, setResetToken] = useState<string | null>(null);
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [resending, setResending] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);

	useEffect(() => {
		if (resendCooldown <= 0) return;
		const t = setInterval(
			() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)),
			1000,
		);
		return () => clearInterval(t);
	}, [resendCooldown]);

	const resetMessages = () => {
		setError(null);
		setInfo(null);
	};

	// ── STEP 1: send code ──
	const handleSendCode = async () => {
		resetMessages();
		const trimmed = email.trim();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
			setError("Please enter a valid email address.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await authService.forgotPassword({ email: trimmed });
			if (!res.success) {
				setError(res.message || "Could not send a reset code.");
				return;
			}
			setEmail(trimmed);
			setCode("");
			setStep("code");
			setResendCooldown(RESEND_COOLDOWN);
			setInfo(res.message || "A reset code has been sent to your email.");
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	// ── STEP 2: verify code ──
	const handleVerifyCode = async () => {
		resetMessages();
		if (!/^\d{6}$/.test(code)) {
			setError("Enter the 6-digit code.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await authService.verifyResetCode({ email, code });
			if (!res.success || !res.data?.reset_token) {
				setError(res.message || "Verification failed.");
				return;
			}
			setResetToken(res.data.reset_token);
			setStep("password");
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const handleResend = async () => {
		// Same double-click guard as the verification page.
		if (resendCooldown > 0 || resending) return;

		setResending(true);
		resetMessages();
		try {
			const res = await authService.forgotPassword({ email });
			if (!res.success) {
				setError(res.message || "Could not resend code.");
				return;
			}
			setInfo("A new code has been sent to your email.");
			setResendCooldown(RESEND_COOLDOWN);
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setResending(false);
		}
	};

	// ── STEP 3: new password ──
	const handleResetPassword = async () => {
		resetMessages();
		if (!resetToken) {
			setStep("email");
			setError("Your reset session expired. Please start again.");
			return;
		}
		if (
			password.length < 8 ||
			password.length > 72 ||
			!/[A-Za-z]/.test(password) ||
			!/\d/.test(password)
		) {
			setError(
				"Password must be 8–72 characters and include both letters and numbers.",
			);
			return;
		}
		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await authService.resetPassword({
				reset_token: resetToken,
				password,
				confirm_password: confirmPassword,
			});
			if (!res.success) {
				setError(
					res.field_errors?.password ||
						res.field_errors?.confirm_password ||
						res.message ||
						"Could not reset password.",
				);
				return;
			}
			setInfo("Password updated. Redirecting to login...");
			setTimeout(() => router.replace("/"), 1500);
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const messages = (
		<>
			{error && <p className="text-xs text-red-600 mt-2">{error}</p>}
			{info && <p className="text-xs text-green-700 mt-2">{info}</p>}
		</>
	);

	return (
		<FormContainer
			width="lg:w-130 w-full"
			onSubmit={() => {
				// Enter key / submit button -> the current step's action.
				if (submitting) return;
				if (step === "email") handleSendCode();
				else if (step === "code") handleVerifyCode();
				else handleResetPassword();
			}}>
			{/* ── STEP 1: EMAIL ── */}
			{step === "email" && (
				<>
					<div className="text-center mb-7">
						<h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
							Forgot Password
						</h1>
						<p className="text-sm">
							Enter the email address of your account and
							we&apos;ll send you a 6-digit code to reset your
							password.
						</p>
					</div>

					<div className="mb-6">
						<Input
							label="Email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						{messages}
					</div>

					<Button
						buttonType="submit"
						label={submitting ? "Sending..." : "Send Code"}
						disabled={submitting}
					/>
				</>
			)}

			{/* ── STEP 2: CODE ── */}
			{step === "code" && (
				<>
					<div className="text-center mb-7">
						<h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
							Enter Reset Code
						</h1>
						<p className="text-sm">
							If an account uses{" "}
							<span className="Poppins-Bold">{email}</span>, we
							sent a 6-digit code to it. Enter it below.
						</p>
					</div>

					<div className="mb-6">
						<input
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							value={code}
							onChange={(e) =>
								setCode(
									e.target.value.replace(/\D/g, "").slice(0, 6),
								)
							}
							className="w-full text-center rounded-xl border border-[#a6a3a3] outline-0 p-2.5 tracking-[0.5em] text-lg"
						/>

						{messages}

						<div className="mt-2 flex items-center justify-between">
							<button
								type="button"
								onClick={handleResend}
								disabled={resendCooldown > 0 || resending}
								className={`text-sm bg-transparent border-0 p-0 ${
									resendCooldown > 0 || resending
										? "text-[#a6a3a3] cursor-not-allowed"
										: "text-[#4A2F00] cursor-pointer hover:underline"
								}`}>
								{resendCooldown > 0
									? `Resend Code (${resendCooldown}s)`
									: resending
										? "Sending..."
										: "Resend Code"}
							</button>

							<button
								type="button"
								onClick={() => {
									resetMessages();
									setStep("email");
								}}
								className="text-sm bg-transparent border-0 p-0 text-[#4A2F00] cursor-pointer hover:underline">
								Change email
							</button>
						</div>
					</div>

					<Button
						buttonType="submit"
						label={submitting ? "Verifying..." : "Verify"}
						disabled={submitting}
					/>
				</>
			)}

			{/* ── STEP 3: NEW PASSWORD ── */}
			{step === "password" && (
				<>
					<div className="text-center mb-7">
						<h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
							Set New Password
						</h1>
						<p className="text-sm">
							Use 8–72 characters with both letters and numbers.
						</p>
					</div>

					<div className="flex flex-col gap-6 mb-6">
						<Input
							label="New Password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						<Input
							label="Confirm New Password"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>
						<div>{messages}</div>
					</div>

					<Button
						buttonType="submit"
						label={submitting ? "Saving..." : "Reset Password"}
						disabled={submitting}
					/>
				</>
			)}

			{/* BACK TO LOGIN */}
			<div className="text-center mt-4">
				<Link
					href="/"
					className="hover:underline text-[#ff9a00] font-bold text-sm">
					Back to Sign In
				</Link>
			</div>
		</FormContainer>
	);
};

export default ForgotPassword;
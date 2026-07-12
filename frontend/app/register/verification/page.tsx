"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { authService } from "@/services/auth";

type Pending = { email: string; role: "citizen" | "beekeeper" };

const Verification = () => {
    const router = useRouter();
    const [pending, setPending] = useState<Pending | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const raw = sessionStorage.getItem("beeguard_pending_verification");
        if (!raw) {
            router.replace("/register");
            return;
        }
        try {
            setPending(JSON.parse(raw));
            setResendCooldown(60);
        } catch {
            router.replace("/register");
        }
    }, [router]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(
            () => setResendCooldown((s) => (s > 0 ? s - 1 : 0)),
            1000,
        );
        return () => clearInterval(t);
    }, [resendCooldown]);

    const handleVerify = async () => {
        if (!pending) return;
        setError(null);
        setInfo(null);

        if (!/^\d{6}$/.test(code)) {
            setError("Enter the 6-digit verification code.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await authService.verifyOtp({
                role: pending.role,
                email: pending.email,
                code,
            });

            if (!res.success) {
                setError(res.message || "Verification failed.");
                setSubmitting(false);
                return;
            }

            // Email verified — send user to login so they sign in themselves.
            sessionStorage.removeItem("beeguard_pending_verification");
            setInfo("Email verified. Redirecting to login...");
            setTimeout(() => router.replace("/"), 1200);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async () => {
        // Guard against double-fires: block if already cooling down,
        // already mid-resend, or no pending data. This check happens
        // BEFORE any state is touched, so a rapid double-click can't
        // sneak a second request through on stale state.
        if (!pending || resendCooldown > 0 || resending) return;

        setResending(true);
        setError(null);
        setInfo(null);

        try {
            const res = await authService.resendOtp({
                role: pending.role,
                email: pending.email,
            });
            if (!res.success) {
                setError(res.message || "Could not resend code.");
                return;
            }
            setInfo("A new code has been sent to your email.");
            setResendCooldown(60);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setResending(false);
        }
    };

    return (
        <FormContainer width="w-2/3">
            <div className="text-center mb-7">
                <h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
                    Verify Your Account
                </h1>
                <p className="text-sm">
                    We&apos;ve sent a 6-digit verification code to{" "}
                    <span className="Poppins-Bold">
                        {pending?.email || "your email"}
                    </span>
                    . Enter it below to continue.
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
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-full text-center rounded-xl border border-[#a6a3a3] outline-0 p-2.5 tracking-[0.5em] text-lg"
                />

                {error && (
                    <p className="text-xs text-red-600 mt-2">{error}</p>
                )}
                {info && (
                    <p className="text-xs text-green-700 mt-2">{info}</p>
                )}

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
                </div>
            </div>

            <Button
                buttonType="button"
                label={submitting ? "Verifying..." : "Verify"}
                onClick={handleVerify}
                disabled={submitting}
            />
        </FormContainer>
    );
};

export default Verification;
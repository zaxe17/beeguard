"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { CheckBox } from "@/components/ui/Input";
import { Modal } from "@/components/modal/Modal";
import {
    authService,
    getCoordinatesOrFallback,
    RegisterPayload,
} from "@/services/auth";
import {
    composeAddress,
    composeName,
    RegistrationDraft,
} from "@/lib/validation";

import termCondContent from "@/data/termsCondition.json";

const TermsCondition = () => {
    const router = useRouter();
    const [accepted, setAccepted] = useState(false);
    const [draft, setDraft] = useState<RegistrationDraft | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const raw = sessionStorage.getItem("beeguard_registration_draft");
            if (raw) {
                try {
                    setDraft(JSON.parse(raw));
                } catch {
                    setDraft(null);
                }
            }
        }
    }, []);

    const openConfirm = () => {
        setErrorMsg(null);
        if (!accepted) {
            setErrorMsg("You must accept the Terms & Conditions.");
            return;
        }
        if (!draft) {
            setErrorMsg("Registration data missing. Please start again.");
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmedSubmit = async () => {
        if (!draft) return;
        setSubmitting(true);
        setErrorMsg(null);

        try {
            const coords = await getCoordinatesOrFallback();

            const payload: RegisterPayload = {
                role: draft.role,
                name: composeName(draft),
                citizenship: draft.citizenship,
                address: composeAddress(draft) || null,
                latitude: coords.latitude,
                longitude: coords.longitude,
                username: draft.username,
                password: draft.password,
                confirm_password: draft.confirm_password,
                contact_no: draft.contact_no,
                email: draft.email,
                terms_accepted: true,
            };

            if (draft.role === "beekeeper") {
                payload.farm_name = draft.farm_name || null;
                payload.apiary_type =
                    draft.apiary_type as RegisterPayload["apiary_type"];
            }

            const res = await authService.register(payload);

            if (!res.success) {
                // If backend flagged a duplicate on email/phone/username,
                // send the user BACK to the registration form with field-level
                // errors highlighted, and clear password + confirm_password.
                const fe = res.field_errors || {};
                const dupFields = ["email", "contact_no", "username"];
                const hasFieldError = dupFields.some((k) => fe[k]);

                if (hasFieldError) {
                    const clearedDraft: RegistrationDraft = {
                        ...draft,
                        password: "",
                        confirm_password: "",
                    };
                    sessionStorage.setItem(
                        "beeguard_registration_draft",
                        JSON.stringify(clearedDraft),
                    );
                    sessionStorage.setItem(
                        "beeguard_field_errors",
                        JSON.stringify(fe),
                    );
                    setShowConfirm(false);
                    setSubmitting(false);
                    router.push("/register");
                    return;
                }

                setErrorMsg(
                    res.errors && res.errors.length > 0
                        ? `${res.message}: ${res.errors.join(", ")}`
                        : res.message,
                );
                setSubmitting(false);
                setShowConfirm(false);
                return;
            }

            // Success — stash email/role for verification page, then go there
            sessionStorage.setItem(
                "beeguard_pending_verification",
                JSON.stringify({ email: draft.email, role: draft.role }),
            );
            sessionStorage.removeItem("beeguard_registration_draft");
            sessionStorage.removeItem("beeguard_role");
            setShowConfirm(false);
            router.push("/register/verification");
        } catch {
            setErrorMsg("Network error. Please try again.");
            setSubmitting(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <FormContainer>
                <div className="text-center mb-7">
                    <h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
                        Terms & Conditions
                    </h1>
                </div>

                <div className="flex h-100">
                    <ul className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1">
                        {termCondContent.map((tc, i) => (
                            <div className="mb-3" key={i}>
                                <li className="Poppins-Bold text-[#ffce1c] text-sm">
                                    {tc.title}
                                </li>
                                {tc.content.map((cont, ind) => (
                                    <li
                                        key={ind}
                                        className={`${
                                            tc.listStyle ? "list-disc ml-4" : ""
                                        } text-xs whitespace-pre-line`}>
                                        {cont}
                                    </li>
                                ))}
                            </div>
                        ))}
                    </ul>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                    <CheckBox
                        checked={accepted}
                        onCheckedChange={setAccepted}
                        label={
                            <div className="text-xs">
                                I have read and agree to the{" "}
                                <span className="Poppins-Bold text-[#ff9a00]">
                                    Terms & Conditions.
                                </span>
                            </div>
                        }
                    />

                    {errorMsg && (
                        <p className="text-xs text-red-600">{errorMsg}</p>
                    )}

                    <Button
                        buttonType="button"
                        label={submitting ? "Submitting..." : "Create Account"}
                        onClick={openConfirm}
                        disabled={submitting}
                    />
                </div>
            </FormContainer>

            <Modal
                open={showConfirm}
                title="Confirm Account Creation"
                content="Are you sure you want to create this account? Please review all the information before proceeding."
                labelButton="Create Account"
                loading={submitting}
                onCancel={() => !submitting && setShowConfirm(false)}
                onConfirm={handleConfirmedSubmit}
            />
        </>
    );
};

export default TermsCondition;

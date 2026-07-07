"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { Input, Select } from "@/components/ui/Input";
import { useFetch } from "@/hooks/useFetch";
import {
	RegistrationDraft,
	validateRegistrationDraft,
} from "@/lib/validation";

const APIARY_TYPES = [
	{ label: "Commercial Farm", value: "Commercial Farm" },
	{ label: "Backyard", value: "Backyard" },
	{ label: "Rooftop", value: "Rooftop" },
	{ label: "Wild/Forest", value: "Wild/Forest" },
];

const RegistrationForm = () => {
	const router = useRouter();

	const { data: region } = useFetch("https://psgc.cloud/api/regions");
	const { data: citiesMunicipalities } = useFetch(
		"https://psgc.cloud/api/cities-municipalities",
	);

	const [role, setRole] = useState<"citizen" | "beekeeper">("citizen");
	const [form, setForm] = useState<RegistrationDraft>({
		role: "citizen",
		first_name: "",
		middle_name: "",
		last_name: "",
		citizenship: "",
		username: "",
		region: "",
		city: "",
		barangay: "",
		street: "",
		contact_no: "",
		email: "",
		password: "",
		confirm_password: "",
		farm_name: "",
		apiary_type: "",
	});
	const [errors, setErrors] = useState<string[]>([]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const stored = sessionStorage.getItem("beeguard_role");
			if (stored === "citizen" || stored === "beekeeper") {
				setRole(stored);
				setForm((f) => ({ ...f, role: stored }));
			}
		}
	}, []);

	const update = <K extends keyof RegistrationDraft>(
		key: K,
		value: RegistrationDraft[K],
	) => setForm((f) => ({ ...f, [key]: value }));

	const handleNext = () => {
		const errs = validateRegistrationDraft(form);
		setErrors(errs);
		if (errs.length > 0) return;

		if (typeof window !== "undefined") {
			sessionStorage.setItem(
				"beeguard_registration_draft",
				JSON.stringify(form),
			);
		}
		router.push("/register/terms_condition");
	};

	return (
		<FormContainer width="85%">
			<div className="text-center mb-4">
				<h1 className="Poppins-Bold text-3xl">
					Sign Up - {role === "citizen" ? "Citizen" : "Beekeeper"}
				</h1>
			</div>

			<div className="flex flex-col gap-2 mb-5">
				{/* NAME */}
				<div className="flex flex-row gap-2.5">
					<Input
						label={
							<>
								First Name{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						value={form.first_name}
						onChange={(e) => update("first_name", e.target.value)}
					/>
					<Input
						label={<>Middle Name</>}
						height={30}
						value={form.middle_name}
						onChange={(e) => update("middle_name", e.target.value)}
					/>
					<Input
						label={
							<>
								Last Name{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						value={form.last_name}
						onChange={(e) => update("last_name", e.target.value)}
					/>
				</div>

				<div className="flex flex-row gap-2.5">
					<Input
						label={
							<>
								Citizenship{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						value={form.citizenship}
						onChange={(e) => update("citizenship", e.target.value)}
					/>
					<Input
						label={
							<>
								Username{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						value={form.username}
						onChange={(e) => update("username", e.target.value)}
					/>
				</div>

				{/* ADDRESS */}
				<div className="flex flex-row gap-2.5">
					<Select
						label={
							<>
								Region{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						options={region?.map((r: { name: string; code: string }) => ({
							label: r.name,
							value: r.code,
						}))}
						height={30}
						value={form.region}
						onSelectChange={(e) => update("region", e.target.value)}
					/>
					<Select
						label={
							<>
								City / Municipality{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						options={citiesMunicipalities?.map(
							(cm: { name: string; code: string }) => ({
								label: cm.name,
								value: cm.code,
							}),
						)}
						height={30}
						value={form.city}
						onSelectChange={(e) => update("city", e.target.value)}
					/>
					<Input
						label={
							<>
								Barangay{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						value={form.barangay}
						onChange={(e) => update("barangay", e.target.value)}
					/>
				</div>

				<Input
					label={
						<>
							House No. / Street{" "}
							<span className="text-[#a6a3a3]">(Optional)</span>
						</>
					}
					height={30}
					value={form.street}
					onChange={(e) => update("street", e.target.value)}
				/>

				{/* CONTACTS */}
				<div className="flex flex-row gap-2.5">
					<Input
						label={
							<>
								Contact Number{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						value={form.contact_no}
						onChange={(e) => update("contact_no", e.target.value)}
					/>
					<Input
						label={
							<>
								Email Address{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						value={form.email}
						onChange={(e) => update("email", e.target.value)}
					/>
				</div>

				{/* PASSWORD */}
				<div className="flex flex-row gap-2.5">
					<Input
						label={
							<>
								Password{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						type="password"
						value={form.password}
						onChange={(e) => update("password", e.target.value)}
					/>
					<Input
						label={
							<>
								Confirm Password{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
						type="password"
						value={form.confirm_password}
						onChange={(e) =>
							update("confirm_password", e.target.value)
						}
					/>
				</div>

				{/* BEEKEEPER-ONLY */}
				{role === "beekeeper" && (
					<div className="flex flex-row gap-2.5">
						<Input
							label={<>Farm Name (Optional)</>}
							height={30}
							value={form.farm_name || ""}
							onChange={(e) =>
								update("farm_name", e.target.value)
							}
						/>
						<Select
							label={
								<>
									Apiary Type{" "}
									<span className="text-[#ff0000]">*</span>
								</>
							}
							options={APIARY_TYPES}
							height={30}
							value={form.apiary_type || ""}
							onSelectChange={(e) =>
								update("apiary_type", e.target.value)
							}
						/>
					</div>
				)}
			</div>

			{errors.length > 0 && (
				<ul className="mb-3 text-xs text-red-600 list-disc ml-4">
					{errors.map((er, i) => (
						<li key={i}>{er}</li>
					))}
				</ul>
			)}

			<Button
				buttonType="button"
				width="50%"
				label="Next"
				onClick={handleNext}
			/>
		</FormContainer>
	);
};

export default RegistrationForm;

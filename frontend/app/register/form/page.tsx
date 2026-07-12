"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { Input, Select } from "@/components/ui/Input";
import { useFetch } from "@/hooks/useFetch";
import {
	FieldErrors,
	RegistrationDraft,
	validateRegistrationDraftFields,
} from "@/lib/validation";
import { authService } from "@/services/auth";

import citizenship from "@/data/citizenship.json";

const APIARY_TYPES = [
	{ label: "Commercial Farm", value: "Commercial Farm" },
	{ label: "Backyard", value: "Backyard" },
	{ label: "Rooftop", value: "Rooftop" },
	{ label: "Wild/Forest", value: "Wild/Forest" },
];

type PsgcItem = { code: string; name: string };

const RegistrationForm = () => {
	const router = useRouter();

	// Regions — no generic on useFetch; cast the result instead.
	const { data: regionsData } = useFetch(
		"https://psgc.cloud/api/regions",
	);
	const regions = (regionsData as PsgcItem[] | null | undefined) ?? [];

	const [role, setRole] = useState<"citizen" | "beekeeper">("citizen");
	const [form, setForm] = useState<RegistrationDraft>({
		role: "citizen",
		first_name: "",
		middle_name: "",
		last_name: "",
		citizenship: "",
		username: "",
		region: "",
		region_name: "",
		city: "",
		city_name: "",
		barangay: "",
		barangay_name: "",
		street: "",
		contact_no: "",
		email: "",
		password: "",
		confirm_password: "",
		farm_name: "",
		apiary_type: "",
	});

	// Cascading data — cities & barangays only
	const [cities, setCities] = useState<PsgcItem[]>([]);
	const [barangays, setBarangays] = useState<PsgcItem[]>([]);

	const [loadingCities, setLoadingCities] = useState(false);
	const [loadingBarangays, setLoadingBarangays] = useState(false);

	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitting, setSubmitting] = useState(false);

	// Restore role + draft + carried-over field errors
	useEffect(() => {
		if (typeof window === "undefined") return;

		const stored = sessionStorage.getItem("beeguard_role");
		if (stored === "citizen" || stored === "beekeeper") {
			setRole(stored);
			setForm((f) => ({ ...f, role: stored }));
		}

		const raw = sessionStorage.getItem("beeguard_registration_draft");
		if (raw) {
			try {
				const draft = JSON.parse(raw) as RegistrationDraft;
				setForm((f) => ({
					...f,
					...draft,
					password: "",
					confirm_password: "",
				}));
			} catch {
				/* ignore */
			}
		}

		const rawFe = sessionStorage.getItem("beeguard_field_errors");
		if (rawFe) {
			try {
				setErrors(JSON.parse(rawFe));
			} catch {
				/* ignore */
			}
			sessionStorage.removeItem("beeguard_field_errors");
		}
	}, []);

	const update = <K extends keyof RegistrationDraft>(
		key: K,
		value: RegistrationDraft[K],
	) => {
		setForm((f) => ({ ...f, [key]: value }));
		setErrors((prev) => {
			if (!prev[key]) return prev;
			const { [key]: _drop, ...rest } = prev;
			return rest;
		});
	};

	// ── PSGC cascade: Region → City → Barangay ───────────
	// Cities fetched DIRECTLY from region (skipping province)
	useEffect(() => {
		if (!form.region) {
			setCities([]);
			return;
		}
		let cancelled = false;
		setLoadingCities(true);
		fetch(
			`https://psgc.cloud/api/regions/${form.region}/cities-municipalities`,
		)
			.then((r) => (r.ok ? r.json() : []))
			.then((data: PsgcItem[]) => {
				if (!cancelled) setCities(Array.isArray(data) ? data : []);
			})
			.catch(() => {
				if (!cancelled) setCities([]);
			})
			.finally(() => !cancelled && setLoadingCities(false));
		return () => {
			cancelled = true;
		};
	}, [form.region]);

	useEffect(() => {
		if (!form.city) {
			setBarangays([]);
			return;
		}
		let cancelled = false;
		setLoadingBarangays(true);
		fetch(
			`https://psgc.cloud/api/cities-municipalities/${form.city}/barangays`,
		)
			.then((r) => (r.ok ? r.json() : []))
			.then((data: PsgcItem[]) => {
				if (!cancelled) setBarangays(Array.isArray(data) ? data : []);
			})
			.catch(() => {
				if (!cancelled) setBarangays([]);
			})
			.finally(() => !cancelled && setLoadingBarangays(false));
		return () => {
			cancelled = true;
		};
	}, [form.city]);

	const regionOptions = useMemo(
		() =>
			regions.map((r: PsgcItem) => ({ label: r.name, value: r.code })),
		[regions],
	);
	const cityOptions = useMemo(
		() => cities.map((c: PsgcItem) => ({ label: c.name, value: c.code })),
		[cities],
	);
	const barangayOptions = useMemo(
		() =>
			barangays.map((b: PsgcItem) => ({ label: b.name, value: b.code })),
		[barangays],
	);

	// ── Cascade handlers (store BOTH code and name) ─────
	const onRegionChange = (code: string) => {
		const name = regionOptions.find((r) => r.value === code)?.label || "";
		setForm((f) => ({
			...f,
			region: code,
			region_name: name,
			city: "",
			city_name: "",
			barangay: "",
			barangay_name: "",
		}));
	};
	const onCityChange = (code: string) => {
		const name = cityOptions.find((r) => r.value === code)?.label || "";
		setForm((f) => ({
			...f,
			city: code,
			city_name: name,
			barangay: "",
			barangay_name: "",
		}));
	};
	const onBarangayChange = (code: string) => {
		const name = barangayOptions.find((r) => r.value === code)?.label || "";
		setForm((f) => ({
			...f,
			barangay: code,
			barangay_name: name,
		}));
	};

	const handleNext = async () => {
		const fe = validateRegistrationDraftFields(form);
		if (Object.keys(fe).length > 0) {
			setErrors(fe);
			return;
		}
		setErrors({});
		setSubmitting(true);

		try {
			const res = await authService.checkUnique({
				role: form.role,
				username: form.username.trim(),
				email: form.email.trim(),
				contact_no: form.contact_no.trim(),
			});

			if (!res.success) {
				const backendFe =
					(res.field_errors as FieldErrors) || ({} as FieldErrors);
				setErrors(backendFe);
				setSubmitting(false);
				return;
			}

			if (typeof window !== "undefined") {
				sessionStorage.setItem(
					"beeguard_registration_draft",
					JSON.stringify(form),
				);
			}
			router.push("/register/terms_condition");
		} catch {
			setErrors({ form: "Network error. Please try again." });
		} finally {
			setSubmitting(false);
		}
	};

	const FieldError = ({ name }: { name: keyof RegistrationDraft | "form" }) =>
		errors[name] ? (
			<span className="text-[11px] text-red-600 mt-0.5">
				{errors[name]}
			</span>
		) : null;

	return (
		<FormContainer width="lg:w-4/5">
			<div className="text-center mb-4">
				<h1 className="Poppins-Bold text-3xl">
					Sign Up - {role === "citizen" ? "Citizen" : "Beekeeper"}
				</h1>
			</div>

			<div className="flex flex-col gap-2 mb-5">
				{/* NAME */}
				<div className="flex flex-row gap-2.5">
					<div className="flex-1 flex flex-col">
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
							error={!!errors.first_name}
							capitalize
						/>
						<FieldError name="first_name" />
					</div>
					<div className="flex-1 flex flex-col">
						<Input
							label={<>Middle Name</>}
							height={30}
							value={form.middle_name}
							onChange={(e) => update("middle_name", e.target.value)}
							capitalize
						/>
					</div>
					<div className="flex-1 flex flex-col">
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
							error={!!errors.last_name}
							capitalize
						/>
						<FieldError name="last_name" />
					</div>
				</div>

				{/* CITIZENSHIP + USERNAME */}
				<div className="flex flex-row gap-2.5">
					<div className="flex-1 flex flex-col">
						<Select
							label={
								<>
									Citizenship{" "}
									<span className="text-[#ff0000]">*</span>
								</>
							}
							options={citizenship?.map(
								(cs: { name: string; code: string }) => ({
									label: cs.name,
									value: cs.code,
								}),
							)}
							height={30}
							value={form.citizenship}
							onSelectChange={(e) =>
								update("citizenship", e.target.value)
							}
							error={!!errors.citizenship}
							capitalize
						/>
						<FieldError name="citizenship" />
					</div>
					<div className="flex-1 flex flex-col">
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
							error={!!errors.username}
						/>
						<FieldError name="username" />
					</div>
				</div>

				{/* ADDRESS — Region → City → Barangay */}
				<div className="flex flex-row gap-2.5">
					<div className="flex-1 flex flex-col">
						<Select
							label={
								<>
									Region{" "}
									<span className="text-[#ff0000]">*</span>
								</>
							}
							options={regionOptions}
							height={30}
							value={form.region}
							onSelectChange={(e) => onRegionChange(e.target.value)}
							error={!!errors.region}
							capitalize
						/>
						<FieldError name="region" />
					</div>
					<div className="flex-1 flex flex-col">
						<Select
							label={
								<>
									City / Municipality{" "}
									<span className="text-[#ff0000]">*</span>
								</>
							}
							options={cityOptions}
							height={30}
							value={form.city}
							onSelectChange={(e) => onCityChange(e.target.value)}
							error={!!errors.city}
							capitalize
							disabled={!form.region || loadingCities}
						/>
						<FieldError name="city" />
					</div>
					<div className="flex-1 flex flex-col">
						<Select
							label={
								<>
									Barangay{" "}
									<span className="text-[#ff0000]">*</span>
								</>
							}
							options={barangayOptions}
							height={30}
							value={form.barangay}
							onSelectChange={(e) => onBarangayChange(e.target.value)}
							error={!!errors.barangay}
							capitalize
							disabled={!form.city || loadingBarangays}
						/>
						<FieldError name="barangay" />
					</div>
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
					capitalize
				/>

				{/* CONTACTS */}
				<div className="flex flex-row gap-2.5">
					<div className="flex-1 flex flex-col">
						<Input
							label={
								<>
									Contact Number{" "}
									<span className="text-[#ff0000]">*</span>
								</>
							}
							type="text"
							height={30}
							value={form.contact_no}
							onChange={(e) => update("contact_no", e.target.value)}
							error={!!errors.contact_no}
						/>
						<FieldError name="contact_no" />
					</div>
					<div className="flex-1 flex flex-col">
						<Input
							label={
								<>
									Email Address{" "}
									<span className="text-[#ff0000]">*</span>
								</>
							}
							type="email"
							height={30}
							value={form.email}
							onChange={(e) => update("email", e.target.value)}
							error={!!errors.email}
						/>
						<FieldError name="email" />
					</div>
				</div>

				{/* PASSWORD */}
				<div className="flex flex-row gap-2.5">
					<div className="flex-1 flex flex-col">
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
							error={!!errors.password}
						/>
						<FieldError name="password" />
					</div>
					<div className="flex-1 flex flex-col">
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
							error={!!errors.confirm_password}
						/>
						<FieldError name="confirm_password" />
					</div>
				</div>

				{/* BEEKEEPER-ONLY */}
				{role === "beekeeper" && (
					<div className="flex flex-row gap-2.5">
						<div className="flex-1 flex flex-col">
							<Input
								label={
									<>
										Farm Name{" "}
										<span className="text-[#ff0000]">*</span>
									</>
								}
								height={30}
								value={form.farm_name || ""}
								onChange={(e) => update("farm_name", e.target.value)}
								error={!!errors.farm_name}
							/>
							<FieldError name="farm_name" />
						</div>
						<div className="flex-1 flex flex-col">
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
								error={!!errors.apiary_type}
							/>
							<FieldError name="apiary_type" />
						</div>
					</div>
				)}
			</div>

			{errors.form && (
				<p className="mb-3 text-xs text-red-600">{errors.form}</p>
			)}

			<div className="flex justify-center">
				<Button
					buttonType="button"
					width="50%"
					label={submitting ? "Checking..." : "Next"}
					onClick={handleNext}
					disabled={submitting}
				/>
			</div>
		</FormContainer>
	);
};

export default RegistrationForm;

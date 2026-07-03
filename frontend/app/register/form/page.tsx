"use client";

import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { Input, Select } from "@/components/ui/Input";
import { useFetch } from "@/hooks/useFetch";

const RegistrationForm = () => {
	// API CALL FOR REGION AND CITIES / MUNICIPALITY
	const { data: region, loading: loadingRegion } = useFetch(
		"https://psgc.cloud/api/regions",
	);

	const { data: citiesMunicipalities, loading: loadingCitiesMunicip } =
		useFetch("https://psgc.cloud/api/cities-municipalities");

	return (
		<FormContainer width="85%">
			<div className="text-center mb-4">
				<h1
					className="Poppins-Bold text-3xl">
					Sign Up - Citizen
				</h1>
			</div>

			{/* INPUTS */}
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
					/>
					<Input label={<>Middle Name</>} height={30} />
					<Input
						label={
							<>
								Last Name{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
					/>
				</div>

				<div className="flex flex-row gap-2.5">
					{/* CITIZENSHIP */}
					<Input
						label={
							<>
								Citizenship{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
					/>

					{/* USERNAME */}
					<Input
						label={
							<>
								Username{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
					/>
				</div>

				{/* ADDRESS */}
				<div className="flex flex-row gap-2.5">
					<Select
						label={
							<>
								Region <span className="text-[#ff0000]">*</span>
							</>
						}
						options={region?.map((r: any) => ({
							label: r.name,
							value: r.code,
						}))}
						height={30}
					/>
					<Select
						label={
							<>
								City / Municipality{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						options={citiesMunicipalities?.map((cm: any) => ({
							label: cm.name,
							value: cm.code,
						}))}
						height={30}
					/>

					{/* BARANGY */}
					<Input
						label={
							<>
								Barangay{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
					/>
				</div>

				{/* HOUSE NO. / STREET */}
				<Input
					label={
						<>
							House No. / Street{" "}
							<span className="text-[#a6a3a3]">(Optional)</span>
						</>
					}
					height={30}
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
					/>
					<Input
						label={
							<>
								Email Address{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
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
					/>
					<Input
						label={
							<>
								Confirm Password{" "}
								<span className="text-[#ff0000]">*</span>
							</>
						}
						height={30}
					/>
				</div>
			</div>

			<Button
				buttonType="button"
				width="50%"
				label="Next"
				route="/register/terms_condition"
			/>
		</FormContainer>
	);
};

export default RegistrationForm;

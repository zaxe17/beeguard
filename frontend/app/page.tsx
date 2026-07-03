// "use client"
import Link from "next/link";

import Background from "@/components/Background";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";
import { CheckBox, Input } from "@/components/ui/Input";

// import { useFetch } from "@/hooks/useFetch";

const Login = () => {
	// const provinces = useFetch("https://psgc.cloud/api/provinces")

	// return <div>{message?.message}</div>;

	return (
		<div className="relative bg-white h-screen overflow-hidden">
			{/* BACKGROUND */}
			<Background />

			{/* CONTAINER */}
			<div className="relative h-full flex justify-center z-10 p-5">
				{/* LOGO */}
				<Logo />

				{/* LOGIN FORM */}
				<div className="w-1/2 flex flex-col justify-center items-center">
					<FormContainer>
						{/* FORM HEADER */}
						<h1
							className="Poppins-Bold text-[46px]">
							Welcome Back
						</h1>

						<h2
							className="Poppins-SemiBold text-3xl mb-12">
							Log In
						</h2>

						{/* LOG IN INPUT */}
						<div className="flex flex-col gap-7">
							<Input width={460} label="Username" />
							<Input width={460} label="Password" />
							<div className="flex justify-between">
								<CheckBox label="Remember me" />
								<Link
									href=""
									className="hover:underline text-[#ff9a00] font-extrabold text-lg">
									Forgot Password?
								</Link>
							</div>
						</div>

						<div className="flex flex-col gap-4 mt-10 text-center">
							{/* SUBMIT BUTTON */}
							<Button
								buttonType="button"
								label="Next"
							/>

							{/* SIGN UP ROUTE */}
							<span className="">
								Don't have an account?{" "}
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

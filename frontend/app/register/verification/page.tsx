import { Button } from "@/components/ui/Button";
import { FormContainer } from "@/components/ui/Container";

const Verification = () => {
	return (
		<FormContainer width="w-2/3">
			<div className="text-center mb-7">
				<h1 className="Poppins-Bold text-[28px] text-[#ff9a00]">
					Verify Your Account
				</h1>
				<p className="text-sm">
					We've sent a 6-digit verification code to your email. Enter
					it below to continue.
				</p>
			</div>

			<div className="mb-6">
				<input
					type="number"
					name=""
					id=""
					className="w-full text-center rounded-xl border border-[#a6a3a3] outline-0 p-2.5 [appearance:textfield]
    				[&::-webkit-outer-spin-button]:appearance-none
   					[&::-webkit-inner-spin-button]:appearance-none"
				/>
				<span className="text-[#4A2F00] text-sm cursor-pointer">Resend Code</span>
			</div>

			<Button label="Verify" />
		</FormContainer>
	);
};

export default Verification;

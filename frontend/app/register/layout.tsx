import Background from "@/components/Background";
import Logo from "@/components/Logo";
import { Modal } from "@/components/modal/Modal";

/**
 * Layout for every page under /register/*
 *   - /register                    (role selection)
 *   - /register/form               (registration form)
 *   - /register/terms_condition    (terms & submit)
 *
 * Renders the shared Background + Logo so child pages only need to render
 * their form content. Do NOT render <Background /> or <Logo /> inside child
 * pages — they inherit them from this layout.
 */
const RegisterLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="relative bg-white h-screen overflow-hidden">
			{/* BACKGROUND */}
			<Background />

			{/* MODAL FOR CONTINUE TO CREATE ACCOUNT */}
			<Modal
				title="Create Your Account?"
				content="Are you sure you want to create your account? Please
						confirm that all the information you entered is correct
						before proceeding."
				labelButton="Create Account"
			/>
			
			{/* CONTAINER */}
			<main className="relative h-full flex justify-center items-center z-10 p-5">
				{/* LEFT CONTAINER — LOGO */}
				<Logo />

				{/* RIGHT CONTAINER — ROLE / FORM / TERMS */}
				<div className="relative lg:w-1/2 w-full flex flex-col justify-center items-center">
					{children}
				</div>
			</main>
		</div>
	);
};

export default RegisterLayout;

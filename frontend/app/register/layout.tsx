import Background from "@/components/Background";
import Logo from "@/components/Logo";

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

			{/* CONTAINER */}
			<main className="relative h-full flex justify-center z-10 p-5">
				{/* LEFT CONTAINER — LOGO */}
				<Logo />

				{/* RIGHT CONTAINER — ROLE / FORM / TERMS */}
				<div className="w-1/2 flex flex-col justify-center items-center">
					{children}
				</div>
			</main>
		</div>
	);
};

export default RegisterLayout;

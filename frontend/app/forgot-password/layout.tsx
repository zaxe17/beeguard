// app/forgot-password/layout.tsx
import Background from "@/components/Background";
import Logo from "@/components/Logo";

/**
 * Layout for /forgot-password — same wrapper as /register/* (Background +
 * Logo), so the page itself only renders the form.
 */
const ForgotPasswordLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="relative bg-white h-screen overflow-hidden">
			{/* BACKGROUND */}
			<Background />

			{/* CONTAINER */}
			<main className="relative h-full flex flex-wrap justify-center items-center z-10 p-5">
				<div className="relative w-full flex lg:flex-row flex-col justify-center items-center">
					{/* LOGO */}
					<Logo />
					{children}
				</div>
			</main>
		</div>
	);
};

export default ForgotPasswordLayout;
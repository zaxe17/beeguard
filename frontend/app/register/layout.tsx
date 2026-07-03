import Background from "@/components/Background";
import Logo from "@/components/Logo";

const RegisterLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="relative bg-white h-screen overflow-hidden">
			{/* BACKGROUND */}
			<Background />

			{/* CONTAINER */}
			<main className="relative h-full flex justify-center z-10 p-5">
                {/* LEFT CONTAINER */}
				{/* LOGO */}
				<Logo />

                {/* RIGHT CONTAINER */}
				{/* ROLE FORM */}
				<div className="w-1/2 flex flex-col justify-center items-center">
					{children}
				</div>
			</main>
		</div>
	);
};

export default RegisterLayout;

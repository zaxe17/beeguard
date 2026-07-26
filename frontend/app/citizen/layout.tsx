import Sidebar from "@/components/Sidebar";
import React from "react";

const CitizenLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="h-screen flex flex-row">
			<Sidebar />

			<main className="w-full flex flex-col relative">
				<div className="absolute top-0 z-[-2] h-full w-full bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,219,79,0.3),rgba(255,255,255,0))]"></div>
				{children}
			</main>
		</div>
	);
};

export default CitizenLayout;

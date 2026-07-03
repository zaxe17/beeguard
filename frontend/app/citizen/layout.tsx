import Sidebar from "@/components/Sidebar";
import React from "react";

const CitizenLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="h-screen flex flex-row">
			<Sidebar />

			<main className="w-full flex flex-col">{children}</main>
		</div>
	);
};

export default CitizenLayout;

import React, { Suspense } from "react";
import Sidebar from "./Sidebar";

type LayoutProps = {
	content?: React.ReactNode;
	modal?: React.ReactNode;
	offlineBanner?: React.ReactNode;
};

const BeeGuardLayout = ({ content, modal, offlineBanner }: LayoutProps) => {
	return (
		<Suspense fallback={null}>
			<div className="w-full h-svh flex lg:flex-row flex-col-reverse overflow-hidden">
				<Sidebar />

				<main className="w-full flex-1 min-h-0 flex flex-col relative overflow-y-auto lg:pb-0 pb-14">
					<div className="absolute top-0 z-[-2] h-full w-full bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,219,79,0.3),rgba(255,255,255,0))]"></div>
					{offlineBanner}
					{content}
				</main>

				{modal}
			</div>
		</Suspense>
	);
};

export default BeeGuardLayout;

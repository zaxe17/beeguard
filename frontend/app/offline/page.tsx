// app/offline/page.tsx
//
// OFFLINE MODE — shown when you're offline and open a page that was never
// saved on this phone (next.config.ts -> fallbacks.document). Pages you
// opened while online still work offline with their last saved data.
"use client";

const Offline = () => {
	return (
		<div className="w-full h-svh flex flex-col items-center justify-center gap-3 p-6 text-center">
			<h1 className="Poppins-Bold text-2xl text-[#4a2f00]">You&apos;re offline</h1>
			<p className="text-sm text-[#817b70] max-w-sm">
				This page hasn&apos;t been saved on this phone yet. Open it once while
				you have internet and it will work offline next time.
			</p>
			<div className="flex gap-4 mt-2 text-sm">
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="underline cursor-pointer">
					Try again
				</button>
				<button
					type="button"
					onClick={() => window.location.assign("/beekeeper")}
					className="underline cursor-pointer">
					Go to dashboard
				</button>
			</div>
		</div>
	);
};

export default Offline;
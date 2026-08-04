import { Icon } from "@iconify/react";

const alertLevels = {
	high: {
		text: "#e63946",
		bg: "#ff0000",
	},
	medium: {
		text: "#f77f00",
		bg: "#ff9a00",
	},
	low: {
		text: "#2d9d5f",
		bg: "#00cc00",
	},
};

const NotifCard = () => {
	return (
		<div className="rounded-md p-2 text-sm flex justify-start items-start gap-3 hover:bg-[#fff1ad]/60 transition-all duration-100 ease-in cursor-pointer">
			<div
				className="w-10 h-10 rounded-full p-1.5 flex justify-center items-center"
				style={{
					color: alertLevels["high"].bg,
					background: `${alertLevels["high"].bg}4D`,
				}}>
				<Icon icon="mingcute:alert-fill" className="w-10 h-10" />
			</div>

			{/* INFORMATION */}
			<div className="w-full flex flex-col text-xs uppercase">
				{/* NOTIF TITLE */}
				<div className="flex justify-between items-center">
					<h1 className="Poppins-Bold text-[#4A2F00]">
						pesticide spraying alert
					</h1>

					<span
						className="Poppins-SemiBold w-16 text-center text-[10px] py-1 px-3 rounded-sm"
						style={{
							color: alertLevels["high"].bg,
							background: `${alertLevels["high"].bg}4D`,
						}}>
						High
					</span>
				</div>

				{/* LOCATION */}
				<span className="Poppins-SemiBold text-[#5a4e39] text-[10px]">
					Atok, Benguet
				</span>
				{/* DATE & TIME */}
				<span className="Poppins-SemiBold text-[#5a4e39] text-[10px]">
					May 16. 2026 • 8:00 PM
				</span>

				{/* DESCRIPTION */}
				<span className="Poppins-SemiBold text-[#5a4e39] text-[10px] mt-2 w-2/3">
					pesticide spraying activity detected in your area.
				</span>
			</div>
		</div>
	);
};

const Notification = () => {
	return (
		<div
			className="absolute w-90 z-10 bg-white rounded-xl right-0 my-3 p-2 flex flex-col overflow-hidden scroll-container"
			style={{
				maxHeight: "calc(100vh - 100px)",
				boxShadow:
					"rgba(50, 50, 93, 0.25) 0px 13px 27px -5px, rgba(0, 0, 0, 0.3) 0px 8px 16px -8px",
			}}>
			<h2 className="Poppins-Bold text-2xl text-[#4A2F00] mb-3 px-2">
				Notification
			</h2>

			{/* NOTIFICATION CONTENT */}
			<div className="flex flex-col gap-2 p-1.5 flex-1 min-h-0 scroll">
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
				<NotifCard />
			</div>
		</div>
	);
};

export default Notification;

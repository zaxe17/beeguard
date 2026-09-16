import ChatPage from "@/components/Page/ChatPage";
import { Suspense } from "react";

const Messages = () => {
	return (
		<Suspense
			fallback={
				<div className="w-full h-full flex items-center justify-center">
					Loading...
				</div>
			}>
			<ChatPage />
		</Suspense>
	);
};

export default Messages;

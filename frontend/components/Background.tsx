import Image from "next/image";

import honey from "../public/assets/honey.png";
import comb from "../public/assets/comb.png";

const Background = () => {
	return (
		<>
			{/* LEFT HONEYCOMB */}
			<Image
				src={comb}
				alt="Left Comb"
				width={600}
				className="absolute -left-85 -top-70 h-auto"
				priority
			/>

			{/* RIGHT HONEYCOMB */}
			<Image
				src={comb}
				alt="Right Comb"
				width={600}
				className="absolute -right-85 -bottom-70 h-auto"
				priority
			/>

			{/* HONEY DIPPER */}
			<Image
				src={honey}
				alt="Honey"
				width={650}
				className="absolute -right-55 -top-25 h-auto"
				priority
			/>
		</>
	);
};

export default Background;

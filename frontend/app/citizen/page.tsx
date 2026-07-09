import Image, { StaticImageData } from "next/image";
import { Button } from "@/components/ui/Button";
import { BeefarmContainer, Container } from "@/components/ui/Container";
import { UserNav } from "@/components/ui/UserNav";

import bee_report from "@/public/assets/bee_report.png";

// NEARBY FARM EXAMPLE DATA
import nearbyFarms from "@/data/nearbyFarms.json";

const Home = () => {
	return (
		<div className="w-full h-full p-5 flex items-start flex-col gap-3">
			{/* USER NAVIGAATION BAAR */}
			<UserNav />

			{/* CONTAINER */}
			<Container width="100%" scroll>
				<div className="w-full p-5 rounded-xl bg-linear-to-br from-[#ffdb4f] to-[#f8f4e1] flex flex-col gap-4">
					<div className="text-center">
						<h3 className="Poppins-SemiBold text-[26px]">
							Spotted a Swarm?
						</h3>
						<span className="text-[#545454] text-sm">
							Help protect bees in your area
						</span>
					</div>

					<div className="w-full flex justify-center items-center">
						<Image
							src={bee_report}
							alt="bee_report"
							className="w-48 h-w-48"
						/>
					</div>

					<div className="flex justify-center">
						<Button
							label="Report Now!"
							buttonType="button"
							width="35%"
						/>
					</div>
				</div>

				<div className="w-full flex flex-col items-start">
					<span className="text-lg text-[#817b70] font-bold">
						Nearby Bee Farms
					</span>

					<div className="w-full grid grid-cols-3 gap-3">
						{nearbyFarms.map((nb, i) => (
							<BeefarmContainer
								key={i}
								image={nb.image}
								farmName={nb.farmName}
								location={nb.location}
								miles={nb.miles}
							/>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
};

export default Home;

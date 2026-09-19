"use client";

import Image, { StaticImageData } from "next/image";
import { Button } from "@/components/ui/Button";
import { BeefarmContainer, Container } from "@/components/ui/Container";
import { UserNav } from "@/components/UserNav";

import bee_report from "@/public/assets/bee_report.png";

// NEARBY FARM EXAMPLE DATA
import nearbyFarms from "@/data/beefarms.json";
import { useRouter } from "next/navigation";

const Home = () => {
	const router = useRouter();

	return (
		<div className="w-full h-full lg:p-5 p-0 flex items-start flex-col gap-3">
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
						<div className="lg:h-48 h-30 flex justify-center items-center">
							<Image
								src={bee_report}
								alt="bee_report"
								className="w-full h-full"
							/>
						</div>
					</div>

					<div className="flex justify-center">
						<Button
							label="Report Now!"
							buttonType="button"
							width="40%"
						/>
					</div>
				</div>

				<div className="w-full flex flex-col items-start">
					<span className="sticky top-0 w-full text-lg text-[#817b70] font-bold capitalize flex justify-between items-center px-2">
						Nearby Bee Farms
						<span
							className={`text-base text-[#ffce1c] cursor-pointer ${nearbyFarms.length > 0 ? "block" : "hidden"}`}
							onClick={() => router.push("/citizen/beefarm")}>
							view all
						</span>
					</span>

					<div className="w-full grid lg:grid-cols-3 grid-cols-1 gap-3">
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

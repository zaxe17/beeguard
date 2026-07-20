import { BeefarmContainer, Container } from "@/components/ui/Container";
import Map from "@/components/ui/google-maps/Map";
import { SearchBar } from "@/components/ui/Input";

// NEARBY FARM EXAMPLE DATA
import nearbyFarms from "@/data/beefarms.json";

const Location = () => {
	return (
		<div className="w-full h-full flex items-start">
			{/* CONTAINER FOR BEEFARM LOCATION TAB */}
			<Container width="30%" height="100%" borderNone>
				<div className="w-full pt-5 px-2 flex flex-col items-center gap-4">
					<h3 className="Poppins-SemiBold text-xl text-[#020101]">
						Bee Farms
					</h3>

					<SearchBar placeholder="Search location" />
				</div>

				{/* SCROLLABLE BEEFARM CARD */}
				<div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden min-h-0">
					{nearbyFarms.map((nb, i) => (
						<div key={i}>
							<BeefarmContainer
								image={nb.image}
								farmName={nb.farmName}
								location={nb.location}
								miles={nb.miles}
							/>
						</div>
					))}
				</div>
			</Container>

			<div className="flex-1 h-full">
				<div className="flex flex-col h-full">
					{/* LOCATION MAP */}
					<Map />

					{/* BEEFARM INFO */}
				</div>
			</div>
		</div>
	);
};

export default Location;

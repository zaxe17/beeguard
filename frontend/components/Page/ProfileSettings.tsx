"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Container, FormContainer } from "../ui/Container";
import { ProfileDisplay } from "../Users";
import { PrivacyPolicyPage, TermsConditionPage } from "./TermsCondition";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { SettingsTabs, SwitchTab } from "../Tab";
import { Icon } from "@iconify/react";
import MobileOverlay from "../MobileOverlay";
import { Suspense } from "react";

type ViewKey = "main" | "settings" | "about";
type DetailKey = "personal" | "password" | "privacy" | "terms" | null;

const DETAIL_TITLES: Record<Exclude<DetailKey, null>, string> = {
	personal: "Personal Information",
	password: "Change Password",
	privacy: "Privacy Policy",
	terms: "Terms & Conditions",
};

const MainProfileSettings = ({
	onSelect,
}: {
	onSelect: (view: ViewKey) => void;
}) => {
	return (
		<Container
			height="100%"
			borderNone
			className="lg:w-[35%] w-full h-full shrink-0">
			<ProfileDisplay
				name="Jan Marc S. Jacolbia"
				email="janmarcsjacolbia17@gmail.com"
			/>
			<div className="w-full flex justify-center mt-5">
				<div className="lg:w-2/3 w-full flex flex-col gap-3">
					<SettingsTabs
						label="Settings"
						icon="mdi:cog"
						onClick={() => onSelect("settings")}
					/>
					<SettingsTabs
						label="About BeeGuard"
						icon="fa7-solid:circle-info"
						onClick={() => onSelect("about")}
					/>
				</div>
			</div>
		</Container>
	);
};

const Settings = ({
	onSelectDetail,
}: {
	onSelectDetail: (detail: DetailKey) => void;
}) => {
	return (
		<Container
			height="100%"
			borderNone
			className="lg:w-[35%] w-full h-full shrink-0">
			<span className="Poppins-Bold text-center text-[#4a2f00] text-3xl mt-5 mb-10">
				Settings
			</span>

			<div className="w-full flex flex-col items-center justify-center gap-5">
				{/* ACCOUNT */}
				<div className="lg:w-2/3 w-full flex flex-col">
					<span className="text-[#817b70]">Account</span>
					{/* TABS */}
					<div className="w-full flex flex-col items gap-3">
						<SettingsTabs
							label="Personal Information"
							icon="bi:person-circle"
							onClick={() => onSelectDetail("personal")}
						/>
						<SettingsTabs
							label="Change Password"
							icon="carbon:password"
							onClick={() => onSelectDetail("password")}
						/>
					</div>
				</div>

				{/* NOTIFICATION */}
				<div className="lg:w-2/3 w-full flex flex-col">
					<span className="text-[#817b70]">Notification</span>
					{/* TABS */}
					<div className="w-full flex flex-col items gap-3">
						<SwitchTab
							label="Push Notifications"
							icon="ic:baseline-notifications"
						/>
					</div>
				</div>
			</div>
		</Container>
	);
};

const About = ({
	onSelectDetail,
}: {
	onSelectDetail: (detail: DetailKey) => void;
}) => {
	return (
		<Container
			height="100%"
			borderNone
			className="lg:w-[35%] w-full h-full shrink-0">
			<span className="Poppins-Bold text-center text-[#4a2f00] text-3xl mt-5 mb-10">
				About BeeGuard
			</span>

			<div className="w-full h-full flex flex-col items-center justify-center gap-8">
				<div className="flex flex-col justify-center items-center lg:border-none border-b border-b-[#b6771d] lg:pb-0 pb-5">
					<h1 className="Poppins-Bold text-[#4a2f00] text-5xl mb-4 leading-3 uppercase">
						beeguard
					</h1>
					<p className="text-center text-sm text-[#545454]">
						Empowering communities to protect bees and promote a
						sustainable environment.
					</p>
				</div>

				<div className="lg:w-2/3 w-full flex flex-col gap-3">
					<SettingsTabs
						label="Privacy Policy"
						icon="fa7-solid:user-shield"
						onClick={() => onSelectDetail("privacy")}
					/>
					<SettingsTabs
						label="Terms & Conditions"
						icon="fa7-solid:file-contract"
						onClick={() => onSelectDetail("terms")}
					/>
				</div>

				<p className="text-[#545454] mt-auto">
					© 2026 BeeGuard. All rights reserved.
				</p>
			</div>
		</Container>
	);
};

const PersonalInfo = () => {
	return (
		<FormContainer width="lg:w-2/3 w-full">
			<h1 className="Poppins-Bold text-[#4a2f00] text-center text-3xl">
				Personal Information
			</h1>

			<div className="flex flex-col gap-3 my-10">
				<Input label="Full Name" value="Jan Marc Jacolbia" />
				<Input label="Username" value="zaxe" />
				<Input label="Email" value="janmarcsjacolbia17@gmail.com" />
				<Input label="Phone Number" value="+63 912 345 6789" />
				<Input label="Location" value="Manila, Philippines" />
			</div>

			<Button label="Save Changes" />
		</FormContainer>
	);
};

const ChangePassword = () => {
	return (
		<FormContainer width="lg:w-2/3 w-full">
			<h1 className="Poppins-Bold text-[#4a2f00] text-center text-3xl">
				Change Password
			</h1>
			<p className="text-sm text-center">
				For security please, choose a strong <br /> password that you
				don’t use elsewhere.
			</p>

			<div className="flex flex-col gap-3 my-10">
				<Input label="Current Password" />
				<Input label="New Password" />
				<Input label="Confirm  New Password" />
			</div>

			<Button label="Update Password" />
		</FormContainer>
	);
};

const ProfileSettingsContent = () => {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const view = (searchParams.get("view") as ViewKey) || "main";
	const detail = (searchParams.get("detail") as DetailKey) || null;

	const setView = (v: ViewKey) => {
		router.push(`${pathname}?view=${v}`);
	};

	const setDetail = (d: DetailKey) => {
		if (d === null) {
			router.push(`${pathname}?view=${view}`);
		} else {
			router.push(`${pathname}?view=${view}&detail=${d}`);
		}
	};

	const renderLeft = () => {
		switch (view) {
			case "settings":
				return <Settings onSelectDetail={setDetail} />;
			case "about":
				return <About onSelectDetail={setDetail} />;
			case "main":
			default:
				return <MainProfileSettings onSelect={setView} />;
		}
	};

	const renderDetailContent = () => {
		switch (detail) {
			case "personal":
				return <PersonalInfo />;
			case "password":
				return <ChangePassword />;
			case "privacy":
				return <PrivacyPolicyPage />;
			case "terms":
				return <TermsConditionPage />;
			default:
				return null;
		}
	};

	return (
		<div className="w-full h-full flex items-start relative">
			{renderLeft()}

			{/* RIGHT SIDE — desktop: always visible inline */}
			<div className="hidden lg:block flex-1 h-full w-full min-h-0 overflow-y-auto">
				<div className="flex flex-col items-center justify-center py-8 px-25 w-full h-full">
					{renderDetailContent()}
				</div>
			</div>

			{/* RIGHT SIDE — mobile: slide-up overlay, only after a tab is selected */}
			{detail && (
				<MobileOverlay>
					{/* BACK BUTTON */}
					<div className="sticky top-0 z-10 bg-white w-full flex items-center gap-2 p-4 border-b border-[#e2e2e6]">
						<button
							onClick={() => setDetail(null)}
							className="flex items-center shrink-0">
							<Icon
								icon="bx:arrow-back"
								className="text-2xl text-[#ffa004]"
							/>
						</button>
						<span className="w-full Poppins-SemiBold text-sm text-[#4a2f00] text-center">
							{DETAIL_TITLES[detail]}
						</span>
					</div>

					<div className="flex flex-col items-center py-6 px-4 w-full max-w-full overflow-x-hidden">
						{renderDetailContent()}
					</div>
				</MobileOverlay>
			)}
		</div>
	);
};

const ProfileSettingsPage = () => {
	return (
		<Suspense
			fallback={
				<div className="w-full h-full flex items-center justify-center">
					Loading...
				</div>
			}>
			<ProfileSettingsContent />
		</Suspense>
	);
};

export default ProfileSettingsPage;

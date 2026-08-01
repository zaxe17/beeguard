import { usePathname } from "next/navigation";

export const useIsPage = (paths: string | string[]) => {
	const pathname = usePathname();
	const list = Array.isArray(paths) ? paths : [paths];
	return list.includes(pathname ?? "");
};
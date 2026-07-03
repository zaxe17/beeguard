"use client";

import { useEffect, useState } from "react";

export const useFetch = (url: string) => {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);

		fetch(url)
			.then((res) => res.json())
			.then((result) => {
				setData(result);
				setLoading(false);
			})
			.catch((err) => {
				setError(err.message);
				setLoading(false);
			});
	}, [url]);

	return { data, loading, error };
};

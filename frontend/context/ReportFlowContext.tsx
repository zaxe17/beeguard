"use client";

import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

// Shared between app/citizen/layout.tsx (renders the BeeIdentify modal)
// and app/citizen/report/layout.tsx + page.tsx (owns the Next button
// and the actual step content) — two different places in the tree,
// so this needs to live above both of them.

export type ReportStep = 1 | 2 | 3;

type NextHandler = () => void | Promise<void>;

export type ReportLocation = { lat: number; lng: number };
// "auto": captured via camera — geolocation grabbed automatically.
// "manual": came from an uploaded photo — user has to set it themselves.
export type LocationSource = "auto" | "manual" | null;

// NEW — result of step 1's scan (POST /api/cv-scans). cvscan_id is what
// the final POST /api/reports needs; the photo itself is already
// stored on the backend by the scan.
export type ReportScan = {
	cvscan_id: string;
	image_url: string;
	identified_species: string | null;
	confidence_score: number | null;
};

// NEW — step 2's form values, kept here so step 3 can show them and
// submit them. Field names match validators/report_validator.py.
export type ReportDetailsForm = {
	locationText: string; // what the user typed / the looked-up place name
	bee_danger: "Yes" | "No" | null;
	sighted_date: string; // "YYYY-MM-DD" or ""
	sighted_time: string; // "HH:MM" or ""
	description: string; // max 50 chars (reports.description VARCHAR(50))
};

const EMPTY_DETAILS: ReportDetailsForm = {
	locationText: "",
	bee_danger: null,
	sighted_date: "",
	sighted_time: "",
	description: "",
};

type ReportFlowContextValue = {
	step: ReportStep;
	advanceStep: () => void;
	goBack: () => void;
	resetFlow: () => void;
	registerNext: (fn: NextHandler | null) => void;
	triggerNext: () => Promise<void>;
	canProceed: boolean;
	setCanProceed: (v: boolean) => void;
	scanning: boolean;
	setScanning: (v: boolean) => void;
	location: ReportLocation | null;
	setLocation: (loc: ReportLocation | null) => void;
	locationSource: LocationSource;
	setLocationSource: (source: LocationSource) => void;
	// NEW
	scan: ReportScan | null;
	setScan: (scan: ReportScan | null) => void;
	photoPreview: string | null; // data URL of the photo, for steps 2 & 3
	setPhotoPreview: (url: string | null) => void;
	details: ReportDetailsForm;
	updateDetails: (patch: Partial<ReportDetailsForm>) => void;
	submitting: boolean;
	setSubmitting: (v: boolean) => void;
	// NEW — set after a successful submit: the Report page then shows
	// "Report Submitted!" in place of the steps (no page change), until
	// resetFlow() starts the next report.
	submission: { reportId: string | null } | null;
	setSubmission: (s: { reportId: string | null } | null) => void;
};

const ReportFlowContext = createContext<ReportFlowContextValue | null>(null);

export const ReportFlowProvider = ({ children }: { children: ReactNode }) => {
	const [step, setStep] = useState<ReportStep>(1);
	const [handler, setHandler] = useState<{ fn: NextHandler } | null>(null);
	const [canProceed, setCanProceed] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [location, setLocation] = useState<ReportLocation | null>(null);
	const [locationSource, setLocationSource] = useState<LocationSource>(null);
	const [scan, setScan] = useState<ReportScan | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [details, setDetails] = useState<ReportDetailsForm>(EMPTY_DETAILS);
	const [submitting, setSubmitting] = useState(false);
	const [submission, setSubmission] = useState<{ reportId: string | null } | null>(null);

	const registerNext = useCallback((fn: NextHandler | null) => {
		setHandler(fn ? { fn } : null);
	}, []);

	const advanceStep = useCallback(() => {
		setStep((s) => (s < 3 ? ((s + 1) as ReportStep) : s));
		setCanProceed(false);
		setHandler(null);
	}, []);

	const goBack = useCallback(() => {
		setStep((s) => (s > 1 ? ((s - 1) as ReportStep) : s));
		setHandler(null);
	}, []);

	const updateDetails = useCallback((patch: Partial<ReportDetailsForm>) => {
		setDetails((prev) => ({ ...prev, ...patch }));
	}, []);

	const resetFlow = useCallback(() => {
		setStep(1);
		setCanProceed(false);
		setHandler(null);
		setLocation(null);
		setLocationSource(null);
		setScan(null);
		setPhotoPreview(null);
		setDetails(EMPTY_DETAILS);
		setSubmitting(false);
		setSubmission(null);
	}, []);

	const triggerNext = useCallback(async () => {
		if (handler) await handler.fn();
	}, [handler]);

	return (
		<ReportFlowContext.Provider
			value={{
				step,
				advanceStep,
				goBack,
				resetFlow,
				registerNext,
				triggerNext,
				canProceed,
				setCanProceed,
				scanning,
				setScanning,
				location,
				setLocation,
				locationSource,
				setLocationSource,
				scan,
				setScan,
				photoPreview,
				setPhotoPreview,
				details,
				updateDetails,
				submitting,
				setSubmitting,
				submission,
				setSubmission,
			}}>
			{children}
		</ReportFlowContext.Provider>
	);
};

// eslint-disable-next-line react-refresh/only-export-components
export const useReportFlow = () => {
	const ctx = useContext(ReportFlowContext);
	if (!ctx) {
		throw new Error("useReportFlow must be used within ReportFlowProvider");
	}
	return ctx;
};
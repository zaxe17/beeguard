import { api, ApiEnvelope } from "./api";

export type PesticideType = "Insecticide" | "Herbicide" | "Fungicide";
export type RiskLevel = "Low" | "Medium" | "High";
export type AlertSource = "admin" | "beekeeper";

export interface CreateAlertPayload {
    title: string;
    pesticide_type?: PesticideType | null;
    latitude: number;
    longitude: number;
    scheduled_date: string; // ISO datetime, e.g. "2026-08-01T08:00:00"
    expiration_date?: string | null;
    risk_level?: RiskLevel;
    danger_radius_km?: number | null;
    affected_area?: string | null;
}

export interface AlertRecipient {
    recipient_id: string;
    beekeeper_id: string;
    distance_km: number;
}

export interface CreateAlertResult {
    alert_id: string;
    danger_radius_km: number;
    matched_count: number;
    recipients: AlertRecipient[];
}

export interface AlertRecord {
    alert_id: string;
    adminID: string;
    beekeeperID: string | null;
    title: string;
    pesticide_type: PesticideType | null;
    affected_area: string | null;
    latitude: number;
    longitude: number;
    scheduled_date: string;
    expiration_date: string | null;
    danger_radius_km: number;
    risk_level: RiskLevel;
    // present only on /alerts/mine (joined from alert_recipients)
    distance_km?: number;
    notified_at?: string;
}

// GET /pesticide/alerts/<alert_id> — full detail for the Alert Details
// page. Shape matches schemas/alert_schema.py::AlertDetailOut on the
// backend (risk_level is already lowercased there to match the
// "high" | "medium" | "low" status prop the UI components expect).
export interface AlertDetail {
    alert_id: string;
    title: string;
    source: AlertSource;
    status: "high" | "medium" | "low";
    location: string;
    latitude: number;
    longitude: number;
    pesticide_type: PesticideType | null;
    application_method: string | null;
    description: string | null;
    danger_radius_km: number;
    scheduled_date: string; // ISO
    expiration_date: string | null; // ISO
    created_at: string; // ISO
    issued_by: string | null;
    contact: string | null;
}

export type ApiEnvelopeWithFields<T> = ApiEnvelope<T> & {
    field_errors?: Record<string, string>;
};

export const pesticideService = {
    createAlert: (payload: CreateAlertPayload) =>
        api.post<CreateAlertResult>(
            "/pesticide/alerts",
            payload,
        ) as Promise<ApiEnvelopeWithFields<CreateAlertResult>>,

    // Admin — alerts this admin created
    listAdminAlerts: () => api.get<AlertRecord[]>("/pesticide/alerts"),

    // Any authenticated role — all currently active (non-expired) alerts
    listActiveAlerts: () => api.get<AlertRecord[]>("/pesticide/alerts/active"),

    // Beekeeper — alerts they were actually matched/notified for
    listMyAlerts: () => api.get<AlertRecord[]>("/pesticide/alerts/mine"),

    // Any authenticated role with access (admin, or the reporting/
    // matched beekeeper) — full detail for one alert, used by the
    // Alert Details page (?id=<alert_id>)
    getAlertDetail: (alertId: string) =>
        api.get<AlertDetail>(`/pesticide/alerts/${alertId}`),

    // Admin — who was matched for a given alert
    listAlertRecipients: (alertId: string) =>
        api.get<AlertRecipient[]>(`/pesticide/alerts/${alertId}/recipients`),
};
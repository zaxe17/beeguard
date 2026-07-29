"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ModalContextType<T extends string = string, P = unknown> = {
	activeModal: T | null;
	payload: P | null;
	openModal: (modalName: T, payload?: P) => void;
	closeModal: () => void;
	isModalOpen: (modalName: T) => boolean;
};

const ModalContext = createContext<ModalContextType<any, any> | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
	const [activeModal, setActiveModal] = useState<string | null>(null);
	const [payload, setPayload] = useState<unknown>(null);

	const openModal = useCallback((modalName: string, modalPayload?: unknown) => {
		setActiveModal(modalName);
		setPayload(modalPayload ?? null);
	}, []);

	const closeModal = useCallback(() => {
		setActiveModal(null);
		setPayload(null);
	}, []);

	const isModalOpen = useCallback(
		(modalName: string) => activeModal === modalName,
		[activeModal]
	);

	return (
		<ModalContext.Provider value={{ activeModal, payload, openModal, closeModal, isModalOpen }}>
			{children}
		</ModalContext.Provider>
	);
}

export const useModal = <T extends string = string, P = unknown>() => {
	const context = useContext(ModalContext);
	if (!context) {
		throw new Error("useModal must be used within a ModalProvider");
	}
	return context as ModalContextType<T, P>;
}
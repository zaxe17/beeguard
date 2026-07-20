"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ModalContextType<T extends string = string> = {
	activeModal: T | null;
	openModal: (modalName: T) => void;
	closeModal: () => void;
	isModalOpen: (modalName: T) => boolean;
};

const ModalContext = createContext<ModalContextType<any> | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
	const [activeModal, setActiveModal] = useState<string | null>(null);

	const openModal = useCallback((modalName: string) => {
		setActiveModal(modalName);
	}, []);

	const closeModal = useCallback(() => {
		setActiveModal(null);
	}, []);

	const isModalOpen = useCallback(
		(modalName: string) => activeModal === modalName,
		[activeModal]
	);

	return (
		<ModalContext.Provider value={{ activeModal, openModal, closeModal, isModalOpen }}>
			{children}
		</ModalContext.Provider>
	);
}

export const useModal = <T extends string = string>() => {
	const context = useContext(ModalContext);
	if (!context) {
		throw new Error("useModal must be used within a ModalProvider");
	}
	return context as ModalContextType<T>;
}
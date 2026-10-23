import React, { useState, useCallback } from 'react';
import { Modal } from '../components/Modal';

type ModalType = 'default' | 'danger' | 'success';

interface ModalState {
    isOpen: boolean;
    title: string;
    content: React.ReactNode;
    type?: ModalType;
    onConfirm?: () => void;
    confirmText?: string;
}

export type OpenModal = (
    title: string,
    content: React.ReactNode,
    type?: ModalType,
    onConfirm?: () => void,
    confirmText?: string
) => void;

export const useModal = () => {
    const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', content: null });

    const openModal: OpenModal = useCallback((title, content, type = 'default', onConfirm, confirmText = 'Confirmar') => {
        setModal({ isOpen: true, title, content, type, onConfirm, confirmText });
    }, []);

    const closeModal = useCallback(() => setModal(prev => ({ ...prev, isOpen: false })), []);

    const modalElement = (
        <Modal
            isOpen={modal.isOpen}
            onClose={closeModal}
            title={modal.title}
            type={modal.type}
            footer={
                modal.onConfirm ? (
                    <>
                        <button className="secondary-btn" onClick={closeModal}>Cancelar</button>
                        <button className="primary-btn" onClick={modal.onConfirm}>{modal.confirmText}</button>
                    </>
                ) : (
                    <button className="primary-btn" onClick={closeModal}>OK</button>
                )
            }
        >
            {modal.content}
        </Modal>
    );

    return { openModal, closeModal, modalElement };
};

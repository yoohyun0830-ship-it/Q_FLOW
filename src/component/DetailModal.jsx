import { useEffect, useId, useRef } from "react";
import "../css/detailModal.css";

export default function DetailModal({
    title,
    onClose,
    children
}) {
    const dialogRef = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        const previousOverflow = document.body.style.overflow;

        // 팝업을 열고 배경 화면 스크롤 방지
        dialog.showModal();
        document.body.style.overflow = "hidden";

        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className="qf-detail-modal"
            aria-labelledby={titleId}
            onCancel={event => {
                // ESC로 닫을 때 React의 선택 상태도 초기화
                event.preventDefault();
                onClose();
            }}
        >
            <header className="qf-detail-modal-header">
                <h2 id={titleId}>{title}</h2>

                <button
                    type="button"
                    className="qf-detail-modal-close"
                    aria-label="상세정보 닫기"
                    onClick={onClose}
                    autoFocus
                >
                    ×
                </button>
            </header>

            <div className="qf-detail-modal-body">
                {children}
            </div>

            <footer className="qf-detail-modal-footer">
                <button type="button" onClick={onClose}>
                    닫기
                </button>
            </footer>
        </dialog>
    );
}
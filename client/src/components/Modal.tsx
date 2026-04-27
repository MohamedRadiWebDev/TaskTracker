import { useEffect } from "react";

type ModalProps = {
  open: boolean;
};

export default function Modal({ open }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/80 p-6"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl">
        <p className="text-2xl font-bold text-gray-900">يرجى التواصل معنا</p>
      </div>
    </div>
  );
}

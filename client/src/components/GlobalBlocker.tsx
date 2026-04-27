import { ReactNode, useState } from "react";
import Modal from "./Modal";

type GlobalBlockerProps = {
  children: ReactNode;
};

const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "[role='button']",
  "input[type='button']",
  "input[type='submit']",
  "input[type='reset']",
  "[tabindex]:not([tabindex='-1'])",
  "[onclick]",
  "label[for]",
  "summary",
  "details",
].join(", ");

export default function GlobalBlocker({ children }: GlobalBlockerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const clickableElement = target.closest(INTERACTIVE_SELECTOR);
    if (!clickableElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const nativeEvent = event.nativeEvent as MouseEvent & {
      stopImmediatePropagation?: () => void;
    };
    nativeEvent.stopImmediatePropagation?.();

    setIsModalVisible(true);
  };

  return (
    <div onClickCapture={handleClickCapture} className="min-h-screen">
      {children}
      <Modal open={isModalVisible} />
    </div>
  );
}

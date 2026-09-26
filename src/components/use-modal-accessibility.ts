import { useLayoutEffect, useRef } from "react";

interface ModalEntry {
  element: HTMLDivElement;
  opener: HTMLElement | null;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const modalStack: ModalEntry[] = [];
const previousInertAttributes = new Map<Element, string | null>();

const restoreBackgroundInert = () => {
  for (const [element, previousValue] of previousInertAttributes) {
    if (previousValue === null) {
      element.removeAttribute("inert");
    } else {
      element.setAttribute("inert", previousValue);
    }
  }

  previousInertAttributes.clear();
};

const inertBackground = (dialog: HTMLElement) => {
  restoreBackgroundInert();

  let branch: Element = dialog;
  let ancestor = branch.parentElement;

  while (ancestor) {
    for (const sibling of ancestor.children) {
      if (sibling === branch) {
        continue;
      }

      if (!previousInertAttributes.has(sibling)) {
        previousInertAttributes.set(sibling, sibling.getAttribute("inert"));
      }
      sibling.setAttribute("inert", "");
    }

    if (ancestor === document.body) {
      break;
    }

    branch = ancestor;
    ancestor = ancestor.parentElement;
  }
};

const registerModal = (entry: ModalEntry) => {
  modalStack.push(entry);
  const topModal = modalStack.at(-1);
  if (topModal) {
    inertBackground(topModal.element);
  }
};

const unregisterModal = (entry: ModalEntry) => {
  const wasTopModal = modalStack.at(-1) === entry;
  const modalIndex = modalStack.indexOf(entry);
  if (modalIndex !== -1) {
    modalStack.splice(modalIndex, 1);
  }

  restoreBackgroundInert();
  const topModal = modalStack.at(-1);
  if (topModal) {
    inertBackground(topModal.element);
  }

  if (
    wasTopModal &&
    entry.opener?.isConnected &&
    !entry.opener.closest("[inert]")
  ) {
    entry.opener.focus({ preventScroll: true });
  }
};

const getFocusableElements = (dialog: HTMLElement) => {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => {
    if (
      element.matches(":disabled") ||
      element.closest("[hidden], [inert], [aria-hidden='true']")
    ) {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
};

export const useModalAccessibility = (onEscape?: () => void) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onEscapeRef = useRef(onEscape);

  useLayoutEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const entry: ModalEntry = {
      element: dialog,
      opener:
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
    };
    registerModal(entry);
    dialog.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== entry || event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        if (onEscapeRef.current) {
          event.preventDefault();
          event.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement ||
          activeElement === dialog ||
          !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        lastElement?.focus({ preventScroll: true });
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement || !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        firstElement?.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      unregisterModal(entry);
    };
  }, []);

  return dialogRef;
};

import { closePlayMenu, isPlayMenuOpen } from "../../ui/hud";

export function bindPlayPointer(onTap: () => void, onUnlock: () => void): () => void {
  const onDown = (event: PointerEvent): void => {
    onUnlock();
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isControlTarget(event.target)) return;
    if (isPlayMenuOpen()) {
      closePlayMenu();
      return;
    }
    onTap();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.code !== "Space" && event.key !== " ") return;
    if (event.repeat) return;
    onUnlock();
    if (isControlTarget(event.target)) return;
    event.preventDefault();
    if (isPlayMenuOpen()) {
      closePlayMenu();
      return;
    }
    onTap();
  };
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("keydown", onKey);
  };
}

function isControlTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("button, input, label, a"));
}

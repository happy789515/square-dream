import "./ui/styles/neon.css";
import { registerSW } from "virtual:pwa-register";
import { GameApp } from "./app/GameApp";

registerSW({ immediate: true });

void (async () => {
  const game = new GameApp();
  await game.start();
})();

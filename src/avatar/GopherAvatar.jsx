import { useEffect, useRef } from "react";
import { GRID_W, GRID_H, drawAvatar } from "./sprites.js";

// Renderiza o gopher em canvas com camadas (skin → casaco → óculos → gorro).
// `scale` = tamanho de cada pixel lógico; o canvas fica GRID_W*scale × GRID_H*scale.
export default function GopherAvatar({ skin, hat, glasses, outfit, scale = 4, style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    drawAvatar(ctx, { skin, hat, glasses, outfit }, scale);
  }, [skin, hat, glasses, outfit, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={GRID_W * scale}
      height={GRID_H * scale}
      style={{ imageRendering: "pixelated", display: "block", ...style }}
    />
  );
}

/**
 * Overlay system script to be injected into the browser during recording.
 * Renders arrows, spotlights, and highlight boxes on a Canvas overlay.
 */

import type { HighlightStyle } from "@appdemo/types";

// ============================================
// TypeScript class for type checking (not injected)
// ============================================

export class DemoOverlay {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationFrame: number | null = null;

  constructor() {
    // Implementation is in OVERLAY_SCRIPT for browser injection
  }

  async drawArrow(
    selector: string,
    options?: { color?: string; duration?: number; pulse?: boolean }
  ): Promise<void> {}

  async spotlight(
    selector: string,
    options?: { duration?: number; dimOpacity?: number; padding?: number }
  ): Promise<void> {}

  async highlightBox(
    selector: string,
    options?: { color?: string; duration?: number; label?: string }
  ): Promise<void> {}

  clear(): void {}
  destroy(): void {}
}

// ============================================
// Browser-injectable script (string)
// ============================================

export const OVERLAY_SCRIPT = `
(function() {
  class DemoOverlay {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.id = "appdemo-overlay";
      this.canvas.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 999999;
      \`;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      document.body.appendChild(this.canvas);

      this.ctx = this.canvas.getContext("2d");
      this.animationFrame = null;

      window.addEventListener("resize", () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      });
    }

    async drawArrow(selector, options = {}) {
      const { color = "#FF4444", duration = 2000, pulse = true } = options;

      const element = document.querySelector(selector);
      if (!element) {
        console.warn('[DemoOverlay] Element not found:', selector);
        return;
      }

      const rect = element.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top - 20;
      const startX = targetX - 80;
      const startY = targetY - 60;

      const startTime = Date.now();

      return new Promise((resolve) => {
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

          const scale = pulse ? 1 + Math.sin(elapsed / 200) * 0.1 : 1;

          this.ctx.save();
          this.ctx.translate(startX, startY);
          this.ctx.scale(scale, scale);

          // Arrow body
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(60, 40);
          this.ctx.strokeStyle = color;
          this.ctx.lineWidth = 4;
          this.ctx.lineCap = "round";
          this.ctx.stroke();

          // Arrow head
          this.ctx.beginPath();
          this.ctx.moveTo(60, 40);
          this.ctx.lineTo(45, 35);
          this.ctx.lineTo(50, 50);
          this.ctx.closePath();
          this.ctx.fillStyle = color;
          this.ctx.fill();

          this.ctx.restore();

          if (progress < 1) {
            this.animationFrame = requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        animate();
      });
    }

    async spotlight(selector, options = {}) {
      const { duration = 2000, dimOpacity = 0.6, padding = 10 } = options;

      const element = document.querySelector(selector);
      if (!element) {
        console.warn('[DemoOverlay] Element not found:', selector);
        return;
      }

      const rect = element.getBoundingClientRect();
      const startTime = Date.now();

      return new Promise((resolve) => {
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

          const opacity = dimOpacity * Math.min(progress * 2, 1);

          // Draw semi-transparent overlay
          this.ctx.fillStyle = \`rgba(0, 0, 0, \${opacity})\`;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

          // Cut out the spotlight area
          this.ctx.globalCompositeOperation = "destination-out";

          // Rounded rectangle spotlight
          const x = rect.left - padding;
          const y = rect.top - padding;
          const w = rect.width + padding * 2;
          const h = rect.height + padding * 2;
          const radius = 8;

          this.ctx.beginPath();
          this.ctx.moveTo(x + radius, y);
          this.ctx.lineTo(x + w - radius, y);
          this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
          this.ctx.lineTo(x + w, y + h - radius);
          this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
          this.ctx.lineTo(x + radius, y + h);
          this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
          this.ctx.lineTo(x, y + radius);
          this.ctx.quadraticCurveTo(x, y, x + radius, y);
          this.ctx.closePath();
          this.ctx.fill();

          this.ctx.globalCompositeOperation = "source-over";

          if (progress < 1) {
            this.animationFrame = requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        animate();
      });
    }

    async highlightBox(selector, options = {}) {
      const { color = "#00FF88", duration = 2000, label } = options;

      const element = document.querySelector(selector);
      if (!element) {
        console.warn('[DemoOverlay] Element not found:', selector);
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 5;
      const startTime = Date.now();

      return new Promise((resolve) => {
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

          // Animated border appearance
          const lineProgress = Math.min(progress * 2, 1);

          this.ctx.strokeStyle = color;
          this.ctx.lineWidth = 3;
          this.ctx.setLineDash([]);

          const x = rect.left - padding;
          const y = rect.top - padding;
          const w = rect.width + padding * 2;
          const h = rect.height + padding * 2;

          // Glow effect
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 10;

          this.ctx.strokeRect(x, y, w * lineProgress, h * lineProgress);

          this.ctx.shadowBlur = 0;

          // Draw label
          if (label && progress > 0.3) {
            const labelOpacity = Math.min((progress - 0.3) / 0.3, 1);
            this.ctx.font = "bold 14px Arial, sans-serif";
            this.ctx.fillStyle = color.replace(')', \`, \${labelOpacity})\`).replace('rgb', 'rgba');

            // Label background
            const textMetrics = this.ctx.measureText(label);
            const labelPadding = 4;
            this.ctx.fillStyle = \`rgba(0, 0, 0, \${labelOpacity * 0.8})\`;
            this.ctx.fillRect(
              x - labelPadding,
              y - 22 - labelPadding,
              textMetrics.width + labelPadding * 2,
              16 + labelPadding * 2
            );

            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = labelOpacity;
            this.ctx.fillText(label, x, y - 10);
            this.ctx.globalAlpha = 1;
          }

          if (progress < 1) {
            this.animationFrame = requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        animate();
      });
    }

    async zoom(selector, options = {}) {
      const { duration = 2000, scale = 1.5 } = options;

      const element = document.querySelector(selector);
      if (!element) {
        console.warn('[DemoOverlay] Element not found:', selector);
        return;
      }

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const startTime = Date.now();

      return new Promise((resolve) => {
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

          // Draw zoom indicator circle
          const radius = Math.max(rect.width, rect.height) / 2 + 20;
          const currentScale = 1 + (scale - 1) * Math.sin(progress * Math.PI);

          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, radius * currentScale, 0, Math.PI * 2);
          this.ctx.strokeStyle = "#4488FF";
          this.ctx.lineWidth = 3;
          this.ctx.setLineDash([5, 5]);
          this.ctx.stroke();
          this.ctx.setLineDash([]);

          if (progress < 1) {
            this.animationFrame = requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };

        animate();
      });
    }

    clear() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    destroy() {
      this.clear();
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.remove();
      }
    }
  }

  // Expose globally for injection
  window.DemoOverlay = DemoOverlay;
  console.log('[DemoOverlay] Overlay system loaded');
})();
`;

// ============================================
// Helper to execute overlay commands
// ============================================

export interface OverlayCommand {
  style: HighlightStyle;
  selector: string;
  duration?: number;
  label?: string;
  color?: string;
}

export function getOverlayMethod(style: HighlightStyle): string {
  switch (style) {
    case "arrow":
      return "drawArrow";
    case "spotlight":
      return "spotlight";
    case "box":
      return "highlightBox";
    case "zoom":
      return "zoom";
    default:
      return "";
  }
}

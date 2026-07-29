"use client";
import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1d2341",
          color: "#dae2fd",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "0.75rem",
          padding: "0.75rem 1rem",
        },
        success: {
          iconTheme: { primary: "#ccff80", secondary: "#213600" },
        },
        error: {
          iconTheme: { primary: "#f87171", secondary: "#1f1f1f" },
        },
      }}
    />
  );
}

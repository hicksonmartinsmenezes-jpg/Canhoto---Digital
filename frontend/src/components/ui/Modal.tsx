"use client";

import { useEffect } from "react";
import { motion } from "motion/react";

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Largura do painel — a maioria dos diálogos de confirmação/edição do
   * sistema usa "sm" (max-w-sm); casos maiores podem pedir "lg". */
  size?: "sm" | "lg";
}

// Casca visual (backdrop + painel) reaproveitada por todo modal do sistema
// (MotoboysManager, EntregaRowActions, etc.) — antes cada tela tinha sua
// própria cópia de `fixed inset-0 ... bg-slate-900/40` sem nenhuma
// transição, então o diálogo "estourava" na tela e sumia sem aviso.
//
// Uso: renderize dentro de <AnimatePresence> no componente pai (o próprio
// <Modal> é o elemento que entra/sai, então o pai precisa da AnimatePresence
// pra capturar a animação de saída antes de desmontar de verdade).
//
// Timing: modal é uma ação PONTUAL e de baixa frequência (não algo tipo
// hover/scroll), então uma entrada com leve "spring" é apropriada — mas
// sem bounce (é uma ação utilitária, não celebrativa) e a saída é mais
// sutil/rápida que a entrada, como recomenda a skill de Motion Principles.
export function Modal({ onClose, children, size = "sm" }: ModalProps) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className={`w-full ${size === "lg" ? "max-w-lg" : "max-w-sm"} rounded-2xl border border-slate-200 bg-white p-6 shadow-xl`}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 4 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

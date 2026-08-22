"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { useQuickTx } from "@/state/QuickTxContext";
import { QuickTxForm } from "./QuickTxForm";

export const QuickTxModal: React.FC = () => {
  const { isOpen, type, bootstrapOptions, closeQuickTx } = useQuickTx();

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeQuickTx();
        }
      }}
    >
      <DialogContent className="quick-tx-dialog max-w-md">
        {/* Visually hidden Title and Description for screen readers accessibility */}
        <div style={{ position: "absolute", width: "1px", height: "1px", padding: "0", margin: "-1px", overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: "0" }}>
          <DialogTitle>Déclaration rapide de transaction</DialogTitle>
          <DialogDescription>
            Formulaire de saisie rapide pour enregistrer un revenu ou une dépense.
          </DialogDescription>
        </div>
        <QuickTxForm
          defaultType={type}
          bootstrapOptions={bootstrapOptions}
          onSuccess={closeQuickTx}
          onCancel={closeQuickTx}
          isInline={false}
        />
      </DialogContent>
    </Dialog>
  );
};

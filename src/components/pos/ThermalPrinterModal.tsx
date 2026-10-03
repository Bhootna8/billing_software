import React, { useState, useEffect } from "react";
import {
  Printer,
  X,
  Check,
  RefreshCw,
  Scissors,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  printerService,
  PrinterSettings,
  SystemPrinterInfo,
  PrintResult,
} from "../../services/tauri";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lastInvoiceId?: string;
}

export function ThermalPrinterModal({ isOpen, onClose, lastInvoiceId }: Props) {
  const [settings, setSettings] = useState<PrinterSettings>({
    printer_name: "POS-80 Thermal Receipt Printer",
    paper_width: "80mm",
    auto_cut: true,
    open_cash_drawer: true,
    header_text: "TAX INVOICE / CASH BILL",
    footer_text: "Thank you for your business!\nVisit Again Soon.",
    show_gstin: true,
    show_hsn: true,
    copies: 1,
  });

  const [availablePrinters, setAvailablePrinters] = useState<SystemPrinterInfo[]>([]);
  const [previewResult, setPreviewResult] = useState<PrintResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      setLoading(true);
      const [s, p] = await Promise.all([
        printerService.getSettings(),
        printerService.listPrinters(),
      ]);
      setSettings(s);
      setAvailablePrinters(p);

      if (lastInvoiceId) {
        try {
          const res = await printerService.printInvoiceThermal(lastInvoiceId);
          setPreviewResult(res);
        } catch {
          // Fallback demo invoice preview
        }
      }
      setLoading(false);
    }

    load();
  }, [isOpen, lastInvoiceId]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await printerService.saveSettings(settings);
    setStatusMsg("Printer configurations saved successfully!");
    setSaving(false);
    setTimeout(() => setStatusMsg(null), 3000);
  }

  async function handleTestPrint() {
    if (!lastInvoiceId) {
      alert("Create a bill first or preview standard demo receipt.");
      return;
    }
    try {
      const res = await printerService.printInvoiceThermal(lastInvoiceId);
      setPreviewResult(res);
      setStatusMsg(`Test print sent (${res.bytes_sent} ESC/POS bytes in ${res.execution_time_ms}ms)`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      alert(`Print error: ${err}`);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-100">
      <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="p-4 border-b border-(--color-border-default) flex items-center justify-between bg-(--color-bg-page)">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-(--color-action-primary)" />
            <h3 className="font-semibold text-[15px] text-(--color-text-primary)">
              Direct ESC/POS Thermal Printing & Hardware Setup
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-subtle) transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STATUS NOTIFICATION */}
        {statusMsg && (
          <div className="bg-(--color-success-bg) border-b border-(--primitive-success-600)/20 px-4 py-2 text-xs text-(--color-success-dark) font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-(--color-success)" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* BODY (2 COLUMNS: CONFIG ON LEFT, RECEIPT PREVIEW ON RIGHT) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
          {/* LEFT: PRINTER SETTINGS FORM */}
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="space-y-3">
              <span className="font-semibold text-(--color-text-primary) uppercase tracking-wider text-[11px] font-mono block">
                Hardware Device & Spooler
              </span>

              {/* SELECT PRINTER */}
              <div className="space-y-1">
                <label className="text-(--color-text-secondary) font-medium">Selected Thermal Printer</label>
                <select
                  value={settings.printer_name}
                  onChange={(e) => setSettings({ ...settings, printer_name: e.target.value })}
                  className="w-full h-9 px-2.5 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs font-mono text-(--color-text-primary)"
                >
                  {availablePrinters.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.is_default ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* PAPER WIDTH */}
              <div className="space-y-1">
                <label className="text-(--color-text-secondary) font-medium">Paper Roll Width</label>
                <div className="grid grid-cols-2 gap-2">
                  {["80mm", "58mm"].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSettings({ ...settings, paper_width: w })}
                      className={`h-9 rounded-md font-semibold text-xs border transition-colors cursor-pointer ${
                        settings.paper_width === w
                          ? "bg-(--color-action-primary) text-white border-(--color-action-primary)"
                          : "bg-(--color-bg-subtle) text-(--color-text-secondary) border-(--color-border-default)"
                      }`}
                    >
                      {w === "80mm" ? "3-Inch (80mm / 48 Col)" : "2-Inch (58mm / 32 Col)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* HARDWARE TOGGLES */}
              <div className="space-y-2 pt-2 border-t border-(--color-border-default)">
                <label className="flex items-center justify-between cursor-pointer p-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-(--color-action-primary)" />
                    <span className="font-medium text-(--color-text-primary)">Auto Paper Cut (GS V)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_cut}
                    onChange={(e) => setSettings({ ...settings, auto_cut: e.target.checked })}
                    className="h-4 w-4 rounded-sm text-(--color-action-primary)"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-(--color-action-primary)" />
                    <span className="font-medium text-(--color-text-primary)">
                      Open Cash Drawer Pulse (ESC p)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.open_cash_drawer}
                    onChange={(e) => setSettings({ ...settings, open_cash_drawer: e.target.checked })}
                    className="h-4 w-4 rounded-sm text-(--color-action-primary)"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-(--color-action-primary)" />
                    <span className="font-medium text-(--color-text-primary)">Print GSTIN & HSN Summary</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.show_gstin}
                    onChange={(e) => setSettings({ ...settings, show_gstin: e.target.checked })}
                    className="h-4 w-4 rounded-sm text-(--color-action-primary)"
                  />
                </label>
              </div>

              {/* RECEIPT HEADER / FOOTER CUSTOMIZATION */}
              <div className="space-y-2 pt-2 border-t border-(--color-border-default)">
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Receipt Title Header</label>
                  <input
                    type="text"
                    value={settings.header_text}
                    onChange={(e) => setSettings({ ...settings, header_text: e.target.value })}
                    className="w-full h-8 px-2.5 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Footer Greeting</label>
                  <textarea
                    rows={2}
                    value={settings.footer_text}
                    onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                    className="w-full p-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 pt-3 border-t border-(--color-border-default)">
              <button
                type="button"
                onClick={handleTestPrint}
                className="h-9 flex-1 flex items-center justify-center gap-1.5 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-(--color-text-primary) font-semibold border border-(--color-border-default) cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Test Thermal ESC/POS</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="h-9 flex-1 flex items-center justify-center gap-1.5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-semibold cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </form>

          {/* RIGHT: REAL-TIME ESC/POS THERMAL RECEIPT PREVIEW */}
          <div className="bg-(--color-bg-page) border border-(--color-border-default) rounded-lg p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-(--color-border-default) text-[11px] font-mono text-(--color-text-muted)">
              <span>Receipt Preview ({settings.paper_width})</span>
              <span className="text-(--color-success) font-semibold">ESC/POS 200dpi</span>
            </div>

            <div className="flex-1 bg-white border border-(--color-border-default) rounded-md p-3 font-mono text-[11px] leading-tight text-black overflow-y-auto whitespace-pre my-2 shadow-inner select-text">
              {loading ? (
                <div className="text-center py-12 text-(--color-text-muted)">
                  Generating ESC/POS receipt stream...
                </div>
              ) : previewResult ? (
                previewResult.formatted_preview
              ) : (
                <div className="text-center py-12 text-(--color-text-muted)">
                  Complete an invoice on POS to view live thermal print stream.
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-(--color-text-muted) flex items-center justify-between pt-1">
              <span>Byte stream: {previewResult?.bytes_sent || 0} bytes</span>
              <span>Latency: {previewResult?.execution_time_ms || 0}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle2,
  Building2,
  ShoppingCart,
  Wifi,
  Database,
} from "lucide-react";
import {
  reportService,
  Gstr1Summary,
  SyncStatus,
} from "../../services/tauri";

export function GstReportScreen() {
  const [report, setReport] = useState<Gstr1Summary | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"summary" | "hsn" | "sync">("summary");
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [r, s] = await Promise.all([
        reportService.getGstSummary(),
        reportService.getSyncStatus(),
      ]);
      setReport(r);
      setSyncStatus(s);
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleExportTallyXml() {
    try {
      const xml = await reportService.exportTallyXml();
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tally_Sales_Vouchers_${new Date().toISOString().slice(0, 10)}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMsg("Tally XML Sales file exported successfully!");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      alert(`Export error: ${err}`);
    }
  }

  async function handleTriggerSync() {
    setSyncing(true);
    try {
      const res = await reportService.triggerStoreSync();
      const updatedSync = await reportService.getSyncStatus();
      setSyncStatus(updatedSync);
      setToastMsg(res.message);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      alert(`Sync error: ${err}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden select-none">
      {/* TOAST */}
      {toastMsg && (
        <div className="fixed top-18 right-6 z-(--z-toast) bg-(--color-success) text-white px-4 py-2.5 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider block">
            Gross Turnover (Q1)
          </span>
          <div className="text-2xl font-extrabold text-(--color-action-primary) font-mono tracking-tight">
            ₹{report?.gross_turnover.toLocaleString("en-IN") || "0.00"}
          </div>
          <span className="text-[10px] font-mono text-(--color-text-secondary)">
            Total Sales Invoices Value
          </span>
        </div>

        <div className="p-3.5 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider block">
            Total Taxable Value
          </span>
          <div className="text-2xl font-extrabold text-(--color-text-primary) font-mono tracking-tight">
            ₹{report?.total_taxable_value.toFixed(2) || "0.00"}
          </div>
          <span className="text-[10px] font-mono text-(--color-text-secondary)">
            Pre-tax net revenue
          </span>
        </div>

        <div className="p-3.5 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider block">
            Total GST Liability
          </span>
          <div className="text-2xl font-extrabold text-(--color-danger) font-mono tracking-tight">
            ₹{report?.total_tax_liability.toFixed(2) || "0.00"}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-(--color-text-muted)">
            <span>CGST: ₹{report?.total_cgst.toFixed(2)}</span>
            <span>SGST: ₹{report?.total_sgst.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-3 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs flex flex-col justify-center gap-2">
          <button
            onClick={handleExportTallyXml}
            className="w-full h-9 flex items-center justify-center gap-1.5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Tally XML</span>
          </button>
          <div className="text-center text-[10px] font-mono text-(--color-text-muted)">
            Format compatible with Tally Prime & Busy
          </div>
        </div>
      </div>

      {/* 2. REPORT NAVIGATION SUB-TABS */}
      <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1">
          {[
            { id: "summary", label: "GSTR-1 & GSTR-3B Summary", icon: FileText },
            { id: "hsn", label: "HSN-Wise Tax Breakdown", icon: Database },
            { id: "sync", label: "Multi-Store Cloud Sync Status", icon: Wifi },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as "summary" | "hsn" | "sync")}
                className={`h-9 px-3.5 flex items-center gap-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? "bg-(--color-action-primary) text-white shadow-xs"
                    : "text-(--color-text-secondary) hover:bg-(--color-bg-subtle) hover:text-(--color-text-primary)"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono text-(--color-text-muted)">
          Period: <strong className="text-(--color-text-primary)">{report?.period || "2026-2027"}</strong>
        </div>
      </div>

      {/* 3. SUB-TAB CONTENT AREA */}
      <div className="flex-1 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-(--color-text-muted)">
            Calculating statutory GST summaries...
          </div>
        ) : activeSubTab === "summary" ? (
          /* GSTR-1 & 3B SUMMARY */
          <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* B2B INVOICES SUMMARY CARD */}
              <div className="p-4 bg-(--color-bg-page) border border-(--color-border-default) rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-(--color-border-default) pb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-(--color-text-primary)">
                    <Building2 className="w-4 h-4 text-(--color-action-primary)" />
                    <span>Table 4: B2B Wholesale Invoices</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-sm bg-(--primitive-blue-100) text-(--color-action-primary-text) font-mono font-bold text-[10px]">
                    {report?.b2b_invoices_count} Invoices
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-(--color-text-secondary)">
                    <span>Total Taxable Value:</span>
                    <span className="font-bold text-(--color-text-primary)">
                      ₹{report?.b2b_taxable_value.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-(--color-text-secondary)">
                    <span>Total Tax (CGST + SGST + IGST):</span>
                    <span className="font-bold text-(--color-action-primary)">
                      ₹{report?.b2b_tax_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-(--color-text-secondary) pt-1 border-t border-(--color-border-default)">
                    <span>Total Invoice Value:</span>
                    <span className="font-extrabold text-(--color-text-primary)">
                      ₹{((report?.b2b_taxable_value || 0) + (report?.b2b_tax_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* B2C RETAIL INVOICES SUMMARY CARD */}
              <div className="p-4 bg-(--color-bg-page) border border-(--color-border-default) rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-(--color-border-default) pb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-(--color-text-primary)">
                    <ShoppingCart className="w-4 h-4 text-(--color-success)" />
                    <span>Table 7: B2C Retail POS Sales</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-sm bg-(--color-success-bg) text-(--color-success-dark) font-mono font-bold text-[10px]">
                    {report?.b2c_invoices_count} Receipts
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-(--color-text-secondary)">
                    <span>Total Taxable Value:</span>
                    <span className="font-bold text-(--color-text-primary)">
                      ₹{report?.b2c_taxable_value.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-(--color-text-secondary)">
                    <span>Total Tax (CGST + SGST):</span>
                    <span className="font-bold text-(--color-success)">
                      ₹{report?.b2c_tax_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-(--color-text-secondary) pt-1 border-t border-(--color-border-default)">
                    <span>Total Retail Collection:</span>
                    <span className="font-extrabold text-(--color-text-primary)">
                      ₹{((report?.b2c_taxable_value || 0) + (report?.b2c_tax_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* GSTR-3B TAX LIABILITY BREAKDOWN TABLE */}
            <div className="p-4 bg-(--color-bg-page) border border-(--color-border-default) rounded-lg space-y-2">
              <span className="font-bold text-xs text-(--color-text-primary) block">
                GSTR-3B Eligible Tax Liability Breakdown
              </span>
              <div className="grid grid-cols-4 gap-3 font-mono text-center">
                <div className="p-2.5 bg-white border border-(--color-border-default) rounded-md">
                  <span className="text-[10px] text-(--color-text-muted) block">Central Tax (CGST)</span>
                  <span className="text-sm font-bold text-(--color-text-primary)">
                    ₹{report?.total_cgst.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-(--color-border-default) rounded-md">
                  <span className="text-[10px] text-(--color-text-muted) block">State Tax (SGST)</span>
                  <span className="text-sm font-bold text-(--color-text-primary)">
                    ₹{report?.total_sgst.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-(--color-border-default) rounded-md">
                  <span className="text-[10px] text-(--color-text-muted) block">Integrated Tax (IGST)</span>
                  <span className="text-sm font-bold text-(--color-warning-dark)">
                    ₹{report?.total_igst.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-(--color-border-default) rounded-md">
                  <span className="text-[10px] text-(--color-text-muted) block">Total Net Tax Pay</span>
                  <span className="text-sm font-bold text-(--color-danger)">
                    ₹{report?.total_tax_liability.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : activeSubTab === "hsn" ? (
          /* HSN-WISE SUMMARY TABLE */
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-(--color-bg-subtle) border-b border-(--color-border-default) z-(--z-sticky)">
                <tr className="text-(--color-text-secondary) font-mono text-[11px] uppercase tracking-wider h-9">
                  <th className="py-2 px-3">HSN Code</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Total Qty</th>
                  <th className="py-2 px-3 text-center">Tax Slab</th>
                  <th className="py-2 px-3 text-right">Taxable Value (₹)</th>
                  <th className="py-2 px-3 text-right">CGST (₹)</th>
                  <th className="py-2 px-3 text-right">SGST (₹)</th>
                  <th className="py-2 px-3 text-right">IGST (₹)</th>
                  <th className="py-2 px-3 text-right">Total Tax (₹)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-(--color-border-default)">
                {report?.hsn_items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-(--color-text-muted)">
                      No invoice line items recorded for HSN aggregation yet.
                    </td>
                  </tr>
                ) : (
                  report?.hsn_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-(--color-bg-subtle) h-10 font-mono">
                      <td className="py-2 px-3 font-bold text-(--color-action-primary)">
                        {item.hsn_code}
                      </td>
                      <td className="py-2 px-3 font-sans font-medium text-(--color-text-primary)">
                        {item.description}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {item.total_qty} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-center font-bold">
                        {item.tax_rate}%
                      </td>
                      <td className="py-2 px-3 text-right font-bold">
                        ₹{item.taxable_value.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-(--color-text-secondary)">
                        ₹{item.cgst_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-(--color-text-secondary)">
                        ₹{item.sgst_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-(--color-text-secondary)">
                        ₹{item.igst_amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-(--color-danger)">
                        ₹{item.total_tax.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* MULTI-STORE CLOUD SYNC STATUS */
          <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
            <div className="p-5 bg-(--color-bg-page) border border-(--color-border-default) rounded-lg space-y-4">
              <div className="flex items-center justify-between border-b border-(--color-border-default) pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-(--color-text-primary)">
                  <Wifi className="w-5 h-5 text-(--color-success)" />
                  <span>Multi-Store Event Synchronization Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-(--color-success)" />
                  <span className="text-xs font-mono font-bold text-(--color-success)">
                    Sync Node Online ({syncStatus?.server_latency_ms}ms)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="p-3 bg-white border border-(--color-border-default) rounded-md">
                  <span className="text-[10px] text-(--color-text-muted) block">Terminal Store ID</span>
                  <span className="font-bold text-sm text-(--color-text-primary)">
                    {syncStatus?.store_code} ({syncStatus?.store_id})
                  </span>
                </div>

                <div className="p-3 bg-white border border-(--color-border-default) rounded-md">
                  <span className="text-[10px] text-(--color-text-muted) block">Reconciled Events</span>
                  <span className="font-bold text-sm text-(--color-action-primary)">
                    {syncStatus?.pending_events} Invoices & Transactions
                  </span>
                </div>

                <div className="p-3 bg-white border border-(--color-border-default) rounded-md">
                  <span className="text-[10px] text-(--color-text-muted) block">Last Synced Timestamp</span>
                  <span className="font-bold text-xs text-(--color-text-primary)">
                    {syncStatus?.last_synced_at}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-(--color-border-default) flex items-center justify-between">
                <p className="text-(--color-text-secondary) max-w-md text-[11px] leading-relaxed">
                  Local-first event sourcing queue captures every invoice, credit ledger settlement, and inventory deduction on embedded SQLite. Sync automatically flushes to peer counters upon network availability.
                </p>

                <button
                  onClick={handleTriggerSync}
                  disabled={syncing}
                  className="h-9 px-4 flex items-center gap-1.5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-semibold text-xs shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  <span>{syncing ? "Reconciling Events..." : "Sync All Stores Now"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

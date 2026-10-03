import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  QrCode,
  CreditCard,
  Building2,
  CheckCircle2,
  Share2,
  Sliders,
  X,
  Check,
} from "lucide-react";
import {
  customerService,
  Customer,
  KhataEntry,
  KhataSummary,
  RecordPaymentInput,
} from "../../services/tauri";

export function KhataLedgerScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<KhataEntry[]>([]);
  const [summary, setSummary] = useState<KhataSummary>({
    total_outstanding: 0,
    total_credit_customers: 0,
    total_settled_recent: 0,
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [creditLimitModalOpen, setCreditLimitModalOpen] = useState<boolean>(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState<boolean>(false);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("UPI");
  const [payRef, setPayRef] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");

  // Credit Limit State
  const [newLimit, setNewLimit] = useState<number>(10000);

  // Add Customer State
  const [newCustName, setNewCustName] = useState<string>("");
  const [newCustPhone, setNewCustPhone] = useState<string>("");
  const [newCustGstin, setNewCustGstin] = useState<string>("");
  const [newCustLimit, setNewCustLimit] = useState<number>(15000);

  // Feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadData = useCallback(async (query: string = "") => {
    const [custs, summ] = await Promise.all([
      customerService.searchCustomers(query),
      customerService.getKhataSummary(),
    ]);

    // Filter out walkin customer from Khata list
    const creditCusts = custs.filter((c) => c.id !== "cust-walkin");
    setCustomers(creditCusts);
    setSummary(summ);

    if (creditCusts.length > 0 && !selectedCustomer) {
      setSelectedCustomer(creditCusts[0]);
    }
    setLoading(false);
  }, [selectedCustomer]);

  useEffect(() => {
    loadData(searchQuery);
  }, [searchQuery, loadData]);

  // Load ledger when selected customer changes
  useEffect(() => {
    if (!selectedCustomer) return;
    customerService.getCustomerLedger(selectedCustomer.id).then(setLedgerEntries);
  }, [selectedCustomer]);

  function handleOpenPaymentModal() {
    if (!selectedCustomer) return;
    setPayAmount(selectedCustomer.current_balance);
    setPayMethod("UPI");
    setPayRef("");
    setPayNotes("");
    setPaymentModalOpen(true);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer || payAmount <= 0) return;

    const input: RecordPaymentInput = {
      customer_id: selectedCustomer.id,
      amount: payAmount,
      payment_method: payMethod,
      reference_no: payRef || undefined,
      notes: payNotes || undefined,
    };

    const updated = await customerService.recordKhataPayment(input);
    setSelectedCustomer(updated);
    setPaymentModalOpen(false);
    setToastMsg(`Settlement of ₹${payAmount} recorded for ${updated.name}!`);
    setTimeout(() => setToastMsg(null), 3500);
    loadData(searchQuery);
  }

  async function handleUpdateCreditLimit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;

    const updated = await customerService.updateCreditLimit(selectedCustomer.id, newLimit);
    setSelectedCustomer(updated);
    setCreditLimitModalOpen(false);
    setToastMsg(`Credit limit updated to ₹${newLimit} for ${updated.name}!`);
    setTimeout(() => setToastMsg(null), 3500);
    loadData(searchQuery);
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const created = await customerService.createCustomer({
      name: newCustName,
      phone: newCustPhone,
      gstin: newCustGstin || undefined,
      credit_limit: newCustLimit,
    });

    setSelectedCustomer(created);
    setAddCustomerModalOpen(false);
    setNewCustName("");
    setNewCustPhone("");
    setNewCustGstin("");
    setToastMsg(`Customer ${created.name} added to Khata Ledger!`);
    setTimeout(() => setToastMsg(null), 3500);
    loadData(searchQuery);
  }

  function handleSendWhatsAppReminder() {
    if (!selectedCustomer || !selectedCustomer.phone) {
      alert("Customer phone number not available.");
      return;
    }
    const cleanPhone = selectedCustomer.phone.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `Dear ${selectedCustomer.name},\nThis is a gentle payment reminder from Main Retail Store. Your current outstanding Khata balance is ₹${selectedCustomer.current_balance.toFixed(2)}.\nKindly settle the amount at your earliest convenience. Thank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  }

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden select-none">
      {/* SUCCESS TOAST */}
      {toastMsg && (
        <div className="fixed top-18 right-6 z-(--z-toast) bg-(--color-success) text-white px-4 py-2.5 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. KHATA SUMMARY METRICS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider block">
            Total Market Credit (Udhar)
          </span>
          <div className="text-2xl font-extrabold text-(--color-danger) font-mono tracking-tight">
            ₹{summary.total_outstanding.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] font-mono text-(--color-text-secondary)">
            Across {summary.total_credit_customers} active accounts
          </span>
        </div>

        <div className="p-3.5 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider block">
            Credit Accounts
          </span>
          <div className="text-2xl font-extrabold text-(--color-text-primary) font-mono tracking-tight">
            {summary.total_credit_customers}
          </div>
          <span className="text-[10px] font-mono text-(--color-text-secondary)">
            Regular credit customers
          </span>
        </div>

        <div className="p-3.5 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs space-y-1">
          <span className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider block">
            Recent Collections
          </span>
          <div className="text-2xl font-extrabold text-(--color-success) font-mono tracking-tight">
            ₹{summary.total_settled_recent.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] font-mono text-(--color-text-secondary)">
            Settled via Cash / UPI
          </span>
        </div>

        <div className="p-3 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs flex flex-col justify-center gap-2">
          <button
            onClick={() => setAddCustomerModalOpen(true)}
            className="w-full h-9 flex items-center justify-center gap-1.5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credit Customer</span>
          </button>
          <div className="text-center text-[10px] font-mono text-(--color-text-muted)">
            Press [F4] to switch modules
          </div>
        </div>
      </div>

      {/* 2. SPLIT WORKSPACE: CUSTOMER LIST ON LEFT, LEDGER DETAIL ON RIGHT */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* LEFT COLUMN: CUSTOMER SELECTOR LIST (4 Cols / ~320px) */}
        <div className="col-span-12 lg:col-span-4 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg flex flex-col shadow-xs overflow-hidden">
          {/* SEARCH BAR */}
          <div className="p-3 border-b border-(--color-border-default) bg-(--color-bg-page)">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search by Name, Phone, or GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-(--color-bg-surface) border border-(--color-border-default) rounded-md text-xs text-(--color-text-primary) placeholder-(--color-text-muted)"
              />
            </div>
          </div>

          {/* CUSTOMERS LIST */}
          <div className="flex-1 overflow-y-auto divide-y divide-(--color-border-default)">
            {loading ? (
              <div className="py-12 text-center text-(--color-text-muted) text-xs">
                Loading credit accounts...
              </div>
            ) : customers.length === 0 ? (
              <div className="py-12 text-center text-(--color-text-muted) text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-(--color-text-disabled)" />
                No customer accounts found.
              </div>
            ) : (
              customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const creditPct =
                  c.credit_limit > 0 ? Math.min(100, (c.current_balance / c.credit_limit) * 100) : 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-(--color-action-primary-subtle) border-l-4 border-l-(--color-action-primary)"
                        : "hover:bg-(--color-bg-subtle)"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="truncate">
                        <span className="font-semibold text-xs text-(--color-text-primary) block truncate">
                          {c.name}
                        </span>
                        <span className="text-[11px] font-mono text-(--color-text-muted)">
                          {c.phone || "No phone"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold font-mono text-sm block ${
                            c.current_balance > 0 ? "text-(--color-danger)" : "text-(--color-success)"
                          }`}
                        >
                          ₹{c.current_balance.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-mono text-(--color-text-muted)">
                          Limit: ₹{c.credit_limit}
                        </span>
                      </div>
                    </div>

                    {/* CREDIT UTILIZATION PROGRESS BAR */}
                    <div className="mt-2 space-y-0.5">
                      <div className="w-full h-1.5 bg-(--color-border-default) rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            creditPct > 90
                              ? "bg-(--color-danger)"
                              : creditPct > 60
                              ? "bg-(--color-warning)"
                              : "bg-(--color-action-primary)"
                          }`}
                          style={{ width: `${creditPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-(--color-text-muted)">
                        <span>Utilization</span>
                        <span>{creditPct.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER LEDGER DETAIL (8 Cols) */}
        <div className="col-span-12 lg:col-span-8 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg flex flex-col shadow-xs overflow-hidden">
          {selectedCustomer ? (
            <>
              {/* CUSTOMER HEADER & ACTION BANNER */}
              <div className="p-4 border-b border-(--color-border-default) bg-(--color-bg-page) space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-(--color-text-primary)">
                        {selectedCustomer.name}
                      </h2>
                      {selectedCustomer.gstin && (
                        <span className="px-2 py-0.5 bg-(--color-bg-subtle) border border-(--color-border-default) rounded-sm text-[10px] font-mono">
                          GSTIN: {selectedCustomer.gstin}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-(--color-text-secondary) mt-0.5">
                      Phone: {selectedCustomer.phone || "—"} | Address: {selectedCustomer.address || "Local Customer"}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendWhatsAppReminder}
                      className="h-9 px-3 flex items-center gap-1.5 rounded-md bg-(--color-success-bg) text-(--color-success-dark) hover:bg-(--primitive-success-50)/80 border border-(--primitive-success-600)/20 text-xs font-semibold transition-colors cursor-pointer"
                      title="Send WhatsApp payment reminder link"
                    >
                      <Share2 className="w-3.5 h-3.5 text-(--color-success)" />
                      <span>WhatsApp Reminder</span>
                    </button>

                    <button
                      onClick={() => {
                        setNewLimit(selectedCustomer.credit_limit);
                        setCreditLimitModalOpen(true);
                      }}
                      className="h-9 px-3 flex items-center gap-1.5 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-(--color-text-secondary) border border-(--color-border-default) text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Credit Limit</span>
                    </button>

                    <button
                      onClick={handleOpenPaymentModal}
                      className="h-9 px-4 flex items-center gap-1.5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Record Payment [F2]</span>
                    </button>
                  </div>
                </div>

                {/* KPI STATS FOR SELECTED CUSTOMER */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-(--color-border-default) text-xs font-mono">
                  <div className="p-2.5 bg-(--color-bg-surface) rounded-md border border-(--color-border-default)">
                    <span className="text-[10px] text-(--color-text-muted) block">Total Credit Limit</span>
                    <span className="text-sm font-bold text-(--color-text-primary)">
                      ₹{selectedCustomer.credit_limit.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-(--color-bg-surface) rounded-md border border-(--color-border-default)">
                    <span className="text-[10px] text-(--color-text-muted) block">Current Outstanding</span>
                    <span
                      className={`text-sm font-bold ${
                        selectedCustomer.current_balance > 0
                          ? "text-(--color-danger)"
                          : "text-(--color-success)"
                      }`}
                    >
                      ₹{selectedCustomer.current_balance.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-(--color-bg-surface) rounded-md border border-(--color-border-default)">
                    <span className="text-[10px] text-(--color-text-muted) block">Available Credit</span>
                    <span className="text-sm font-bold text-(--color-action-primary)">
                      ₹{Math.max(0, selectedCustomer.credit_limit - selectedCustomer.current_balance).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* LEDGER TRANSACTION HISTORY TABLE */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-(--color-bg-subtle) border-b border-(--color-border-default) z-(--z-sticky)">
                    <tr className="text-(--color-text-secondary) font-mono text-[11px] uppercase tracking-wider h-9">
                      <th className="py-2 px-3">Date & Time</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Reference / Bill No</th>
                      <th className="py-2 px-3">Payment Mode</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                      <th className="py-2 px-3 text-right">Balance After (₹)</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-(--color-border-default)">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-(--color-text-muted)">
                          No transactions recorded in this Khata ledger yet.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((entry) => {
                        const isDebit = entry.entry_type === "DEBIT";
                        return (
                          <tr key={entry.id} className="hover:bg-(--color-bg-subtle) h-10 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-(--color-text-muted)">
                              {entry.created_at}
                            </td>

                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold ${
                                  isDebit
                                    ? "bg-(--color-danger-bg) text-(--color-danger-dark)"
                                    : "bg-(--color-success-bg) text-(--color-success-dark)"
                                }`}
                              >
                                {isDebit ? (
                                  <>
                                    <ArrowUpRight className="w-3 h-3" />
                                    <span>DEBIT (Udhar)</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownLeft className="w-3 h-3" />
                                    <span>CREDIT (Paid)</span>
                                  </>
                                )}
                              </span>
                            </td>

                            <td className="py-2 px-3 font-mono text-xs text-(--color-text-primary)">
                              {entry.reference_no || entry.invoice_id || "—"}
                              {entry.notes && (
                                <span className="block text-[10px] text-(--color-text-muted) font-sans">
                                  {entry.notes}
                                </span>
                              )}
                            </td>

                            <td className="py-2 px-3 font-mono text-[11px] text-(--color-text-secondary)">
                              {entry.payment_method}
                            </td>

                            <td
                              className={`py-2 px-3 text-right font-mono font-bold text-xs ${
                                isDebit ? "text-(--color-danger)" : "text-(--color-success)"
                              }`}
                            >
                              {isDebit ? "+" : "-"}₹{entry.amount.toFixed(2)}
                            </td>

                            <td className="py-2 px-3 text-right font-mono font-bold text-xs text-(--color-text-primary)">
                              ₹{entry.balance_after.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-(--color-text-muted) text-sm">
              Select a customer from the left to view Khata ledger.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RECORD PAYMENT SETTLEMENT MODAL                                        */}
      {/* ========================================================================= */}
      {paymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-100">
          <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-(--color-border-default) flex items-center justify-between bg-(--color-bg-page)">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-(--color-success)" />
                <h3 className="font-semibold text-sm text-(--color-text-primary)">
                  Record Khata Repayment Collection
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-4 space-y-4 text-xs">
              <div className="p-3 bg-(--color-bg-subtle) rounded-md border border-(--color-border-default) space-y-1 font-mono">
                <div className="flex items-center justify-between text-(--color-text-muted)">
                  <span>Customer:</span>
                  <span className="font-bold text-(--color-text-primary)">{selectedCustomer.name}</span>
                </div>
                <div className="flex items-center justify-between text-(--color-text-muted)">
                  <span>Outstanding Balance:</span>
                  <span className="font-bold text-(--color-danger)">
                    ₹{selectedCustomer.current_balance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* AMOUNT */}
              <div className="space-y-1">
                <label className="text-(--color-text-secondary) font-medium">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-(--color-bg-page) border-2 border-(--primitive-blue-300) focus:border-(--color-action-primary) rounded-md font-mono text-base font-bold text-(--color-text-primary)"
                />
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="space-y-1.5">
                <label className="text-(--color-text-secondary) font-medium">Tender Mode</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "UPI", label: "UPI", icon: QrCode },
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "BANK_TRANSFER", label: "Bank", icon: Building2 },
                    { id: "CHEQUE", label: "Cheque", icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`h-9 flex flex-col items-center justify-center gap-0.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                          payMethod === m.id
                            ? "bg-(--color-action-primary) text-white border-(--color-action-primary)"
                            : "bg-(--color-bg-subtle) text-(--color-text-secondary) border-(--color-border-default)"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* REFERENCE NO & NOTES */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Reference / UTR No</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI/26089912"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full h-9 px-2.5 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Partial weekly settlement"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full h-9 px-2.5 bg-(--color-bg-page) border border-(--color-border-default) rounded-md"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-(--color-border-default) flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="h-9 px-4 rounded-md bg-(--color-bg-subtle) text-(--color-text-secondary)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-md bg-(--color-success) hover:bg-(--primitive-success-700) text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADJUST CREDIT LIMIT MODAL                                              */}
      {/* ========================================================================= */}
      {creditLimitModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-100">
          <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-(--color-border-default) flex items-center justify-between bg-(--color-bg-page)">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-(--color-action-primary)" />
                <h3 className="font-semibold text-sm text-(--color-text-primary)">
                  Adjust Customer Credit Limit
                </h3>
              </div>
              <button
                onClick={() => setCreditLimitModalOpen(false)}
                className="p-1 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCreditLimit} className="p-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-(--color-text-secondary) font-medium">
                  Approved Credit Limit (₹)
                </label>
                <input
                  type="number"
                  step="500"
                  required
                  value={newLimit}
                  onChange={(e) => setNewLimit(Number(e.target.value))}
                  className="w-full h-10 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-base font-bold text-(--color-text-primary)"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-(--color-border-default)">
                <button
                  type="button"
                  onClick={() => setCreditLimitModalOpen(false)}
                  className="h-9 px-4 rounded-md bg-(--color-bg-subtle) text-(--color-text-secondary)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-md bg-(--color-action-primary) text-white font-bold cursor-pointer"
                >
                  Update Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD NEW CREDIT CUSTOMER MODAL                                          */}
      {/* ========================================================================= */}
      {addCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-100">
          <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-(--color-border-default) flex items-center justify-between bg-(--color-bg-page)">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-(--color-action-primary)" />
                <h3 className="font-semibold text-sm text-(--color-text-primary)">
                  Add Credit Customer Account
                </h3>
              </div>
              <button
                onClick={() => setAddCustomerModalOpen(false)}
                className="p-1 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-(--color-text-secondary) font-medium">Customer / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra & Sons"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 9876543210"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={newCustGstin}
                    onChange={(e) => setNewCustGstin(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-(--color-text-secondary) font-medium">Initial Credit Limit (₹)</label>
                <input
                  type="number"
                  step="1000"
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(Number(e.target.value))}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-(--color-border-default)">
                <button
                  type="button"
                  onClick={() => setAddCustomerModalOpen(false)}
                  className="h-9 px-4 rounded-md bg-(--color-bg-subtle) text-(--color-text-secondary)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-md bg-(--color-action-primary) text-white font-bold cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

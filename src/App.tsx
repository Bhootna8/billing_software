import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Boxes,
  Users,
  Building2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Command,
  RotateCcw,
  PackageCheck,
  Truck,
  CreditCard,
  Receipt,
  PieChart,
  ShieldCheck,
  UserCheck,
  History,
  CheckCircle2,
  Wifi,
} from "lucide-react";
import {
  systemService,
  storeService,
  SystemHealth,
  DatabasePingResponse,
  StoreProfile,
} from "./services/tauri";
import { ProductMaster } from "./components/catalog/ProductMaster";
import { PosBillingScreen } from "./components/pos/PosBillingScreen";
import { KhataLedgerScreen } from "./components/khata/KhataLedgerScreen";
import { WholesaleOrderDesk } from "./components/wholesale/WholesaleOrderDesk";
import { GstReportScreen } from "./components/reports/GstReportScreen";
import { CompanyProfileScreen } from "./components/profile/CompanyProfileScreen";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { UniversalCommandPalette } from "./components/common/UniversalCommandPalette";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  hotkey?: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function App() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [ping, setPing] = useState<DatabasePingResponse | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pos");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      const [h, p, prof, isOnboarded] = await Promise.all([
        systemService.getHealth(),
        systemService.pingDatabase(),
        storeService.getStoreProfile(),
        storeService.getOnboardingStatus(),
      ]);
      setHealth(h);
      setPing(p);
      setStoreProfile(prof);
      setOnboardingOpen(!isOnboarded);
      setLoading(false);
    }
    loadData();

    const interval = setInterval(async () => {
      const p = await systemService.pingDatabase();
      setPing(p);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Navigation (F1-F6 and Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === "F1") {
        e.preventDefault();
        setActiveTab("pos");
      } else if (e.key === "F2") {
        e.preventDefault();
        setActiveTab("wholesale");
      } else if (e.key === "F3") {
        e.preventDefault();
        setActiveTab("inventory");
      } else if (e.key === "F4") {
        e.preventDefault();
        setActiveTab("credit");
      } else if (e.key === "F5") {
        e.preventDefault();
        setActiveTab("reports");
      } else if (e.key === "F6") {
        e.preventDefault();
        setActiveTab("settings");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigationSections: NavSection[] = [
    {
      title: "SELL",
      items: [
        { id: "pos", label: "Retail POS", icon: ShoppingCart, hotkey: "F1", badge: "Live" },
        { id: "wholesale", label: "Wholesale Orders", icon: Building2, hotkey: "F2", badge: "B2B" },
        { id: "returns", label: "Returns & Exchanges", icon: RotateCcw },
      ],
    },
    {
      title: "MANAGE",
      items: [
        { id: "inventory", label: "Products & SKUs", icon: Boxes, hotkey: "F3", badge: "Master" },
        { id: "stock", label: "Stock Control", icon: PackageCheck },
        { id: "purchases", label: "Purchases & GRN", icon: Truck },
        { id: "customers", label: "Customers", icon: Users },
        { id: "suppliers", label: "Suppliers", icon: Building2 },
      ],
    },
    {
      title: "FINANCE",
      items: [
        { id: "credit", label: "Credit & Khata", icon: CreditCard, hotkey: "F4", badge: "Udhar" },
        { id: "payments", label: "Payments", icon: Receipt },
      ],
    },
    {
      title: "ANALYZE",
      items: [
        { id: "reports", label: "GST & Tax Reports", icon: FileText, hotkey: "F5", badge: "GSTR" },
        { id: "analytics", label: "Sales Analytics", icon: PieChart },
      ],
    },
    {
      title: "ADMIN",
      items: [
        { id: "profile", label: "Company Profile", icon: Building2, badge: "Master" },
        { id: "approvals", label: "Approvals", icon: ShieldCheck },
        { id: "users", label: "Users & Roles", icon: UserCheck },
        { id: "settings", label: "Settings", icon: Settings, hotkey: "F6" },
        { id: "audit", label: "Audit Logs", icon: History },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen bg-(--color-bg-page) text-(--color-text-primary) font-sans overflow-hidden select-none">
      {/* FIRST-TIME STORE ONBOARDING WIZARD */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onComplete={(p) => {
          setStoreProfile(p);
          setOnboardingOpen(false);
        }}
        onSkip={() => setOnboardingOpen(false)}
      />

      {/* UNIVERSAL COMMAND PALETTE (CTRL+K) */}
      <UniversalCommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* 1. COLLAPSIBLE SIDEBAR (240px / 64px) */}
      <aside
        className={`bg-(--color-bg-surface) border-r border-(--color-border-default) flex flex-col justify-between transition-all duration-200 ease-in-out z-(--z-sticky) ${
          sidebarExpanded ? "w-[240px]" : "w-[64px]"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* SIDEBAR BRAND HEADER */}
          <div className="h-14 border-b border-(--color-border-default) flex items-center justify-between px-3.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-md bg-(--color-action-primary) flex items-center justify-center font-bold text-white shadow-xs shrink-0">
                ⚡
              </div>
              {sidebarExpanded && (
                <div className="flex flex-col leading-none truncate" title={storeProfile?.name || "Enterprise OS"}>
                  <span className="font-semibold text-sm text-(--color-text-primary) tracking-tight truncate">
                    {storeProfile?.name || "Enterprise OS"}
                  </span>
                  <span className="text-[11px] text-(--color-text-muted) font-mono mt-0.5">
                    v{health?.version || "0.1.0"}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-1 rounded-sm text-(--color-text-secondary) hover:bg-(--color-bg-subtle) transition-colors cursor-pointer"
              title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {sidebarExpanded ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* CATEGORIZED NAVIGATION LIST */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
            {navigationSections.map((section) => (
              <div key={section.title} className="space-y-1">
                {sidebarExpanded && (
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-(--color-text-muted) tracking-wider uppercase font-mono">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full h-9 flex items-center cursor-pointer ${
                        sidebarExpanded ? "justify-between px-2.5" : "justify-center px-0"
                      } rounded-md text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-(--color-action-primary-subtle) text-(--color-action-primary-text) font-semibold"
                          : "text-(--color-text-secondary) hover:bg-(--color-bg-subtle) hover:text-(--color-text-primary)"
                      }`}
                      title={`${item.label}${item.hotkey ? ` (${item.hotkey})` : ""}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isActive
                              ? "text-(--color-action-primary)"
                              : "text-(--color-text-secondary)"
                          }`}
                        />
                        {sidebarExpanded && (
                          <span className="truncate" title={item.label}>
                            {item.label}
                          </span>
                        )}
                      </div>

                      {sidebarExpanded && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-(--color-action-primary-subtle) text-(--color-action-primary-text)">
                              {item.badge}
                            </span>
                          )}
                          {item.hotkey && (
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono ${
                                isActive
                                  ? "bg-(--primitive-blue-100) text-(--color-action-primary-text) font-bold"
                                  : "bg-(--primitive-gray-100) text-(--color-text-muted)"
                              }`}
                            >
                              {item.hotkey}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* BOTTOM DATABASE / SYSTEM STATUS */}
          {sidebarExpanded && (
            <div className="p-3 border-t border-(--color-border-default) bg-(--color-bg-page) text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-(--color-text-secondary)">
                  SQLite Core Engine
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      ping?.connected ? "bg-(--color-success)" : "bg-(--color-warning)"
                    }`}
                  />
                  <span className="text-[10px] font-mono text-(--color-text-primary) font-semibold">
                    {ping?.connected ? `${ping.latency_ms}ms` : "Offline"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-(--color-text-muted) font-mono">
                <span>WAL: {health?.wal_mode_active ? "Active" : "Off"}</span>
                <span>Tables: {ping?.tables_count ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN CONTAINER & TOP BAR */}
      <main className="flex-1 flex flex-col overflow-hidden bg-(--color-bg-page)">
        {/* TOP BAR (56px -> h-14) */}
        <header className="h-14 border-b border-(--color-border-default) bg-(--color-bg-surface) px-6 flex items-center justify-between z-(--z-sticky) shadow-xs">
          {/* LEFT: STORE & FINANCIAL YEAR */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-2 px-3 py-1 bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) border border-(--color-border-default) rounded-md text-[13px] transition-colors cursor-pointer"
              title="Click to view/edit Company Profile & Branding"
            >
              <Building2 className="w-3.5 h-3.5 text-(--color-action-primary)" />
              <span className="font-semibold text-(--color-text-primary) truncate max-w-xs">
                {storeProfile?.name || "Main Retail Store"}
              </span>
              <span className="text-[10px] font-mono text-(--color-text-muted)">
                ({storeProfile?.code || "STORE-01"})
              </span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-(--color-bg-subtle) border border-(--color-border-default) rounded-md text-xs font-mono">
              <span className="text-(--color-text-muted)">FY:</span>
              <span className="text-(--color-action-primary) font-bold">
                {storeProfile?.financial_year || "2026-2027"}
              </span>
            </div>
          </div>

          {/* RIGHT: SEARCH, OFFLINE STATUS & SHORTCUT HELPER */}
          <div className="flex items-center gap-3">
            {/* COMMAND PALETTE TRIGGER */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-[13px] text-(--color-text-muted) cursor-pointer hover:border-(--color-border-strong) transition-colors"
              title="Universal Search (Ctrl+K)"
            >
              <Command className="w-3.5 h-3.5 text-(--color-action-primary)" />
              <span>Universal Search</span>
              <kbd className="px-1.5 py-0.5 bg-(--color-bg-subtle) rounded-sm text-[10px] font-mono text-(--color-text-secondary) border border-(--color-border-default)">
                Ctrl+K
              </kbd>
            </button>

            {/* SYNC / OFFLINE STATUS BADGE */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-(--color-success-bg) border border-(--primitive-success-600)/20 rounded-md text-xs text-(--color-success-dark) font-medium">
              <Wifi className="w-3.5 h-3.5 text-(--color-success)" />
              <span>Online · Local Zero-Latency</span>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT BODY */}
        <section className="flex-1 p-4 overflow-hidden flex flex-col">
          {loading ? (
            <div className="h-full flex items-center justify-center text-(--color-text-muted) gap-2">
              <div className="animate-spin h-5 w-5 border-2 border-(--color-action-primary) border-t-transparent rounded-full" />
              <span>Initializing Native SQLite Engine...</span>
            </div>
          ) : activeTab === "pos" ? (
            <PosBillingScreen />
          ) : activeTab === "wholesale" ? (
            <WholesaleOrderDesk />
          ) : activeTab === "inventory" ? (
            <ProductMaster />
          ) : activeTab === "credit" ? (
            <KhataLedgerScreen />
          ) : activeTab === "reports" ? (
            <GstReportScreen />
          ) : activeTab === "profile" ? (
            <CompanyProfileScreen onProfileUpdated={(p) => setStoreProfile(p)} />
          ) : (
            <div className="max-w-5xl mx-auto space-y-6 overflow-y-auto w-full py-4">
              {/* DEFAULT MODULE VIEW */}
              <div className="p-6 rounded-lg bg-(--color-bg-surface) border border-(--color-border-default) shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-(--color-action-primary-subtle) text-(--color-action-primary-text) border border-(--primitive-blue-200)">
                        Module Active
                      </span>
                      <span className="text-(--color-success) text-xs flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> High-Speed Local Engine
                      </span>
                    </div>
                    <h1 className="text-2xl font-semibold text-(--color-text-primary) tracking-tight">
                      Enterprise Retail & Wholesale Management System
                    </h1>
                    <p className="text-sm text-(--color-text-secondary) max-w-2xl leading-relaxed">
                      Press <strong className="text-(--color-text-primary)">F1 for Retail POS</strong>, <strong className="text-(--color-text-primary)">F2 for Wholesale Desk</strong>, <strong className="text-(--color-text-primary)">F3 for Products</strong>, <strong className="text-(--color-text-primary)">F4 for Khata</strong>, or <strong className="text-(--color-text-primary)">F5 for GST Reports</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

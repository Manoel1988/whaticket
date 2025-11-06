import { WhereOptions } from "sequelize";
import { differenceInCalendarDays, endOfDay, format, isBefore, parseISO, startOfDay, startOfMonth } from "date-fns";

import Invoices from "../../models/Invoices";

interface SalesDashboardParams {
  companyId: number;
  dateFrom?: string;
  dateTo?: string;
}

interface SummaryMetrics {
  totalInvoices: number;
  paidInvoices: number;
  openInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  paidRevenue: number;
  openRevenue: number;
  overdueRevenue: number;
  averageTicket: number;
  collectionRate: number;
}

interface MonthlyEntry {
  month: string;
  total: number;
  paid: number;
  open: number;
  overdue: number;
}

interface DailyEntry {
  date: string;
  total: number;
  paid: number;
  open: number;
  overdue: number;
}

interface StatusEntry {
  status: string;
  count: number;
  value: number;
}

interface InvoiceHighlight {
  id: number;
  detail: string | null;
  status: string;
  value: number;
  dueDate: string | null;
  dueInDays: number | null;
}

export interface SalesDashboardResponse {
  summary: SummaryMetrics;
  monthlySeries: MonthlyEntry[];
  dailySeries: DailyEntry[];
  statusSeries: StatusEntry[];
  upcomingInvoices: InvoiceHighlight[];
  overdueInvoices: InvoiceHighlight[];
  filters: { dateFrom?: string; dateTo?: string };
  lastUpdated: string;
}

type InvoiceAttributes = {
  id: number;
  detail: string | null;
  status: string | null;
  value: number | string | null;
  dueDate: string | Date | null;
  createdAt: string | Date;
};

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value;
  }

  let parsed: Date;

  try {
    parsed = parseISO(value);
  } catch (error) {
    parsed = new Date(value);
  }

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const normalizeStatus = (status: string | null | undefined): string => {
  const normalized = (status || "").toLowerCase();

  if (["paid", "pago"].includes(normalized)) {
    return "paid";
  }

  if (["cancelled", "canceled", "cancelado"].includes(normalized)) {
    return "cancelled";
  }

  return "open";
};

const SalesDashboardService = async (
  params: SalesDashboardParams
): Promise<SalesDashboardResponse> => {
  const { companyId, dateFrom, dateTo } = params;

  const where: WhereOptions = {
    companyId
  };

  const invoices = (await Invoices.findAll({
    where,
    raw: true
  })) as InvoiceAttributes[];

  const minDate = dateFrom ? startOfDay(new Date(dateFrom)) : null;
  const maxDate = dateTo ? endOfDay(new Date(dateTo)) : null;

  const filteredInvoices = invoices.filter(invoice => {
    const referenceDate = toDate(invoice.dueDate) || toDate(invoice.createdAt);

    if (!referenceDate) {
      return true;
    }

    if (minDate && referenceDate < minDate) {
      return false;
    }

    if (maxDate && referenceDate > maxDate) {
      return false;
    }

    return true;
  });

  const summary: SummaryMetrics = {
    totalInvoices: 0,
    paidInvoices: 0,
    openInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    openRevenue: 0,
    overdueRevenue: 0,
    averageTicket: 0,
    collectionRate: 0
  };

  const monthlyMap = new Map<string, MonthlyEntry>();
  const dailyMap = new Map<string, DailyEntry>();
  const statusMap = new Map<string, StatusEntry>();
  const upcoming: InvoiceHighlight[] = [];
  const overdue: InvoiceHighlight[] = [];

  const now = startOfDay(new Date());

  filteredInvoices.forEach(invoice => {
    const value = toNumber(invoice.value);
    const dueDate = toDate(invoice.dueDate);
    const createdAt = toDate(invoice.createdAt) || dueDate;
    const status = normalizeStatus(invoice.status);

    summary.totalInvoices += 1;
    summary.totalRevenue += value;

    const isPaid = status === "paid";
    const isCancelled = status === "cancelled";
    const isOverdue = !isPaid && !isCancelled && dueDate ? isBefore(dueDate, now) : false;

    if (isPaid) {
      summary.paidInvoices += 1;
      summary.paidRevenue += value;
    } else if (!isCancelled) {
      summary.openInvoices += 1;
      summary.openRevenue += value;
      if (isOverdue) {
        summary.overdueInvoices += 1;
        summary.overdueRevenue += value;
      }
    }

    const monthReference = dueDate || createdAt;
    if (monthReference) {
      const monthKey = format(startOfMonth(monthReference), "yyyy-MM");
      const monthly =
        monthlyMap.get(monthKey) ||
        ({ month: monthKey, total: 0, paid: 0, open: 0, overdue: 0 } as MonthlyEntry);

      monthly.total += value;
      if (isPaid) {
        monthly.paid += value;
      } else if (isOverdue) {
        monthly.overdue += value;
      } else if (!isCancelled) {
        monthly.open += value;
      }

      monthlyMap.set(monthKey, monthly);
    }

    const dailyReference = dueDate || createdAt;
    if (dailyReference) {
      const dayKey = format(dailyReference, "yyyy-MM-dd");
      const daily =
        dailyMap.get(dayKey) ||
        ({ date: dayKey, total: 0, paid: 0, open: 0, overdue: 0 } as DailyEntry);

      daily.total += value;
      if (isPaid) {
        daily.paid += value;
      } else if (isOverdue) {
        daily.overdue += value;
      } else if (!isCancelled) {
        daily.open += value;
      }

      dailyMap.set(dayKey, daily);
    }

    const statusKey = isCancelled ? "cancelled" : isPaid ? "paid" : isOverdue ? "overdue" : "open";
    const statusEntry =
      statusMap.get(statusKey) || ({ status: statusKey, count: 0, value: 0 } as StatusEntry);

    statusEntry.count += 1;
    statusEntry.value += value;
    statusMap.set(statusKey, statusEntry);

    if (!isPaid && !isCancelled) {
      const dueInDays = dueDate ? differenceInCalendarDays(dueDate, now) : null;
      const highlight: InvoiceHighlight = {
        id: invoice.id,
        detail: invoice.detail,
        status: isOverdue ? "overdue" : "open",
        value,
        dueDate: dueDate ? dueDate.toISOString() : null,
        dueInDays
      };

      if (isOverdue) {
        overdue.push(highlight);
      } else {
        upcoming.push(highlight);
      }
    }
  });

  summary.averageTicket = summary.totalInvoices > 0 ? summary.totalRevenue / summary.totalInvoices : 0;
  summary.collectionRate = summary.totalRevenue > 0 ? summary.paidRevenue / summary.totalRevenue : 0;

  const monthlySeries = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  const dailySeries = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const statusSeries = Array.from(statusMap.values()).sort((a, b) => b.value - a.value);

  const upcomingInvoices = upcoming
    .sort((a, b) => {
      if (a.dueInDays === null) return 1;
      if (b.dueInDays === null) return -1;
      return a.dueInDays - b.dueInDays;
    })
    .slice(0, 6);

  const overdueInvoices = overdue
    .sort((a, b) => {
      if (a.dueInDays === null) return 1;
      if (b.dueInDays === null) return -1;
      return a.dueInDays - b.dueInDays;
    })
    .slice(0, 6);

  return {
    summary,
    monthlySeries,
    dailySeries,
    statusSeries,
    upcomingInvoices,
    overdueInvoices,
    filters: {
      dateFrom,
      dateTo
    },
    lastUpdated: new Date().toISOString()
  };
};

export default SalesDashboardService;


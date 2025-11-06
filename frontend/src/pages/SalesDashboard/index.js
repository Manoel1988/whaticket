import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

import FilterListIcon from "@material-ui/icons/FilterList";
import RefreshIcon from "@material-ui/icons/Refresh";
import MonetizationOnIcon from "@material-ui/icons/MonetizationOn";
import PaymentIcon from "@material-ui/icons/Payment";
import TimelapseIcon from "@material-ui/icons/Timelapse";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";

import useSalesDashboard from "../../hooks/useSalesDashboard";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(3),
    ...theme.scrollbarStyles
  },
  paper: {
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 2,
    height: "100%"
  },
  filterPaper: {
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 2
  },
  buttonGroup: {
    width: "100%",
    [theme.breakpoints.down("xs")]: {
      display: "flex",
      flexDirection: "column"
    }
  },
  quickButton: {
    flex: 1
  },
  cardsContainer: {
    marginTop: theme.spacing(2)
  },
  card: {
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 2,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardValue: {
    marginTop: theme.spacing(1),
    fontWeight: 700
  },
  cardSubText: {
    marginTop: theme.spacing(0.5),
    color: theme.palette.text.secondary
  },
  chartWrapper: {
    width: "100%",
    height: 340
  },
  tableWrapper: {
    overflowX: "auto"
  },
  tableTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1)
  },
  statusChip: {
    display: "inline-block",
    padding: theme.spacing(0.5, 1.5),
    borderRadius: theme.shape.borderRadius,
    textTransform: "uppercase",
    fontSize: "0.75rem",
    fontWeight: 600
  },
  statusOpen: {
    backgroundColor: theme.palette.info.light,
    color: theme.palette.info.contrastText
  },
  statusOverdue: {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: "center",
    color: theme.palette.text.secondary
  }
}));

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(value || 0);

const formatPercentage = (value) => `${(value * 100).toFixed(1)}%`;

const STATUS_LABELS = {
  paid: "Pagas",
  open: "Em Aberto",
  overdue: "Vencidas",
  cancelled: "Canceladas"
};

const STATUS_COLORS = {
  paid: "#4caf50",
  open: "#2196f3",
  overdue: "#f44336",
  cancelled: "#9e9e9e"
};

const SalesDashboard = () => {
  const classes = useStyles();
  const {
    data: dashboard,
    loading,
    fetchDashboard
  } = useSalesDashboard();

  const defaultFrom = moment().subtract(89, "days").format("YYYY-MM-DD");
  const defaultTo = moment().format("YYYY-MM-DD");

  const [filters, setFilters] = useState({
    dateFrom: defaultFrom,
    dateTo: defaultTo
  });

  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchDashboard(filters);
      } catch (err) {
        toastError(err);
      } finally {
        setInitialLoad(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field) => (event) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleQuickRange = async (days) => {
    const dateFrom = moment().subtract(days - 1, "days").format("YYYY-MM-DD");
    const dateTo = moment().format("YYYY-MM-DD");
    const newFilters = { dateFrom, dateTo };
    setFilters(newFilters);

    try {
      await fetchDashboard(newFilters);
    } catch (err) {
      toastError(err);
    }
  };

  const handleApplyFilters = async () => {
    try {
      await fetchDashboard(filters);
      toast.success("Dashboard atualizado com sucesso");
    } catch (err) {
      toastError(err);
    }
  };

  const handleResetFilters = async () => {
    const newFilters = { dateFrom: defaultFrom, dateTo: defaultTo };
    setFilters(newFilters);

    try {
      await fetchDashboard(newFilters);
    } catch (err) {
      toastError(err);
    }
  };

  const summary = dashboard?.summary || {
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

  const summaryCards = useMemo(
    () => [
      {
        title: "Faturamento Total",
        value: formatCurrency(summary.totalRevenue),
        subtitle: `${summary.totalInvoices} faturas`,
        icon: <MonetizationOnIcon color="primary" />
      },
      {
        title: "Receita Recebida",
        value: formatCurrency(summary.paidRevenue),
        subtitle: `${summary.paidInvoices} faturas pagas`,
        icon: <PaymentIcon style={{ color: "#4caf50" }} />
      },
      {
        title: "Receita em Aberto",
        value: formatCurrency(summary.openRevenue),
        subtitle: `${summary.openInvoices} faturas`,
        icon: <TimelapseIcon color="secondary" />
      },
      {
        title: "Ticket Médio",
        value: formatCurrency(summary.averageTicket),
        subtitle: `Taxa de recebimento ${formatPercentage(summary.collectionRate || 0)}`,
        icon: <TrendingUpIcon style={{ color: "#ff9800" }} />
      }
    ],
    [summary]
  );

  const monthlySeries = useMemo(() => {
    if (!dashboard?.monthlySeries?.length) return [];

    return dashboard.monthlySeries.map((item) => ({
      ...item,
      label: moment(item.month, "YYYY-MM").format("MMM/YY")
    }));
  }, [dashboard]);

  const dailySeries = useMemo(() => {
    if (!dashboard?.dailySeries?.length) return [];

    return dashboard.dailySeries.map((item) => ({
      ...item,
      label: moment(item.date, "YYYY-MM-DD").format("DD/MM")
    }));
  }, [dashboard]);

  const statusSeries = useMemo(() => {
    if (!dashboard?.statusSeries?.length) return [];

    return dashboard.statusSeries
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        label: STATUS_LABELS[item.status] || item.status
      }));
  }, [dashboard]);

  const upcomingInvoices = dashboard?.upcomingInvoices || [];
  const overdueInvoices = dashboard?.overdueInvoices || [];

  const renderStatusChip = (status) => {
    const label = STATUS_LABELS[status] || status;
    const className = status === "overdue" ? classes.statusOverdue : classes.statusOpen;

    return (
      <span className={`${classes.statusChip} ${className}`}>
        {label}
      </span>
    );
  };

  const renderInvoicesTable = (title, invoices) => (
    <Paper className={classes.paper} elevation={1}>
      <Typography variant="h6" className={classes.tableTitle} gutterBottom>
        {title}
      </Typography>
      <Divider />
      {invoices.length === 0 ? (
        <div className={classes.emptyState}>
          <Typography variant="body2">Nenhuma fatura encontrada no período.</Typography>
        </div>
      ) : (
        <div className={classes.tableWrapper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fatura</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell align="center">Vencimento</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Dias</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>#{invoice.id}</TableCell>
                  <TableCell>{invoice.detail || "-"}</TableCell>
                  <TableCell align="right">{formatCurrency(invoice.value)}</TableCell>
                  <TableCell align="center">
                    {invoice.dueDate ? moment(invoice.dueDate).format("DD/MM/YYYY") : "-"}
                  </TableCell>
                  <TableCell align="center">{renderStatusChip(invoice.status)}</TableCell>
                  <TableCell align="center">
                    {invoice.dueInDays === null
                      ? "-"
                      : invoice.dueInDays >= 0
                      ? `${invoice.dueInDays} dias`
                      : `${Math.abs(invoice.dueInDays)} dias em atraso`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Paper>
  );

  return (
    <MainContainer>
      <div className={classes.root}>
        <MainHeader>
          <Title>Dashboard de Vendas</Title>
        </MainHeader>
        <div className={classes.content}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper className={classes.filterPaper} elevation={1}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Data inicial"
                      type="date"
                      value={filters.dateFrom}
                      onChange={handleInputChange("dateFrom")}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Data final"
                      type="date"
                      value={filters.dateTo}
                      onChange={handleInputChange("dateTo")}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <ButtonGroup color="primary" className={classes.buttonGroup} variant="outlined">
                      {[30, 60, 90].map((days) => (
                        <Button
                          key={days}
                          onClick={() => handleQuickRange(days)}
                          className={classes.quickButton}
                        >
                          Últimos {days} dias
                        </Button>
                      ))}
                    </ButtonGroup>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          color="primary"
                          variant="contained"
                          onClick={handleApplyFilters}
                          startIcon={<FilterListIcon />}
                          disabled={loading}
                        >
                          Aplicar
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button
                          fullWidth
                          color="default"
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={handleResetFilters}
                          disabled={loading}
                        >
                          Limpar
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {loading && initialLoad ? (
              <Grid item xs={12} style={{ textAlign: "center" }}>
                <CircularProgress />
              </Grid>
            ) : null}

            {!loading && dashboard && (
              <>
                <Grid item xs={12} className={classes.cardsContainer}>
                  <Grid container spacing={3}>
                    {summaryCards.map((card) => (
                      <Grid item xs={12} sm={6} md={3} key={card.title}>
                        <Paper className={classes.card} elevation={1}>
                          <div className={classes.cardHeader}>
                            <Typography variant="subtitle2" color="textSecondary">
                              {card.title}
                            </Typography>
                            {card.icon}
                          </div>
                          <Typography className={classes.cardValue} variant="h5">
                            {card.value}
                          </Typography>
                          <Typography className={classes.cardSubText} variant="caption">
                            {card.subtitle}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Paper className={classes.paper} elevation={1}>
                    <Typography variant="h6" gutterBottom>
                      Faturamento por mês
                    </Typography>
                    <Divider />
                    <div className={classes.chartWrapper}>
                      {monthlySeries.length === 0 ? (
                        <div className={classes.emptyState}>
                          <Typography variant="body2">
                            Não há registros suficientes para o período selecionado.
                          </Typography>
                        </div>
                      ) : (
                        <ResponsiveContainer>
                          <BarChart data={monthlySeries}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis tickFormatter={(value) => formatCurrency(value)} width={120} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="paid" stackId="a" fill={STATUS_COLORS.paid} name="Pagas" />
                            <Bar dataKey="open" stackId="a" fill={STATUS_COLORS.open} name="Em Aberto" />
                            <Bar dataKey="overdue" stackId="a" fill={STATUS_COLORS.overdue} name="Vencidas" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper className={classes.paper} elevation={1}>
                    <Typography variant="h6" gutterBottom>
                      Distribuição por status
                    </Typography>
                    <Divider />
                    <div className={classes.chartWrapper}>
                      {statusSeries.length === 0 ? (
                        <div className={classes.emptyState}>
                          <Typography variant="body2">
                            Não há dados para exibir.
                          </Typography>
                        </div>
                      ) : (
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={statusSeries}
                              dataKey="value"
                              nameKey="label"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label
                            >
                              {statusSeries.map((entry) => (
                                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#8884d8"} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper className={classes.paper} elevation={1}>
                    <Typography variant="h6" gutterBottom>
                      Evolução diária do faturamento
                    </Typography>
                    <Divider />
                    <div className={classes.chartWrapper}>
                      {dailySeries.length === 0 ? (
                        <div className={classes.emptyState}>
                          <Typography variant="body2">
                            Selecione um período com registros para acompanhar a evolução diária.
                          </Typography>
                        </div>
                      ) : (
                        <ResponsiveContainer>
                          <AreaChart data={dailySeries}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis tickFormatter={(value) => formatCurrency(value)} width={120} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Area type="monotone" dataKey="paid" stroke={STATUS_COLORS.paid} fill={STATUS_COLORS.paid} name="Pagas" fillOpacity={0.3} />
                            <Area type="monotone" dataKey="open" stroke={STATUS_COLORS.open} fill={STATUS_COLORS.open} name="Em Aberto" fillOpacity={0.2} />
                            <Area type="monotone" dataKey="overdue" stroke={STATUS_COLORS.overdue} fill={STATUS_COLORS.overdue} name="Vencidas" fillOpacity={0.2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  {renderInvoicesTable("Próximas faturas", upcomingInvoices)}
                </Grid>
                <Grid item xs={12} md={6}>
                  {renderInvoicesTable("Faturas em atraso", overdueInvoices)}
                </Grid>
              </>
            )}

            {loading && !initialLoad && (
              <Grid item xs={12} style={{ textAlign: "center" }}>
                <CircularProgress size={28} />
              </Grid>
            )}
          </Grid>
        </div>
      </div>
    </MainContainer>
  );
};

export default SalesDashboard;


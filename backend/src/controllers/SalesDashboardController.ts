import { Request, Response } from "express";

import SalesDashboardService from "../services/InvoicesService/SalesDashboardService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { dateFrom, dateTo } = req.query;

  const dashboard = await SalesDashboardService({
    companyId,
    dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
    dateTo: typeof dateTo === "string" ? dateTo : undefined
  });

  return res.status(200).json(dashboard);
};

export default { index };


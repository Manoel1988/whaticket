import { Router } from "express";

import * as SalesDashboardController from "../controllers/SalesDashboardController";
import isAuth from "../middleware/isAuth";

const salesRoutes = Router();

salesRoutes.get("/sales/dashboard", isAuth, SalesDashboardController.index);

export default salesRoutes;


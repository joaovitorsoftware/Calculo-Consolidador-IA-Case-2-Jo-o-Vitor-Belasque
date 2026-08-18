import { Router, type IRouter } from "express";
import calculoRouter from "./calculo";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(calculoRouter);

export default router;

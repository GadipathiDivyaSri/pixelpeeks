import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stegRouter from "./steganography";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(stegRouter);

export default router;

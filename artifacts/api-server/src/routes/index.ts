import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stegRouter from "./steganography";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stegRouter);

export default router;

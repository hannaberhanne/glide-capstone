import express from "express";
import { getQuote } from "../controllers/quotesController.js";

const router = express.Router();

router.get("/", getQuote);

export default router;
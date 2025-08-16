import { Router } from "express";
import { registerUser } from "../controllers/userRegister.controller.js";

const router = Router()

router.route("/register").post(registerUser)

export default router
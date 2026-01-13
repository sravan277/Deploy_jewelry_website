import express from 'express';
import { register, login } from "../controller/controller.auth.js";
import { registerValidate, loginValidate } from "../middleware/Validate.js";

const router = express.Router();

router.post('/register' , registerValidate, register);
router.post('/login' , loginValidate, login);

export default router;
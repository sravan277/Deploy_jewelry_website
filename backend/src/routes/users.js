import express from 'express';
import { auth } from '../middleware/auth.js';
import { fetchuser, updateuser, deleteuser } from '../controller/controller.user.js';

const router = express.Router()

router.get("/me", auth, fetchuser);
router.patch("/me", auth, updateuser);
router.delete("/me", auth, deleteuser);

export default router;

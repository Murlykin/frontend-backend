const express = require("express");



const ctrlWrapper  = require("../../controllers/auth-controllers");

const {authenticate} = require("../../middlewares");

const {schemas} = require("../../models/user");

const {validateBody} = require("../../utils");

const router = express.Router();

// signup
router.post("/register", validateBody(schemas.userRegisterSchema), ctrlWrapper.register);

// signin
router.post("/login", validateBody(schemas.userLoginSchema), ctrlWrapper.login);

router.get("/current", authenticate, ctrlWrapper.getCurrent);

router.post("/logout", authenticate, ctrlWrapper.logout);

router.get("/verify/:verificationToken", ctrlWrapper.verifyEmail);

router.post('/verify', ctrlWrapper.resendEmail);

module.exports = router;
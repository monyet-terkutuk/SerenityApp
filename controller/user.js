const express = require("express");
const User = require("../model/user");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const { sendMail, sendMailForgotPW } = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const Validator = require("fastest-validator");
const v = new Validator();
const bcrypt = require('bcrypt');

// User register
router.post("/register", async (req, res, next) => {
  const userSchema = {
    name: { type: "string", empty: false, max: 255 },
    image: { type: "string", optional: true, max: 255 },
    email: { type: "email", empty: false },
    password: { type: "string", min: 8, empty: false },
    role: { type: "string", optional: true, max: 255 },
    unitWork: { type: "string", optional: true, max: 255 },
  };

  const { body } = req;

  // validation input data
  const validationResponse = v.validate(body, userSchema);

  if (validationResponse !== true) {
    return res.status(400).json({
      code: 400,
      status: "error",
      data: {
        error: "Validation failed",
        details: validationResponse,
      },
    });
  }

  const isEmailUsed = await User.findOne({ email: body.email });

  if (isEmailUsed) {
    return res.status(400).json({
      code: 400,
      status: "error",
      data: {
        error: "Email has been used",
      },
    });
  }

  const password = bcrypt.hashSync(body.password, 10);

  try {
    const user = await User.create({ ...body, password });
    return res.json({
      code: 200,
      status: "success",
      data: { 
        guid: user.guid,
        name: user.name,
        image: user.image,
        address: user.address,
        role: user.role,
        email: user.email,
       },
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      status: "error",
      data: error.message,
    });
  }
});


// User login
router.post("/login", async (req, res, next) => {
  const { body } = req;

  const loginSchema = {
    email: { type: "email", empty: false },
    password: { type: "string", min: 8, empty: false },
  };

  // Validasi input
  const validationResponse = v.validate(body, loginSchema);

  if (validationResponse !== true) {
    return res.status(400).json({
      meta: {
        message: "Validation failed",
        code: 400,
        status: "error",
      },
      data: validationResponse,
    });
  }

  try {
    const user = await User.findOne({ email: body.email });

    console.log("ini user", user)

    if (!user || !user.password) {
      return res.status(401).json({
        meta: {
          message: "User not found.",
          code: 401,
          status: "error",
        },
        data: null,
      });
    }

    const isPasswordCorrect = bcrypt.compareSync(body.password, user.password);
    console.log("valid pw: ", isPasswordCorrect)
    console.log("body.password pw: ", body.password)
    console.log("user.password pw: ", user.password)
    if (!isPasswordCorrect) {
      return res.status(401).json({
        meta: {
          message: "Authentication failed. Please ensure your email and password are correct.",
          code: 401,
          status: "error",
        },
        data: null,
      });
    }

    const payload = {
      guid: user.guid,
      role: user.role,
    };

    const secret = process.env.JWT_SECRET_KEY;
    console.log("rahasia", secret)
    const expiresIn = "1h"; // Use "1h" for 1 hour expiration

    const token = jwt.sign(payload, secret, { expiresIn: expiresIn });

    return res.status(200).json({
      meta: {
        message: "Authentication successful",
        code: 200,
        status: "success",
      },
      data: {
        guid: user.guid,
        name: user.name,
        image: user.image,
        address: user.address,
        role: user.role,
        email: user.email,
        token: token,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      meta: {
        message: "Internal Server Error",
        code: 500,
        status: "error",
      },
      data: error.message,
    });
  }
});

module.exports = router;

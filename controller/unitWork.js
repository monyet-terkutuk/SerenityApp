const express = require("express");
const User = require("../model/user");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const UnitWork = require('../model/unitWork');
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const Validator = require("fastest-validator");
const v = new Validator();
const bcrypt = require('bcrypt');

// Create unit work
router.post("",isAuthenticated, catchAsyncErrors(async (req, res, next) => {
    try {
      const unitWorkSchema = {
        name: { type: "string", empty: false, max: 255 },
        image: { type: "array", items: "string", optional: true },
        detail: { type: "string", empty: false, max: 255 },
      };
  
      const { body } = req;
  
      // validation input data
      const validationResponse = v.validate(body, unitWorkSchema);
  
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
  
      try {
        const unit = await UnitWork.create(body);
        return res.json({
          code: 200,
          status: "success",
          data: { 
            id: unit._id,
            name: unit.name,
            image: unit.image,
            detail: unit.detail,
          },
        });
      } catch (error) {
        return res.status(500).json({
          code: 500,
          status: "error",
          data: error.message,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
}));

// User login
router.post("/login", async (req, res, next) => {
  try{
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
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});


router.get(
  "/list",
  isAuthenticated,
  // isAdmin("admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const unitWork = await UnitWork.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        unitWork,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


router.post(
    "/",
    isAuthenticated,
    isAdmin("admin"),
    catchAsyncErrors(async (req, res, next) => {
      try {
        const users = await User.find().sort({
          createdAt: -1,
        });
        res.status(201).json({
          success: true,
          users,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );
  

module.exports = router;

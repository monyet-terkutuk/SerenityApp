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
const UnitWork = require('../model/unitWork');

// User register
router.post("/register", async (req, res, next) => {
  try {
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
        id : user._id,
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
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// login user
router.post("/login", async (req, res, next) => {
  const { body } = req;

  const loginSchema = {
    email: { type: "email", empty: false },
    password: { type: "string", min: 8, empty: false },
  };

  try {
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

    // Cari pengguna berdasarkan email
    const user = await User.findOne({ email: body.email });
    if (!user || !user.password) {
      return res.status(401).json({
        meta: {
          message: "Authentication failed. Please ensure your email and password are correct.",
          code: 401,
          status: "error",
        },
        data: null,
      });
    }

    // Periksa kecocokan kata sandi
    const isPasswordCorrect = bcrypt.compareSync(body.password, user.password);
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

    // Jika autentikasi berhasil, ambil unit kerja pengguna
    const unitWork = await UnitWork.findById(user.unitWork);

    // Jika autentikasi berhasil, buat token JWT
    const payload = {
      id: user._id,
      role: user.role,
      // tambahkan bidang lain yang Anda butuhkan di token JWT
    };

    const secret = process.env.JWT_SECRET_KEY;
    const expiresIn = "1h"; // Gunakan "1h" untuk token yang berlaku selama 1 jam

    const token = jwt.sign(payload, secret, { expiresIn });

    // Kirim respons sukses dengan token JWT
    return res.status(200).json({
      meta: {
        message: "Authentication successful",
        code: 200,
        status: "success",
      },
      data: {
        id: user._id,
        name: user.name,
        image: user.image,
        address: user.address,
        role: user.role,
        email: user.email,
        unitWork: unitWork ? {
          id: unitWork._id,
          name: unitWork.name,
          image: unitWork.image,
        } : null,
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

// All users
router.get(
  "/list",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({ createdAt: -1 });

      const userData = await Promise.all(users.map(async (user) => {
        const unit = await UnitWork.findById(user.unitWork);
        return {
          id: user._id,
          name: user.name,
          image: user.image,
          address: user.address,
          role: user.role,
          unitWork: unit ? {
            id: unit._id,
            name: unit.name,
          } : null,
          email: user.email,
        };
      }));

      res.status(200).json({
        meta: {
          message: "Authentication successful",
          code: 200,
          status: "success",
        },
        data: userData
      });
    } catch (error) {
      console.error("Error:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete user
router.delete(
  "/delete/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.params.id;

      // Cari dan hapus pengguna berdasarkan ID
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return res.status(404).json({
          code: 404,
          message: 'User not found',
          data: null,
        });
      }

      return res.status(200).json({
        code: 200,
        message: 'User deleted successfully',
        data: null,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
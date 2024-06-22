const { User } = require("../../../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Validator = require("fastest-validator");
const v = new Validator();

const loginSchema = {
  email: { type: "email", empty: false },
  password: { type: "string", min: 8, empty: false },
};

module.exports = async (req, res) => {
  const { body } = req;

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

    return res.status(200).json({
      meta: {
        message: "Authentication successful",
        code: 200,
        status: "success",
      },
      data: {
        data: body
      }
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
};
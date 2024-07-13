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
const Report = require('../model/reports');


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

// list unit work
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
  
// delete unit work
router.delete(
  "/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if the unit work exists
      const unitWork = await UnitWork.findById(id);
      if (!unitWork) {
        return res.status(404).json({
          success: false,
          message: "Unit work not found",
        });
      }

      // Delete related users
      await User.deleteMany({ unitWork: id });

      // Delete related reports
      await Report.deleteMany({ unitWorks: id });

      // Delete the unit work
      await UnitWork.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Unit work, related users, and reports have been deleted",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = router;

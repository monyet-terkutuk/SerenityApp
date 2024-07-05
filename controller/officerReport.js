const express = require("express");
const User = require("../model/user");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const Reports = require('../model/reports');
const OfficerReport = require('../model/officerReport');
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const Validator = require("fastest-validator");
const v = new Validator();
const bcrypt = require('bcrypt');

router.post(
  "report",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reportSchema = {
        message: { type: "string", empty: false, max: 255 },
        imageReport: { type: "string", empty: false, max: 255 }
      };

      const { body } = req;

      // validation input data
      const validationResponse = v.validate(body, reportSchema);
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

      const user = req.user;
      if (user.role === 'user') {
        return res.status(403).json({
          error: 1,
          message: 'You are not allowed to access',
        });
      }

      const id = req.params.id;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        const newOfficerReport = new OfficerReport({
          ...body,
          officer: user._id,
        });

        await newOfficerReport.save();
        const updatedReport = await Reports.findOneAndUpdate(
          { _id: id },
          { $set: { officerReport: newOfficerReport._id, officer: req.user._id, status: 'Selesai' } },
          { new: true }
        );

        if (newOfficerReport) {
          return res.json({
            status: 'ok',
            message: 'Report sent successfully',
            idReport: newOfficerReport._id,
          });
        }
      } else {
        return res.status(404).json({
          error: 1,
          message: 'Report not found',
        });
      }
    } catch (err) {
      if (err && err.name === 'ValidationError') {
        return res.status(400).json({
          error: 1,
          message: err.message,
          fields: err.errors,
        });
      }
      next(err);
    }
  })
);

module.exports = router;

const express = require("express");
const User = require("../model/user");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const Reports = require('../model/reports');
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const Validator = require("fastest-validator");
const v = new Validator();
const bcrypt = require('bcrypt');

// Create unit work

router.post(
  "",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reportSchema = {
        title: { type: "string", empty: false, max: 255 },
        longitude: { type: "string", empty: false, max: 255 },
        latitude: { type: "string", empty: false, max: 255 },
        imageReport: { type: "array", items: "string", optional: true },
        description: { type: "string", empty: false },
        address: { type: "string", empty: false },
        category: { type: "string", empty: false },
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

      const reporter = req.user._id; // Access the user ID from the request object

      try {
        const reportData = { ...body, reporter }; // Add reporter to the report data
        const reports = await Reports.create(reportData);
        return res.json({
          code: 200,
          status: "success",
          data: { 
            reports
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
  })
);

// list report
// router.get(
//   "/list",
//   isAuthenticated,
//   // isAdmin("admin"),
//   catchAsyncErrors(async (req, res, next) => {
//     try {
//       const reports = await Reports.find().sort({
//         createdAt: -1,
//       });
//       const reporter = await User.findById(reports.reporter);
//       res.status(201).json({
//         success: true,
//         reports,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   })
// );

router.get(
  "/list",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reports = await Reports.find().sort({ createdAt: -1 });

      // Ambil reporter untuk setiap laporan
      const reporters = await Promise.all(reports.map(async report => {
        // Temukan reporter berdasarkan ID
        const reporter = await User.findById(report.reporter);

        // Buat objek laporan yang diinginkan
        const formattedReport = {
          id: report._id,
          title: report.title,
          description: report.description,
          address: report.address,
          latitude: report.latitude,
          longitude: report.longitude,
          status: report.status,
          imageReport: report.imageReport,
          category: report.category,
          reporter: {
            id: reporter ? reporter._id : null,
            name: reporter ? reporter.name : 'Unknown',
          },
          comment: report.comment,
          createdAt: report.createdAt,
        };

        return formattedReport;
      }));

      res.status(200).json({
        success: true,
        reports: reporters,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = router;

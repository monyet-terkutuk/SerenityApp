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
const UnitWork = require("../model/unitWork");
const OfficerReport = require('../model/officerReport');

// Create report
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

// list all report
router.get(
  "/list",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reports = await Reports.find().sort({ createdAt: -1 }).populate({
        path: 'category',
        select: ['_id', 'name', 'image'],
      });

      // Ambil reporter, unit_work, officer_report, dan officer untuk setiap laporan
      const formattedReports = await Promise.all(reports.map(async report => {
        // Temukan reporter, unit_work, officer_report, dan officer berdasarkan ID
        const reporter = await User.findById(report.reporter);
        const unitWork = report.unitWorks ? await User.findById(report.unitWorks) : null;
        const officerReport = report.officerReport ? await User.findById(report.officerReport) : null;
        const officer = report.officer ? await User.findById(report.officer) : null;

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
          unit_work: {
            id: unitWork ? unitWork._id : null,
            name: unitWork ? unitWork.name : 'Unknown',
          },
          officer_report: {
            id: officerReport ? officerReport._id : null,
            name: officerReport ? officerReport.name : 'Unknown',
          },
          officer: {
            id: officer ? officer._id : null,
            name: officer ? officer.name : 'Unknown',
          },
          comment: report.comment,
          createdAt: report.createdAt,
        };

        return formattedReport;
      }));

      res.status(200).json({
        code: 200,
        success: true,
        data: formattedReports,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// get report by unit work
router.get(
  "/unit-work/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
  try {
    let { limit = 8, skip = 0, q = '', status = '' } = req.query;

    let criteria = {
      unitWorks: req.params.id,
      status: 'Diproses',
    };
    if (q.length || status.length) {
      criteria = {
        ...criteria,
        title: { $regex: `${q}`, $options: 'i' },
      };
    }
    const count = await Reports.find(criteria).countDocuments();
    const report = await Reports.find(criteria)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate({
        path: 'comment',
        select: ['message', 'name'],
      })
      .populate({
        path: 'category',
        select: ['_id', 'name', 'image'],
      })
      .select(
        '_id title status description imageReport unitWorks createdAt address -comment ',
      );
    if (report) {
      res.json({
        status: 'ok',
        count,
        data: report,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
})
);

// assign report
router.post(
  "/assign",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reportSchema = {
        report_id: { type: "string", empty: false, max: 255 },
        unit_work_id: { type: "string", empty: false, max: 255 },
      };

      const { report_id, unit_work_id } = req.body;

      // Validasi input data
      const validationResponse = v.validate({ report_id, unit_work_id }, reportSchema);

      if (validationResponse.error) {
        return res.status(400).json({
          code: 400,
          status: "error",
          data: {
            error: "Validation failed",
            details: validationResponse.error.details,
          },
        });
      }

      const report = await Reports.findOneAndUpdate(
        { _id: report_id }, // Mencari berdasarkan report_id yang sesuai
        { $set: { unitWorks: unit_work_id, status: 'Diproses' } }, // Memperbarui unitWorks dan status
        { new: true } // Opsional, untuk mendapatkan dokumen yang diperbarui
      );

      if (!report) {
        return res.status(404).json({
          code: 404,
          message: 'Report not found',
          data: null,
        });
      }

      return res.json({
        code: 200,
        message: 'Unit work has been assigned successfully',
        data: { report },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        code: 500,
        status: "error",
        data: error.message,
      });
    }
  })
);

// get report by user id
router.get( 
  "/user/:user_id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let { limit = 8, skip = 0, q = '', status = '' } = req.query;
      let criteria = {
        reporter: req.params.user_id, // Menggunakan req.params.user_id untuk pencarian berdasarkan user_id
      };

      if (q.length) {
        criteria = {
          ...criteria,
          title: { $regex: `${q}`, $options: 'i' },
        };
      }

      if (status.length) {
        criteria = {
          ...criteria,
          status: status,
        };
      }

      const count = await Reports.find(criteria).countDocuments();

      const report = await Reports.find(criteria)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate({
          path: 'comment',
          select: ['message', 'name'],
        })
        .populate({
          path: 'category',
          select: ['_id', 'name', 'image'],
        })
        .select('_id title status description imageReport unitWorks createdAt address');

      if (report.length > 0) { // Periksa apakah ada report yang ditemukan
        return res.json({
          status: 'ok',
          count,
          data: report,
        });
      } else {
        return res.status(404).json({
          code: 404,
          message: 'No reports found',
          data: null,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        code: 500,
        status: "error",
        data: error.message,
      });
    }
  })
);

// get report by id
router.get(
  "/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reportId = req.params.id;

      // Menggunakan populate untuk mengambil data terkait
      const report = await Reports.findById(reportId)
        .populate({
          path: 'comment',
          select: ['message', 'name', 'createdAt'],
        })
        .populate({
          path: 'reporter',
          select: ['_id', 'name'],
        })
        .populate({
          path: 'category',
          select: ['_id', 'name', 'image'],
        })
        .populate({
          path: 'unitWorks',
          select: ['_id', 'name', 'image'],
        })
        .populate({
          path: 'officer',
          select: ['_id', 'name'],
        })
        .populate({
          path: 'officerReport',
          select: ['message', 'imageReport'],
        })
        .select('-__v');

      if (!report) {
        return res.status(404).json({
          code: 404,
          message: 'Report not found',
          data: null,
        });
      }

      return res.status(200).json({
        code: 200,
        status: "success",
        data: report,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// finish report by officer
router.post(
  "/officer/done",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reportSchema = {
        id_report: { type: "string", empty: false, max: 255 },
        message: { type: "string", empty: false },
        imageReport: { type: "array", items: "string", empty: false },
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

      const id = body.id_report;
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

// delete report
router.delete(
  "/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const reportId = req.params.id;
      const user = req.user;

      // Cari laporan berdasarkan ID
      const report = await Reports.findById(reportId);

      if (!report) {
        return res.status(404).json({
          code: 404,
          message: 'Report not found',
          data: null,
        });
      }

      // Periksa apakah pengguna adalah admin atau pembuat laporan
      if (user.role !== 'admin' && report.reporter.toString() !== user._id.toString()) {
        return res.status(403).json({
          code: 403,
          message: 'You are not allowed to delete this report',
          data: null,
        });
      }

      // Hapus laporan
      await Reports.findByIdAndDelete(reportId);

      return res.status(200).json({
        code: 200,
        message: 'Report deleted successfully',
        data: null,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get report by officer id
router.get( 
  "/officer/:officer_id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let { limit = 8, skip = 0, q = '', status = '' } = req.query;
      let criteria = {
        officer: req.params.officer_id,
      };

      if (q.length) {
        criteria = {
          ...criteria,
          title: { $regex: `${q}`, $options: 'i' },
        };
      }

      if (status.length) {
        criteria = {
          ...criteria,
          status: status,
        };
      }

      const count = await Reports.find(criteria).countDocuments();
  
      const report = await Reports.find(criteria)
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate({
          path: 'comment',
          select: ['message', 'name'],
        })
        .select(
          '_id title status description imageReport unitWorks createdAt address -comment',
        );

      if (report.length > 0) { // Pastikan ada report yang ditemukan
        res.json({
          status: 'ok',
          count,
          data: report,
        });
      } else {
        res.status(404).json({
          status: 'not found',
          message: 'No reports found',
          data: null,
        });
      }
    } catch (err) {
      console.error(err); // Untuk debugging
      return res.status(500).json({
        error: 1,
        message: err.message,
      });
    }
  })
);


module.exports = router;

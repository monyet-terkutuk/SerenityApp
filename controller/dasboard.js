const express = require("express");
const User = require("../model/user");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const Report = require('../model/reports'); // Mengimpor model Report dengan benar
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const Validator = require("fastest-validator");
const v = new Validator();
const bcrypt = require('bcrypt');
const UnitWork = require("../model/unitWork");
const OfficerReport = require('../model/officerReport');

// Get summary dashboard
router.get(
    "/summary",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const reportCount = await Report.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          },
          {
            $facet: {
              reportCounts: [
                {
                  $group: {
                    _id: null,
                    Menunggu: { $sum: { $cond: [{ $eq: ["$_id", "Menunggu"] }, "$count", 0] } },
                    Diproses: { $sum: { $cond: [{ $eq: ["$_id", "Diproses"] }, "$count", 0] } },
                    Selesai: { $sum: { $cond: [{ $eq: ["$_id", "Selesai"] }, "$count", 0] } },
                    Ditolak: { $sum: { $cond: [{ $eq: ["$_id", "Ditolak"] }, "$count", 0] } }
                  }
                }
              ]
            }
          },
          {
            $project: {
              _id: 0,
              reportCounts: { $arrayElemAt: ["$reportCounts", 0] }
            }
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: [
                  { Menunggu: 0, Diproses: 0, Selesai: 0, Ditolak: 0 },
                  "$reportCounts"
                ]
              }
            }
          },
          {
            $project: {
              _id: 0
            }
          }
        ]);
  
        res.status(200).json({
          code: 200,
          success: true,
          data: reportCount[0], // Karena hasil akhir adalah array dengan satu objek
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );
  

// Get all titles, longitudes, and latitudes of reports with status not equal to "Menunggu"
router.get(
    "/coordinates",
    catchAsyncErrors(async (req, res, next) => {
      try {
        const reports = await Report.find(
          { status: { $ne: 'Menunggu' } }, // Filter untuk status tidak sama dengan "Menunggu"
          { title: 1, address: 1, longitude: 1, latitude: 1, _id: 0 } // Proyeksi untuk mengambil title, longitude, dan latitude
        );
  
        res.status(200).json({
          code: 200,
          success: true,
          data: reports,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );

module.exports = router;

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
const Comment = require("../model/comment");


// Create comment
router.post(
    "",
    isAuthenticated,
    catchAsyncErrors(async (req, res, next) => {
      try {
        const commentSchema = {
          id_report: { type: "string", empty: false, max: 255 },
          message: { type: "string", empty: false },
        };
  
        const { body } = req;
  
        // Validate input data
        const validationResponse = v.validate(body, commentSchema);
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
  
        // Check if user is authenticated
        const user = req.user;
        if (!user) {
          return res.status(401).json({
            code: 401,
            message: "You're not logged in or token expired",
          });
        }
  
        // Create comment and associate with report
        const { id_report, message } = body;
        const comment = new Comment({ name: user.name, message });
  
        const report = await Reports.findById(id_report);
        if (!report) {
          return res.status(404).json({
            code: 404,
            message: "Report not found",
          });
        }
  
        report.comment.push(comment._id);
        await comment.save();
        await report.save();
  
        return res.status(201).json({
          code: 201,
          status: "success",
          message: "Comment added",
          idComment: comment._id,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    })
  );
  

module.exports = router;

const express = require('express');
const router = express.Router();
const Category = require('../model/category'); // pastikan path sesuai dengan struktur proyek Anda
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Validator = require('fastest-validator');
const v = new Validator();

// Create category
router.post(
  '',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const categorySchema = {
        name: { type: 'string', min: 3, empty: false },
        image: { type: 'string', empty: false },
      };

      const { body } = req;

      // Validasi input data
      const validationResponse = v.validate(body, categorySchema);

      if (validationResponse !== true) {
        return res.status(400).json({
          code: 400,
          status: 'error',
          data: {
            error: 'Validation failed',
            details: validationResponse,
          },
        });
      }

      // Buat kategori baru
      const category = await Category.create(body);
      return res.status(201).json({
        code: 201,
        status: 'success',
        data: {
          id: category._id,
          name: category.name,
          image: category.image,
          category_id: category.category_id,
        },
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get categories
router.get(
  '/list',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const categories = await Category.find().sort({
        createdAt: -1,
      });
      return res.status(200).json({
        code: 200,
        status: 'success',
        data: categories,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete category
router.delete(
  '/:id',
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const categoryId = req.params.id;

      // Cari kategori berdasarkan ID
      const category = await Category.findById(categoryId);

      if (!category) {
        return res.status(404).json({
          code: 404,
          status: 'error',
          message: 'Category not found',
        });
      }

      // Hapus kategori
      await Category.findByIdAndDelete(categoryId);

      return res.status(200).json({
        code: 200,
        status: 'success',
        message: 'Category deleted successfully',
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;

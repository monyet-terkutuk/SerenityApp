const mongoose = require('mongoose');
const { model, Schema } = mongoose;
const AutoIncrement = require('mongoose-sequence')(mongoose);

const categorySchema = Schema(
  {
    name: {
      type: String,
      minlength: 3,
      required: [true, 'nama kategori harus ada'],
    },
    image: {
      type: String,
      requirer: [true, 'gambar kategori harus ada'],
    },
    category_id: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.plugin(AutoIncrement, { inc_field: 'category_id' });

module.exports = model('Category', categorySchema);

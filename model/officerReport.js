const mongose = require('mongoose');
const { model, Schema } = mongose;

const officerReportSchema = Schema(
  {
    message: {
      type: String,
      minlength: 3,
    },
    imageReport: [String],
    officer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

officerReportSchema.path('imageReport').validate(
  (value) => {
    if (!value.length) {
      throw 'imageReport is required';
    }
  },
  (attr) => `${attr.value} is required`,
);

module.exports = model('OfficerReport', officerReportSchema);

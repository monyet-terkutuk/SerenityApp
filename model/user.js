const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const { model, Schema } = mongoose;

const HASH_ROUND = 10;

const userSchema = Schema(
  {
    name: {
      type: String,
      required: [true, 'name harus ada'],
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'email harus ada'],
      maxlength: 50,
    },
    password: {
      type: String,
      required: [true, 'password harus diisi'],
      maxlength: [255, 'Panjang password maksimal 255 karakter'],
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'officer', 'superadmin'],
      default: 'user',
    },
    image: {
      type: String,
    },
    unitWork:{
      type: Schema.Types.ObjectId,
      ref:'unitWork'
    },
    token: [String],
  },
  { timestamps: true },
);


// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id}, process.env.JWT_SECRET_KEY,{
    expiresIn: process.env.JWT_EXPIRES,
  });
};


userSchema.pre('save', function (next) {
  this.password = bcrypt.hashSync(this.password, HASH_ROUND);
  next();
});

userSchema.plugin(AutoIncrement, { inc_field: 'user_id' });

module.exports = model('User', userSchema);

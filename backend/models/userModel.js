const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/email');
const AppError = require('../utils/appError');

function generateVerificationNumber() {
  return Math.floor(Math.random() * 900000 + 100000); // Generates a random number between 100000 and 999999
}


const userSchema = new mongoose.Schema({
    name: {
      type: String,
      required: [true, 'Please tell us your name!']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: String,
    role: {
      type: String,
      enum: ['user', 'doctor', 'patient', 'admin'],
      default: 'user'
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function(el) {
          return el === this.password;
        },
        message: 'Passwords are not the same!'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    verificationNumber : String,
    verificationNumberExpires : Date,
    lastVerified : Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    }
  });

  userSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isNew) return next();
    
    // Generate verification number and hash it with cost of 12
    const number = generateVerificationNumber() + '';
    const message = `Verify your email? Submit a POST request with the 6 digit number: ${number}.\nIf you didn't signup for health-care, please ignore this email!`;

    try {
      await sendEmail({
        email: this.email,
        subject: 'Verify your email',
        message
      });
      
      // res.status(200).json({
      //   status: 'success',
      //   message: 'Verification code sent to email!'
      // });
    } catch (err) {
      console.log(err)
      return next(
        new AppError('There was an error sending the email. Try again later!'),
        500
      );
    }
    
   
    this.verificationNumber = crypto.createHash('sha256').update(number).digest('hex');
    this.verificationNumberExpires = Date.now() + 1000 * 3600; 
    next();
  });


  userSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();
  
    // Hash the password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
  
    // Delete passwordConfirm field
    this.passwordConfirm = undefined;
    next();
  });

  userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
  
    this.passwordChangedAt = Date.now() - 1000;
    next();
  });

  userSchema.pre(/^find/, function(next) {
    // this points to the current query
    this.find({ active: { $ne: false } });
    next();
  });
  
  userSchema.methods.correctPassword = async function(
    candidatePassword,
    userPassword
  ) {
    return await bcrypt.compare(candidatePassword, userPassword);
  };

  userSchema.methods.verifyEmail = function(
    candidateVerfNum,
    userVerfNum
  ) {
    return crypto.createHash('sha256').update(candidateVerfNum).digest('hex') === userVerfNum
  };
  
  userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );
  
      return JWTTimestamp < changedTimestamp;
    }
  
    // False means NOT changed
    return false;
  };
  
  userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
  
    this.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
  
    console.log({ resetToken }, this.passwordResetToken);
  
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
  };
  
  const User = mongoose.model('User', userSchema);
  
  module.exports = User;
  
  

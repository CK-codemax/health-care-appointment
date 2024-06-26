const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('../utils/email');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};


const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
  };

  const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  
    res.cookie('jwt', token, cookieOptions);
  
    // Remove password from output
    user.password = undefined;
  
    res.status(statusCode).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  };
  


exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm
    });

    
    createSendToken(newUser, 201, res);
  });

  exports.verifyEmail = catchAsync(async (req, res, next) => {
    const { verificationNumber } = req.body;
    const { user } = req;
    console.log(user.verificationNumber, user)

    
    if (!verificationNumber) {
      return next(new AppError('Please provide the verification number sent to your email!', 400));
    }

     // 1) Get user based on the token
     const hashedToken = crypto
     .createHash('sha256')
     .update(verificationNumber.trim())
     .digest('hex');
     console.log(hashedToken)

 
   // 2) If token has not expired, and there is user, set the new password
   if (user.verificationNumber !== hashedToken || user.verificationNumberExpires < Date.now()) {
     return next(new AppError('Verification code is invalid or has expired', 400));
   }

   user.verificationNumber = undefined;
   user.verificationNumberExpires = undefined;
   user.lastVerified = Date.now();
   user.verifyNext = Date.now() + 60 * 24 * 60 * 60 * 1000;
   if(user.newEmail){
    user.email = user.newEmail;
    user.newEmail = undefined;
    user.emailChangedAt = Date.now() - 1000;
   }
    await user.save({ validateBeforeSave: false });

   res.status(200).json({
    status : "success",
    message : "Email verification successful",
   })
  });




  exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
  
    // 1) Check if email and password exist
    if (!email || !password) {
      return next(new AppError('Please provide email and password!', 400));
    }
    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select(['+password', '-__v']);
  
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    if(Date.now() > user.verifyNext || !user.verifyNext){
      await user.sendVerificationMessage(user);
      await user.save({ validateBeforeSave: false });
    }
  
    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
  });


  exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check of it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    console.log(token);
  
    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }
  
    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }
  
    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat) || currentUser.changedEmailAfter(decoded.iat)) {
      return next(
        new AppError('User recently changed password or email! Please log in again.', 401)
      );
    }

    // if (currentUser.changedEmailAfter(decoded.iat)) {
    //   return next(
    //     new AppError('User recently changed email! Please log in again.', 401)
    //   );
    // }
  
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    next();
  });


  exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        //console.log(req);
      // roles ['admin', 'lead-guide']. role='user'
      if (!roles.includes(req.user.role)) {
        return next(
          new AppError('You do not have permission to perform this action', 403)
        );
      }
  
      next();
    };
  };

  exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('There is no user with email address.', 404));
    }
  
    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    //console.log(resetToken);
    await user.save({ validateBeforeSave: false });
  
    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    //console.log(resetURL);
  
    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;
  
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid for 10 min)',
        message
      });
  
      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
  
      return next(
        new AppError('There was an error sending the email. Try again later!'),
        500
      );
    }
  });
  
  exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
  
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
  
    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  
    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
  });
  
  exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');
  
    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }
  
    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!
  
    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
  });

  exports.changeEmail = catchAsync(async (req, res, next) => {
    if (!req.body.email) {
      return next(
        new AppError(
          'Please enter the email you want to change to.',
          400
        )
      );
    }

    if (req.body.email === req.user.email) {
      return next(
        new AppError(
          'Please enter the new email you want to change to.',
          400
        )
      );
    }
   
    const updatedUser = await User.findByIdAndUpdate(req.user.id,  { $set: { newEmail: req.body.email } }, {
      new: true,
      runValidators: true
    });

    await updatedUser.sendVerificationMessage(updatedUser, 'change');
    await updatedUser.save({ validateBeforeSave: false });
    res.status(200)
    .json({
      status : "success",
      message : "Verification number has been sent to your email, please verify your email",
      updatedUser,
    })

  });
  
  
  
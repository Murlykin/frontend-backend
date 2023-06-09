const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");
const {User} = require("../models/user");

const { HttpError, sendEmail  } = require("../helpers");

const { ctrlWrapper } = require("../utils");

const {SECRET_KEY, BASE_URL} = process.env;

const register = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
        throw HttpError(409, "Email already exist");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const verificationToken = nanoid();
    const newUser = await User.create({ ...req.body, password: hashPassword, verificationToken, });

    const { _id: id } = newUser;

    const payload = {
        id,
    }

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
    const verifyEmail = {
        to: email,
        subject: 'verify email',
        html: `<p>Please confirm your account <a target="_blank" href="${BASE_URL}/api/auth/verify/${verificationToken}">Click</a></p>`,
    };

    await sendEmail(verifyEmail);
    res.status(201).json({
        token,
        user: {
            name: newUser.name,
            email: newUser.email,
        }
    })
};


const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;

  const user = await User.findOne({ verificationToken });
  if (!user) {
    throw HttpError(404, "User not found ");
  }

  if (user.verify) {
    throw HttpError(400, "Verification has already been passed ");
  }

  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: "",
  });

  res.json({
    message: "Verification successful",
  });
};

const resendEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw HttpError(400, "Missing required field email");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw HttpError(404, "User not found");
  }

  if (user.verify) {
    throw HttpError(400, "Verification has already been passed");
  }

  const verifyEmail = {
    to: user.email,
    subject: "Please Verify Your Email Identity",
    html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${user.verificationToken}">Verify email identity</a>`,
  };

  await sendEmail(verifyEmail);

  res.status(201).json({
    message: "Verification email sent",
  });
};
const login = async(req, res)=> {
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if(!user) {
        throw HttpError(401);
    }
   if (!user.verify) {
    throw HttpError(401, 'email not verified');
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if(!passwordCompare) {
        throw HttpError(401);
    }

    const {_id: id} = user;

    const payload = {
        id,
    }

    const token = jwt.sign(payload, SECRET_KEY, {expiresIn: "23h"});
    await User.findByIdAndUpdate(id, {token});

    res.json({
        token,
        user: {
            name: user.name,
            email: user.email,
        }
    })
}

const getCurrent = async(req, res)=> {
    const {token, email, name} = req.user;

    res.json({
        token,
        user: {
            email,
            name,
        }
    })
}

const logout = async(req, res)=> {
    const {_id} = req.user;

    await User.findByIdAndUpdate(_id, {token: ""});

    res.json({
        message: "Logout success"
    })
}

module.exports = {
    register: ctrlWrapper(register),
    login: ctrlWrapper(login),
    getCurrent: ctrlWrapper(getCurrent),
    logout: ctrlWrapper(logout),
    verifyEmail: ctrlWrapper(verifyEmail),
    resendEmail: ctrlWrapper(resendEmail),
}
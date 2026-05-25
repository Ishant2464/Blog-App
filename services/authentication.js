require("dotenv").config();
const JWT = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;

function createTokenForUser(user) {
  const payload = {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    profileImageURL: user.profileImageURL,
    role: user.role,
  };

  return JWT.sign(payload, secret, { expiresIn: "7d" });
}

function validateToken(token) {
  return JWT.verify(token, secret);
}

module.exports = {
  createTokenForUser,
  validateToken,
};

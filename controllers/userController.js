const { BAD_REQUEST, CustomAPIError } = require("../errors/index");
const User = require("../models/userModel");
const Course = require("../models/courseModel");
const factoryController = require("./factoryController");
const filterAPI = require("../utils/filterAPI");
const { pushNotification } = require("./notificationController");

exports.getAllUser = async (req, res) => {
  const { search, areaOfSpecialization } = req.query;
  const flt = {};
  if (search) {
    const exp = new RegExp(`${search}`, "i");
    flt["$or"] = [{ name: { $regex: exp } }, { email: { $regex: exp } }];
  }
  const query = User.find(flt);
  const filteredQuery = new filterAPI(query, req.query)
    .sort()
    .select()
    .paging();

  const data = await filteredQuery.query;
  res.status(200).send({
    status: "success",
    length: data.length,
    data,
  });
};

exports.getUser = factoryController.getOne(User);

exports.postUser = factoryController.postOne(User);

exports.patchUser = async (req, res, next) => {
  const fieldsToExclude = [
    "password",
    "role",
    "courses",
    ,
    "passwordChangedAt",
    "passwordResetToken",
    "passwordResetTokenExpire",
    "active",
  ];
  if (Object.keys(req.body).some((val) => fieldsToExclude.includes(val))) {
    return next(
      new BAD_REQUEST(
        "Cannot update some property of user like 'password' or 'userId' through this route"
      )
    );
  }

  if (req.user.email !== req.body.email) {
    return next(new BAD_REQUEST("You're not allowed to performe this action"));
  }

  const user = {
    name: req.body.name,
    // email: undefined,
    gender: req.body.gender,
    dob: req.body.dob,
    profileImgUrl: req.body.profileImgUrl,
    areaOfSpecialization: req.body.areaOfSpecialization,
  };
  //FIXME:
  const resp = await User.findOneAndUpdate({ email: req.body.email }, user, {
    new: true,
  });

  res.status(200).send({
    user: resp,
  });
};

exports.deleteUser = async (req, res, next) => {
  const id = req.params.id;
  const isUserExists = (await User.findById(id).select("userId"))
    ? true
    : false;
  if (!isUserExists) {
    return next(new BAD_REQUEST("There is no such user with given Id"));
  }

  const data = await User.findByIdAndUpdate(id, {
    active: false,
  });
};

exports.getCourseUser = async (req, res, next) => {
  const commonId = req.params.commonId;
  // console.log("commonId", commonId, new mongoose.SchemaTypes.ObjectId(commonId))
  const users = await User.find({
    "courses.id": { $in: [commonId] },
  });

  res.status(200).send({
    status: "success",
    data: users,
  });
};

exports.addCourseUser = async (req, res, next) => {
  const commonId = req.params.commonId;
  const id = req.body._id;
  const access = req.body.access;

  if (!id) return next(new BAD_REQUEST("Please provide the userId"));
  if (!["head", "edit", "view"].includes(access)) {
    return next(
      new BAD_REQUEST(
        "request body must have access with value 'head', 'editor', 'view'"
      )
    );
  }

  const course = await Course.findOne({ common_id: commonId });
  if (!course) {
    throw new Error("Course is invalid.");
  }

  const exists = await User.findOne({
    _id: id,
    "courses.id": commonId,
  });

  let result;
  if (exists) {
    result = await User.updateOne(
      { _id: id, "courses.id": commonId },
      { $set: { "courses.$.access": access } },
      { new: true }
    );
  } else {
    result = await User.findByIdAndUpdate(
      id,
      {
        $push: {
          courses: {
            id: commonId,
            access: access,
          },
        },
      },
      {
        new: true,
      }
    );
  }

  pushNotification({
    heading: `You have been added to the course ${course.title.cur}`,
    message: `You are assing the ${access} access in the course by ${req.user._doc.name}.`,
    isCourse: false,
    target: id,
    link: `${process.env.CLIENT_URL}/curriculum/${course.common_id}`,
  });

  res.status(200).send({
    status: "success",
    data: result,
  });
};

exports.deleteCourseUser = async (req, res, next) => {
  const commonId = req.params.commonId;
  const id = req.body._id;

  if (req.user?._id?.toString() === id?.toString()) {
    return next(new CustomAPIError("You cannot delete yourself.", 405));
  }

  const course = await Course.findOne({
    common_id: commonId,
  });
  if (!course) {
    throw new Error("Course does not exists.");
  }

  const result = await User.findOneAndUpdate(
    { _id: id },
    { $pull: { courses: { id: commonId } } },
    { new: true, runValidators: true }
  );

  pushNotification({
    heading: `You have been removed from the course  ${course.title.cur}.`,
    message: `You no longer have any access to the course ${course.title.cur}.`,
    target: id,
    isCourse: false,
  });

  res.status(200).send({
    status: "success",
    data: {},
  });
};

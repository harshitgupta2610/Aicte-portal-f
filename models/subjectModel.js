const mongoose = require('mongoose')
const {editableArrayWrapper, editableTypeWrapper} = require("./types")

const subjectSchema = new mongoose.Schema({
    common_id: {
        type: mongoose.SchemaTypes.ObjectId, 
        require: [true, "subject's common_id is missing"]
    }, 
    version: {
        type: Number, 
        default: 1
    }, 
    title: editableTypeWrapper({
        type: String, 
        require: [true, "Subject's Title is Missing"]
    }), 
    courseId: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: "Course",
        require: [true, "Course-id of subject (to which it belongs) is missing."],
    }, 
    objectives: editableArrayWrapper([editableTypeWrapper(String)]), 
    prerequisites: editableArrayWrapper([editableTypeWrapper(String)]), 
    modules: editableArrayWrapper([editableTypeWrapper({
        title: {
            type: String, 
            require: [true, "Subject's Title is Missing"]
        }, 
        topics: [String], 
    })]), 
    experiments: editableArrayWrapper([editableTypeWrapper({
        name: {
            type: String, require: true
        }, 
        url: String
    })]), 
    referenceMaterial: editableArrayWrapper([editableTypeWrapper(mongoose.SchemaTypes.ObjectId)]), 
    // referenceMaterial: {
    //     add: [{
    //         by: {
    //             type: mongoose.Types.ObjectId, 
    //             ref: 'User'
    //         }, 
    //         // index: Number, 
    //         value: {
    //             type: mongoose.Types.ObjectId, 
    //             ref: 'User', 
    //             _id: false
    //         }, 
    //         _id: false
    //     }], 
    //     del: [{
    //         by: {
    //             type: mongoose.Types.ObjectId, 
    //             ref: 'User'
    //         }, 
    //         index: Number, 
    //         _id: false
    //     }], 
    //     cur: [{
    //         type: mongoose.Types.ObjectId, 
    //         ref: 'User', 
    //     }]
    // }, 
    outcomes: editableArrayWrapper([editableTypeWrapper(String)]), 
    // alternativeCourses: []
})


//Indexes of database
subjectSchema.index(["common_id", "version"], {
    unique: true
})


const Subject = new mongoose.model("Subject", subjectSchema)

module.exports = Subject
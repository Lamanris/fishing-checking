import mongoose from "mongoose";

const siteSchema = new mongoose.Schema({
    value: {type: String, required: true, unique: true}
}, {timestamps: true})

const Sites = mongoose.model('sites', siteSchema)
export default Sites
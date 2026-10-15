const mongoose = require("mongoose");

const weighmentItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      default: "",
      trim: true,
    },

    grossWeight: {
    type: Number,
    default: null,
    min: 0,
    },
    tareWeight: {
    type: Number,
    default: null,
    min: 0,
    },
    netWeight: {
    type: Number,
    default: null,
    },


    transferTareToNext: {
    type: Boolean,
    default: false,
    },
  },
  { _id: true }
);

const weighmentSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    weighmentNo: {
      type: String,
      unique: true,
      sparse: true,
    },
    partyName: {
      type: String,
      trim: true,
      default: "",
    },
    vehicleNo: {
      type: String,
      trim: true,
      default: "",
    },
    partyGrossWeight: {
      type: Number,
      default: 0,
    },
    partyTareWeight: {
      type: Number,
      default: 0,
    },
    partyNetWeight: {
      type: Number,
      default: 0,
    },
    firstWeight: {
      type: Number,
      default: 0,
    },
    secondWeight: {
      type: Number,
      default: 0,
    },
    netWeight: {
      type: Number,
      default: 0,
    },
    itemName: {
      type: String,
      enum: ["", "Scrap", "Ramming Mass", "Sponge Iron", "Others"],
      default: "",
    },
    status: {
      type: String,
      enum: ["Open", "Draft", "Closed"],
      default: "Open",
    },
    items: {
      type: [weighmentItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Weighment ||
  mongoose.model("Weighment", weighmentSchema);